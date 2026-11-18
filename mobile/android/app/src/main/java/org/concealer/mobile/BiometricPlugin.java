package org.concealer.mobile;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyPermanentlyInvalidatedException;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.nio.charset.StandardCharsets;
import java.security.KeyStore;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/**
 * Fingerprint / face unlock. The master password is encrypted with an AES-GCM key in the Android
 * Keystore that needs a strong biometric match for every use and is destroyed when a new
 * biometric is enrolled; only the ciphertext + IV go to private SharedPreferences.
 */
@CapacitorPlugin(name = "ConcealerBiometric")
public class BiometricPlugin extends Plugin {
    private static final String ALIAS = "concealer-unlock";
    private static final int STRONG = BiometricManager.Authenticators.BIOMETRIC_STRONG;

    private interface Done { void run(Cipher c) throws Exception; }

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences("concealer_unlock", Context.MODE_PRIVATE);
    }

    private boolean supported() {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.N
            && BiometricManager.from(getContext()).canAuthenticate(STRONG) == BiometricManager.BIOMETRIC_SUCCESS;
    }

    @PluginMethod
    public void available(PluginCall call) {
        JSObject r = new JSObject();
        r.put("available", supported());
        r.put("kind", "fingerprint");
        call.resolve(r);
    }

    @PluginMethod
    public void store(PluginCall call) {
        String secret = call.getString("secret");
        if (secret == null || !supported()) { call.reject("unavailable", "failed"); return; }
        try {
            Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
            c.init(Cipher.ENCRYPT_MODE, newKey());
            prompt(call, c, call.getString("reason", "Turn on fingerprint unlock"), cipher -> {
                byte[] ct = cipher.doFinal(secret.getBytes(StandardCharsets.UTF_8));
                prefs().edit()
                    .putString("ct", Base64.encodeToString(ct, Base64.NO_WRAP))
                    .putString("iv", Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP))
                    .apply();
                call.resolve();
            });
        } catch (Exception e) { call.reject(String.valueOf(e.getMessage()), "failed"); }
    }

    @PluginMethod
    public void load(PluginCall call) {
        String ct = prefs().getString("ct", null), iv = prefs().getString("iv", null);
        if (ct == null || iv == null) { call.reject("not set", "gone"); return; }
        try {
            KeyStore ks = KeyStore.getInstance("AndroidKeyStore"); ks.load(null);
            SecretKey key = (SecretKey) ks.getKey(ALIAS, null);
            if (key == null) { wipe(); call.reject("not set", "gone"); return; }
            Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
            c.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(128, Base64.decode(iv, Base64.NO_WRAP)));
            prompt(call, c, call.getString("reason", "Unlock concealer"), cipher ->
                call.resolve(new JSObject().put("secret",
                    new String(cipher.doFinal(Base64.decode(ct, Base64.NO_WRAP)), StandardCharsets.UTF_8))));
        } catch (KeyPermanentlyInvalidatedException e) {   // a new fingerprint/face was enrolled
            wipe(); call.reject("biometrics changed", "gone");
        } catch (Exception e) { call.reject(String.valueOf(e.getMessage()), "failed"); }
    }

    @PluginMethod
    public void clear(PluginCall call) { wipe(); call.resolve(); }

    private void wipe() {
        prefs().edit().clear().apply();
        try { KeyStore ks = KeyStore.getInstance("AndroidKeyStore"); ks.load(null); ks.deleteEntry(ALIAS); } catch (Exception ignored) {}
    }

    private SecretKey newKey() throws Exception {
        wipe();
        KeyGenParameterSpec.Builder b = new KeyGenParameterSpec.Builder(ALIAS,
                KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setUserAuthenticationRequired(true)
            .setInvalidatedByBiometricEnrollment(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) b.setUserAuthenticationParameters(0, KeyProperties.AUTH_BIOMETRIC_STRONG);
        KeyGenerator g = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        g.init(b.build());
        return g.generateKey();
    }

    private void prompt(PluginCall call, Cipher c, String title, Done done) {
        getActivity().runOnUiThread(() -> new BiometricPrompt(getActivity(), ContextCompat.getMainExecutor(getContext()),
            new BiometricPrompt.AuthenticationCallback() {
                @Override public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult r) {
                    try { done.run(r.getCryptoObject().getCipher()); }
                    catch (Exception e) { call.reject(String.valueOf(e.getMessage()), "failed"); }
                }
                @Override public void onAuthenticationError(int code, CharSequence msg) {
                    boolean cancel = code == BiometricPrompt.ERROR_USER_CANCELED
                        || code == BiometricPrompt.ERROR_NEGATIVE_BUTTON || code == BiometricPrompt.ERROR_CANCELED;
                    call.reject(msg.toString(), cancel ? "canceled" : "failed");
                }
            }).authenticate(new BiometricPrompt.PromptInfo.Builder()
                .setTitle(title)
                .setNegativeButtonText("Use master password")
                .setAllowedAuthenticators(STRONG)
                .build(), new BiometricPrompt.CryptoObject(c)));
    }
}
