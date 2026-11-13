// Web preview: AdMob is native-only, so ads render as nothing.
export function startAds() {}
export function maybeShowInterstitial(then?: () => void) { then?.(); }
export function withAd(then: () => void) {
  then();
}
export function BottomBanner() {
  return null;
}
export function NativeAdCard() {
  return null;
}
export function adOnOpen(_kind: string, then?: () => void) {
  then?.();
}
