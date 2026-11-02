/* Config plugin: turns off the "AdMob native ad validator" popups that the
   Google Mobile Ads SDK draws over native ads while test ads are in use. */
const { AndroidConfig, withAndroidManifest } = require('expo/config-plugins');

module.exports = function withNoNativeAdValidator(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      app, 'com.google.android.gms.ads.flag.NATIVE_AD_DEBUGGER_ENABLED', 'false');
    return cfg;
  });
};
