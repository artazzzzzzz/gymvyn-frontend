package com.gymvyn.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        ensureFirebaseAppInitialized();
        super.onCreate(savedInstanceState);
    }

    // capacitor-push-notifications' register() calls FirebaseMessaging.getInstance()
    // synchronously, which throws IllegalStateException if no default FirebaseApp
    // exists. Capacitor's own Bridge.callPluginMethod deliberately rethrows any
    // exception a @PluginMethod doesn't catch as a RuntimeException on its task
    // thread — Android has no default handler for that, so the process dies. A
    // JS-side try/catch around PushNotifications.register() can never intercept
    // this: the crash happens inside native code before any JS promise settles.
    //
    // google-services.json missing/misconfigured is the normal way to end up
    // here, and that can happen again (wrong build variant, a teammate's machine
    // without the file, CI). Guaranteeing a default FirebaseApp always exists —
    // real config when present, an inert placeholder otherwise — makes
    // FirebaseMessaging.getInstance() always succeed; a placeholder just fails
    // the token fetch asynchronously, which the plugin already reports via the
    // registrationError event instead of crashing.
    private void ensureFirebaseAppInitialized() {
        if (!FirebaseApp.getApps(this).isEmpty()) {
            return;
        }
        FirebaseOptions options = FirebaseOptions.fromResource(this);
        if (options == null) {
            options = new FirebaseOptions.Builder()
                .setApplicationId("1:0:android:0000000000000000")
                .setApiKey("unconfigured")
                .setProjectId("unconfigured")
                .build();
        }
        FirebaseApp.initializeApp(this, options);
    }
}
