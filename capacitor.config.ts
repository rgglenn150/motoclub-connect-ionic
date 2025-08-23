import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.motoclub.connect',
  appName: 'MotoClub Connect',
  webDir: 'www',
  plugins: {
    FacebookLogin: {
      appId: '1515940283108537', // Replace with actual Facebook App ID
      appName: 'MotoClub Connect'
    }
  }
};

export default config;
