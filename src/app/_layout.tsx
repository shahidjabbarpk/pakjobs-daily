import '@/lib/background'; // defines the background task at module scope
import { NotoNastaliqUrdu_400Regular, NotoNastaliqUrdu_700Bold } from '@expo-google-fonts/noto-nastaliq-urdu';
import { Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold, useFonts } from '@expo-google-fonts/poppins';
import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { startAds } from '@/lib/ads';
import { registerBackgroundDetector } from '@/lib/background';
import { setupNotifications } from '@/lib/notify';
import { useTheme } from '@/lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

function useNotificationTaps() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const openJob = (r: Notifications.NotificationResponse | null) => {
      const jobId = r?.notification.request.content.data?.jobId;
      if (typeof jobId === 'string') router.push(`/job/${jobId}`);
    };
    // cold start from a notification tap, then taps while running
    Notifications.getLastNotificationResponseAsync().then(openJob).catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener(openJob);
    return () => sub.remove();
  }, []);
}

export default function RootLayout() {
  const c = useTheme();
  const [loaded] = useFonts({
    Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold,
    NotoNastaliqUrdu_400Regular, NotoNastaliqUrdu_700Bold,
  });
  useNotificationTaps();

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(c.bg).catch(() => {});
  }, [c.bg]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => {});
  }, [loaded]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    startAds();
    setupNotifications()
      .then(() => registerBackgroundDetector())
      .catch(() => {});
  }, []);

  if (!loaded) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg }, animation: 'slide_from_right' }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="job/[id]" options={{ animation: 'fade_from_bottom' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
