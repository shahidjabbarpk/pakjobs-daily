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
  RewardedAd,
  RewardedAdEventType,
} from 'react-native-google-mobile-ads';
import { Image } from 'expo-image';
import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';
import { INTERSTITIAL_GAP_MS, PROD_AD_UNITS } from './config';
import { useI18n } from './i18n';
import { useApp } from './store';
import { font, useTheme } from './theme';

const prod = Platform.OS === 'ios' ? PROD_AD_UNITS.ios : PROD_AD_UNITS.android;
const useTest = __DEV__ || !prod.banner;
const AD_UNITS = {
  banner: useTest ? TestIds.ADAPTIVE_BANNER : prod.banner,
  native: useTest ? TestIds.NATIVE : prod.native,
  interstitial: useTest ? TestIds.INTERSTITIAL : prod.interstitial,
  rewarded: useTest ? TestIds.REWARDED : prod.rewarded,
};

let started = false;
export function startAds() {
  if (started) return;
  started = true;
  mobileAds().initialize().then(() => { loadInterstitial(); loadRewarded(); }).catch(() => {});
}

// ---------------------------------------------------------------- interstitial

let interstitial: InterstitialAd | null = null;
let interstitialReady = false;

function loadInterstitial() {
  interstitial = InterstitialAd.createForAdRequest(AD_UNITS.interstitial);
  interstitialReady = false;
  interstitial.addAdEventListener(AdEventType.LOADED, () => { interstitialReady = true; });
  interstitial.addAdEventListener(AdEventType.CLOSED, () => loadInterstitial());
  interstitial.addAdEventListener(AdEventType.ERROR, () => {
    interstitialReady = false;
    setTimeout(loadInterstitial, 60_000);
  });
  interstitial.load();
}

/** Called when a job detail opens. Shows at most one interstitial every 3 minutes. */
export function maybeShowInterstitial() {
  const { lastInterstitial, set } = useApp.getState();
  if (!interstitial || !interstitialReady) return;
  if (Date.now() - lastInterstitial < INTERSTITIAL_GAP_MS) return;
  set({ lastInterstitial: Date.now() });
  interstitialReady = false;
  interstitial.show().catch(() => loadInterstitial());
}

// ---------------------------------------------------------------- rewarded

const REWARDED_GAP_MS = 2 * 60 * 1000;
let rewarded: RewardedAd | null = null;
let rewardedReady = false;
let lastRewarded = 0;
let afterRewarded: (() => void) | null = null;

function loadRewarded() {
  rewarded = RewardedAd.createForAdRequest(AD_UNITS.rewarded);
  rewardedReady = false;
  rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => { rewardedReady = true; });
  rewarded.addAdEventListener(AdEventType.CLOSED, () => {
    // the content opens whether or not the video was watched to the end
    afterRewarded?.();
    afterRewarded = null;
    loadRewarded();
  });
  rewarded.addAdEventListener(AdEventType.ERROR, () => {
    rewardedReady = false;
    // an ad that fails mid-show must not swallow the advert/result the user tapped
    afterRewarded?.();
    afterRewarded = null;
    setTimeout(loadRewarded, 60_000);
  });
  rewarded.load();
}

/** Shows a rewarded video before opening an advert/PDF; opens straight away if none is ready. */
export function showRewarded(then: () => void) {
  if (!rewarded || !rewardedReady || Date.now() - lastRewarded < REWARDED_GAP_MS) {
    then();
    return;
  }
  lastRewarded = Date.now();
  rewardedReady = false;
  afterRewarded = then;
  rewarded.show().catch(() => {
    afterRewarded = null;
    then();
    loadRewarded();
  });
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
