import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import mobileAds, {
  AdEventType,
  BannerAd,
  BannerAdSize,
  InterstitialAd,
  NativeAd,
  NativeAdView,
  NativeAsset,
  NativeAssetType,
  NativeMediaView,
} from 'react-native-google-mobile-ads';
import { Image } from 'expo-image';
import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';
import { FULLSCREEN_GAP_MS, PROD_AD_UNITS } from './config';
import { useI18n } from './i18n';
import { useApp } from './store';
import { font, useTheme } from './theme';

const prod = Platform.OS === 'ios' ? PROD_AD_UNITS.ios : PROD_AD_UNITS.android;
const useTest = __DEV__ || !prod.banner;
const AD_UNITS = {
  banner: useTest ? TestIds.ADAPTIVE_BANNER : prod.banner,
  native: useTest ? TestIds.NATIVE : prod.native,
  interstitial: useTest ? TestIds.INTERSTITIAL : prod.interstitial,
};

let started = false;
export function startAds() {
  if (started) return;
  started = true;
  mobileAds().initialize().then(() => loadInterstitial()).catch(() => {});
}

// ---------------------------------------------------------------- full-screen
// One full-screen ad at most every FULLSCREEN_GAP_MS across the whole app (job open, advert,
// result, quiz...), none in the first minute and a half, so a user never sees two back to back.
// The interstitial unit is display-only in AdMob (no 30-60 s videos).

const LAUNCH_GRACE_MS = 90 * 1000;
const launchedAt = Date.now();
let interstitial: InterstitialAd | null = null;
let interstitialReady = false;
let afterAd: (() => void) | null = null;

function loadInterstitial() {
  interstitial = InterstitialAd.createForAdRequest(AD_UNITS.interstitial);
  interstitialReady = false;
  interstitial.addAdEventListener(AdEventType.LOADED, () => { interstitialReady = true; });
  interstitial.addAdEventListener(AdEventType.CLOSED, () => {
    // whatever the user tapped opens once the ad is closed
    afterAd?.();
    afterAd = null;
    loadInterstitial();
  });
  interstitial.addAdEventListener(AdEventType.ERROR, () => {
    interstitialReady = false;
    // an ad that fails mid-show must not swallow the advert/result the user tapped
    afterAd?.();
    afterAd = null;
    setTimeout(loadInterstitial, 60_000);
  });
  interstitial.load();
}

function canShowFullScreen(): boolean {
  const now = Date.now();
  return !!interstitial && interstitialReady && now - launchedAt > LAUNCH_GRACE_MS
    && now - useApp.getState().lastInterstitial > FULLSCREEN_GAP_MS;
}

function showFullScreen(then?: () => void): boolean {
  if (!canShowFullScreen()) return false;
  useApp.getState().set({ lastInterstitial: Date.now() });
  interstitialReady = false;
  afterAd = then ?? null;
  interstitial!.show().catch(() => {
    afterAd = null;
    then?.();
    loadInterstitial();
  });
  return true;
}

/** Called when a job detail / quiz result / CV opens; skipped while the shared cooldown runs. */
export function maybeShowInterstitial() {
  showFullScreen();
}

/** Opens an advert/result after an ad when one is due; otherwise opens it straight away. */
export function withAd(then: () => void) {
  if (!showFullScreen(then)) then();
}

// ---------------------------------------------------------------- banner

export function BottomBanner() {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <View style={{ alignItems: 'center' }}>
      <BannerAd
        unitId={AD_UNITS.banner}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        onAdFailedToLoad={() => setFailed(true)}
      />
    </View>
  );
}

// ---------------------------------------------------------------- native (in-feed)

export function NativeAdCard() {
  const c = useTheme();
  const { t } = useI18n();
  const [ad, setAd] = useState<NativeAd | null>(null);

  useEffect(() => {
    let alive = true;
    let loaded: NativeAd | null = null;
    NativeAd.createForAdRequest(AD_UNITS.native)
      .then((a) => {
        loaded = a;
        if (alive) setAd(a);
        else a.destroy();
      })
      .catch(() => {});
    return () => {
      alive = false;
      loaded?.destroy();
    };
  }, []);

  if (!ad) return null;
  return (
    <NativeAdView nativeAd={ad} style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={styles.row}>
        {ad.icon && (
          <NativeAsset assetType={NativeAssetType.ICON}>
            <Image source={{ uri: ad.icon.url }} style={styles.icon} />
          </NativeAsset>
        )}
        <View style={{ flex: 1 }}>
          <View style={styles.row}>
            <Text style={[styles.badge, { backgroundColor: c.gold }]}>{t('sponsored')}</Text>
            {ad.advertiser && (
              <NativeAsset assetType={NativeAssetType.ADVERTISER}>
                <Text style={[styles.adv, { color: c.faint }]} numberOfLines={1}>{ad.advertiser}</Text>
              </NativeAsset>
            )}
          </View>
          <NativeAsset assetType={NativeAssetType.HEADLINE}>
            <Text style={[styles.head, { color: c.text }]} numberOfLines={2}>{ad.headline}</Text>
          </NativeAsset>
        </View>
      </View>
      {ad.body && (
        <NativeAsset assetType={NativeAssetType.BODY}>
          <Text style={[styles.body, { color: c.sub }]} numberOfLines={2}>{ad.body}</Text>
        </NativeAsset>
      )}
      <NativeMediaView style={styles.media} resizeMode="cover" />
      {ad.callToAction && (
        <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
          <Text style={[styles.cta, { backgroundColor: c.primary }]}>{ad.callToAction}</Text>
        </NativeAsset>
      )}
    </NativeAdView>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginBottom: 12, borderRadius: 18, padding: 14, borderWidth: 1, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 42, height: 42, borderRadius: 10 },
  badge: { fontFamily: font.semi, fontSize: 10, color: '#1A1300', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, overflow: 'hidden' },
  adv: { fontFamily: font.regular, fontSize: 11, flex: 1 },
  head: { fontFamily: font.semi, fontSize: 14.5, marginTop: 2 },
  body: { fontFamily: font.regular, fontSize: 12.5 },
  media: { width: '100%', aspectRatio: 1.91, borderRadius: 12, overflow: 'hidden' },
  cta: { fontFamily: font.semi, color: '#fff', textAlign: 'center', paddingVertical: 10, borderRadius: 12, overflow: 'hidden' },
});
