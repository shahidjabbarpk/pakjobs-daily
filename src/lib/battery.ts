import * as IntentLauncher from 'expo-intent-launcher';
import Constants from 'expo-constants';
import { Linking, Platform } from 'react-native';

/** Opens Android's battery-optimisation screen so the user can exempt the app (background alerts). */
export async function openBatterySettings(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
  } catch {
    // some OEM skins hide that screen - fall back to the app's own settings page
    const pkg = Constants.expoConfig?.android?.package;
    if (pkg) await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.APPLICATION_DETAILS_SETTINGS, { data: `package:${pkg}` }).catch(() => Linking.openSettings());
    else await Linking.openSettings();
  }
}
