package org.concealer.mobile;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DiscoveryPlugin.class);   // native NsdManager mDNS discovery
        super.onCreate(savedInstanceState);
    }
}
