package org.concealer.mobile;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.service.autofill.Dataset;
import android.view.autofill.AutofillId;
import android.view.autofill.AutofillManager;
import android.view.autofill.AutofillValue;

import androidx.annotation.ChecksSdkIntAtLeast;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** JS side of the autofill service: status/enable from Settings, and fill/save hand-off in AutofillActivity. */
@CapacitorPlugin(name = "ConcealerAutofill")
public class AutofillPlugin extends Plugin {
    @ChecksSdkIntAtLeast(api = Build.VERSION_CODES.O)
    private static boolean supported() { return Build.VERSION.SDK_INT >= Build.VERSION_CODES.O; }

    @PluginMethod
    public void status(PluginCall call) {
        JSObject r = new JSObject();
        r.put("supported", supported());
        if (supported()) {
            AutofillManager m = getContext().getSystemService(AutofillManager.class);
            r.put("enabled", m != null && m.hasEnabledAutofillServices());
        } else r.put("enabled", false);
        call.resolve(r);
    }

    @PluginMethod
    public void enable(PluginCall call) {
        if (!supported()) { call.reject("Autofill needs Android 8 or newer", "unsupported"); return; }
        Intent i = new Intent(Settings.ACTION_REQUEST_SET_AUTOFILL_SERVICE, Uri.parse("package:" + getContext().getPackageName()));
        try { getActivity().startActivity(i); }
        catch (Exception e) { getActivity().startActivity(new Intent(Settings.ACTION_SETTINGS)); }
        call.resolve();
    }

    @PluginMethod
    public void context(PluginCall call) {
        JSObject r = new JSObject();
        Activity a = getActivity();
        String mode = a instanceof AutofillActivity ? a.getIntent().getStringExtra("mode") : null;
        r.put("mode", mode == null ? "" : mode);
        if ("fill".equals(mode)) {
            r.put("domain", nz(a.getIntent().getStringExtra("domain")));
            r.put("pkg", nz(a.getIntent().getStringExtra("pkg")));
        } else if ("save".equals(mode)) {
            String[] s = supported() ? ConcealerAutofillService.takeSave() : null;
            if (s == null) { r.put("mode", ""); a.finish(); }
            else { r.put("domain", s[0]); r.put("pkg", s[1]); r.put("username", s[2]); r.put("password", s[3]); }
        }
        call.resolve(r);
    }

    @PluginMethod
    public void fill(PluginCall call) {
        Activity a = getActivity();
        if (!supported() || !(a instanceof AutofillActivity)) { call.reject("not in autofill", "failed"); return; }
        Intent in = a.getIntent();
        AutofillId u = in.getParcelableExtra("user"), p = in.getParcelableExtra("pass");
        String un = call.getString("username", ""), pw = call.getString("password", "");
        Dataset.Builder b = new Dataset.Builder(ConcealerAutofillService.item(getContext(), "concealer"));
        boolean any = false;
        if (u != null && !un.isEmpty()) { b.setValue(u, AutofillValue.forText(un)); any = true; }
        if (p != null && !pw.isEmpty()) { b.setValue(p, AutofillValue.forText(pw)); any = true; }
        if (!any) { call.reject("nothing to fill", "failed"); return; }
        a.setResult(Activity.RESULT_OK, new Intent().putExtra(AutofillManager.EXTRA_AUTHENTICATION_RESULT, b.build()));
        call.resolve();
        a.finish();
    }

    @PluginMethod
    public void done(PluginCall call) { call.resolve(); getActivity().finish(); }

    private static String nz(String s) { return s == null ? "" : s; }
}
