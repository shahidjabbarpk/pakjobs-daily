import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Icon, Tap, useStatusBar } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { font, useTheme } from '@/lib/theme';

// pdf.js renders every page to a canvas. The page is given the PDF's own origin as its base URL,
// so pdf.js can fetch the file same-origin (the commission sites send no CORS headers).
const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174';

function viewerHtml(url: string) {
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes">
<style>body{margin:0;background:#e9ecef}canvas{display:block;width:100%;margin:0 0 8px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.15)}</style>
<script src="${PDFJS}/pdf.min.js"></script></head><body><div id="pages"></div><script>
const post = (m) => window.ReactNativeWebView.postMessage(JSON.stringify(m));
(async () => {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '${PDFJS}/pdf.worker.min.js';
    const pdf = await pdfjsLib.getDocument(${JSON.stringify(url)}).promise;
    post({ type: 'pages', n: pdf.numPages });
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const base = page.getViewport({ scale: 1 });
      const vp = page.getViewport({ scale: (window.innerWidth * dpr) / base.width });
      const canvas = document.createElement('canvas');
      canvas.width = vp.width; canvas.height = vp.height;
      document.getElementById('pages').appendChild(canvas);
      await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
      post({ type: 'page', i });
    }
  } catch (e) { post({ type: 'error', msg: String(e && e.message || e) }); }
})();
</script></body></html>`;
}

/** An official past paper shown inside the app; "Download" hands the PDF to the browser to save. */
export default function PaperViewer() {
  useStatusBar('plain');
  const c = useTheme();
  const { t, tf } = useI18n();
  const insets = useSafeAreaInsets();
  const { url, title } = useLocalSearchParams<{ url: string; title?: string }>();
  const [pages, setPages] = useState(0);
  const [done, setDone] = useState(0);
  const [failed, setFailed] = useState(false);
  const origin = url?.match(/^https?:\/\/[^/]+/)?.[0] ?? '';

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={[styles.head, { paddingTop: insets.top + 8, backgroundColor: c.card, borderBottomColor: c.border }]}>
        <Tap onPress={() => router.back()} style={[styles.btn, { backgroundColor: c.cardAlt }]}><Icon name="arrow-left" size={22} color={c.text} /></Tap>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>{title}</Text>
          <Text style={[tf(), { color: c.faint, fontSize: 11.5 }]}>
            {pages ? `${done}/${pages} ${t('pages')}` : t('loading')}
          </Text>
        </View>
        <Tap onPress={() => url && Linking.openURL(url)} style={[styles.btn, { backgroundColor: c.primarySoft }]}>
          <Icon name="download" size={22} color={c.primary} />
        </Tap>
      </View>
      {url && !failed ? (
        <WebView
          source={{ html: viewerHtml(url), baseUrl: `${origin}/` }}
          originWhitelist={['*']}
          javaScriptEnabled
          setBuiltInZoomControls
          setDisplayZoomControls={false}
          onMessage={(e) => {
            const m = JSON.parse(e.nativeEvent.data);
            if (m.type === 'pages') setPages(m.n);
            else if (m.type === 'page') setDone(m.i);
            else if (m.type === 'error') setFailed(true);
          }}
          onError={() => setFailed(true)}
          style={{ flex: 1, backgroundColor: '#e9ecef' }}
        />
      ) : (
        <View style={styles.center}>
          <Icon name="file-alert-outline" size={48} color={c.faint} />
          <Text style={[tf(), { color: c.sub, textAlign: 'center' }]}>{t('paperFailed')}</Text>
          <Tap onPress={() => url && Linking.openURL(url)} style={[styles.dl, { backgroundColor: c.primary }]}>
            <Icon name="download" size={18} color="#fff" />
            <Text style={[tf('bold'), { color: '#fff' }]}>{t('downloadPdf')}</Text>
          </Tap>
        </View>
      )}
      {!failed && pages === 0 && <ActivityIndicator style={styles.spinner} size="large" color={c.primary} />}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  btn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: font.semi, fontSize: 14.5 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 30 },
  dl: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingHorizontal: 18, height: 46, borderRadius: 14 },
  spinner: { position: 'absolute', top: '45%', alignSelf: 'center' },
});
