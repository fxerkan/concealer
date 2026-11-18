package org.concealer.mobile;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

/** The app's own UI opened by the autofill service: unlock, then pick (fill) or confirm (save) a sign-in. */
public class AutofillActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BiometricPlugin.class);
        registerPlugin(AutofillPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
