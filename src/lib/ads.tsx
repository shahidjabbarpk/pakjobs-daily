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
// Ads follow what the user does, not a clock:
//  - jobs, results/roll-no slips and past papers: an ad on the 1st open, the 2nd is free, ad on the 3rd...
//    (each kind counts separately; Apply / advert inside an opened job never shows another one)
//  - MCQ practice and mock tests: one ad before the session starts and one after the result.
// Two safety nets keep it from feeling spammy: never in the first 30 s after launch and never two
// within FULLSCREEN_GAP_MS. The interstitial unit is display-only in AdMob (closable after ~5 s, no long videos).

const LAUNCH_GRACE_MS = 30 * 1000;
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

/** An ad right now if the safety nets allow it (quiz/mock result, CV made). */
export function maybeShowInterstitial() {
  showFullScreen();
}

/** Runs `then` after an ad if one may show now, otherwise straight away (before a quiz / mock test). */
export function withAd(then: () => void) {
  if (!showFullScreen(then)) then();
}

// opens since the last ad, per kind; starts "due" so the first open shows one
const freeOpens: Record<'job' | 'update' | 'paper', number> = { job: 1, update: 1, paper: 1 };

/** Every other open of a kind gets an ad: 1st ad, 2nd free, 3rd ad. An ad that can't show stays due. */
export function adOnOpen(kind: keyof typeof freeOpens, then?: () => void) {
  if (freeOpens[kind] >= 1 && showFullScreen(then)) {
    freeOpens[kind] = 0;
    return;
  }
  freeOpens[kind] += 1;
  then?.();
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
