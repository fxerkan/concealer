package org.concealer.mobile;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DiscoveryPlugin.class);   // native NsdManager mDNS discovery
        registerPlugin(BiometricPlugin.class);   // fingerprint / face unlock (Keystore-bound)
        super.onCreate(savedInstanceState);
    }
}
