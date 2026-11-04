import '@/lib/background'; // defines the background task at module scope
import { NotoNastaliqUrdu_400Regular, NotoNastaliqUrdu_700Bold } from '@expo-google-fonts/noto-nastaliq-urdu';
import { Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold, useFonts } from '@expo-google-fonts/poppins';
import * as Notifications from 'expo-notifications';
import { router, Stack, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { startAds } from '@/lib/ads';
import { registerBackgroundDetector } from '@/lib/background';
import { isAdmin } from '@/lib/community';
import { refreshJobs } from '@/lib/feed';
import { refreshUpdates } from '@/lib/updates';
import { setupNotifications } from '@/lib/notify';
import { useApp, waitForHydration } from '@/lib/store';
import { useTheme } from '@/lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

function useNotificationTaps() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const openJob = (r: Notifications.NotificationResponse | null) => {
      const data = r?.notification.request.content.data;
      // handled once: otherwise the same tap re-opens the job whenever the app restarts its JS
      if (r) Notifications.clearLastNotificationResponse();
      if (typeof data?.jobId === 'string') router.push(`/job/${data.jobId}`);
      else if (typeof data?.screen === 'string') router.push(data.screen as any);
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

  const [hydrated, setHydrated] = useState(useApp.persist.hasHydrated());
  const onboarded = useApp((s) => s.onboarded);
  const segments = useSegments();

  useEffect(() => {
    waitForHydration().then(() => {
      setHydrated(true);
      // fresh jobs + private posts on every launch; admin flag for the moderation panel
      refreshJobs().catch(() => {});
      refreshUpdates().catch(() => {});
      isAdmin().then((admin) => useApp.getState().set({ admin })).catch(() => {});
      if (Platform.OS === 'web') return;
      startAds();
      // first launch asks for notification permission inside onboarding instead
      (useApp.getState().onboarded ? setupNotifications() : Promise.resolve(false))
        .catch(() => false)
        .then(() => registerBackgroundDetector())
        .catch(() => {});
    });
  }, []);

  const ready = loaded && hydrated;
  useEffect(() => {
    if (ready && !onboarded && segments[0] !== 'onboarding') router.replace('/onboarding');
  }, [ready, onboarded, segments]);

  if (!ready) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg }, animation: 'slide_from_right' }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="job/[id]" options={{ animation: 'fade_from_bottom' }} />
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        <Stack.Screen name="post-job" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="my-posts" />
        <Stack.Screen name="admin" />
        <Stack.Screen name="updates" />
        <Stack.Screen name="prep" />
        <Stack.Screen name="quiz/[subject]" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="cv" />
        <Stack.Screen name="exam/[key]" />
        <Stack.Screen name="past-papers" />
      </Stack>
    </GestureHandlerRootView>
  );
}
