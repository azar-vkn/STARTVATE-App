import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.startvate.app',
  appName: 'STARTVATE',
  webDir: 'dist',
  backgroundColor: '#0a0a0f',
  android: {
    backgroundColor: '#0a0a0f',
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#0a0a0f',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
    },
    Keyboard: {
      resize: 'native',
    },
  },
};

export default config;
