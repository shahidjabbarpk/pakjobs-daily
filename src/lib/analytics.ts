import { getAnalytics, logEvent } from '@react-native-firebase/analytics';

/**
 * In-app events for Google Analytics for Firebase (project pakjobs-daily-sj). The Google Ads app
 * campaign imports these as conversions, so keep the names stable:
 * job_view, job_save, job_apply_click, job_share, mock_test_complete, cv_created, alert_setup,
 * notification_open, app_share. Never send names, phone numbers or anything a user typed.
 */
export function track(name: string, params?: Record<string, string | number | boolean | undefined>) {
  const clean = params && Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined));
  try {
    Promise.resolve(logEvent(getAnalytics(), name, clean)).catch(() => {});
  } catch {}
}
