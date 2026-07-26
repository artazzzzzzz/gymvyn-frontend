import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gymvyn.app',
  appName: 'Gymvyn',
  webDir: 'dist',
  plugins: {
    // Empty = no native iOS banner/sound/badge while the app is foregrounded
    // — NativePushBridge's pushNotificationReceived listener handles that
    // case in-app instead. Background/closed still gets the OS default
    // system notification regardless of this setting.
    PushNotifications: {
      presentationOptions: [],
    },
  },
};

export default config;
