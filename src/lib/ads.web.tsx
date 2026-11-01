// Web preview: AdMob is native-only, so ads render as nothing.
export function startAds() {}
export function maybeShowInterstitial() {}
export function showRewarded(then: () => void) {
  then();
}
export function BottomBanner() {
  return null;
}
export function NativeAdCard() {
  return null;
}
