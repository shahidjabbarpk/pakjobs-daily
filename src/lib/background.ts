/**
 * Background detector. Must be imported at module scope from the root layout so
 * the task is defined before the OS wakes the JS runtime headlessly.
 */
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { BACKGROUND_INTERVAL_MIN, BACKGROUND_TASK } from './config';
import { refreshJobs } from './feed';
import { notifyNewJobs } from './notify';
import { waitForHydration } from './store';
import { notifyUpdates, refreshUpdates } from './updates';

TaskManager.defineTask(BACKGROUND_TASK, async () => {
  try {
    await waitForHydration();
    const { fresh } = await refreshJobs();
    await notifyNewJobs(fresh);
    await refreshUpdates().then(notifyUpdates).catch(() => {});
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerBackgroundDetector(): Promise<void> {
  const status = await BackgroundTask.getStatusAsync();
  if (status !== BackgroundTask.BackgroundTaskStatus.Available) return;
  if (await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK)) return;
  await BackgroundTask.registerTaskAsync(BACKGROUND_TASK, { minimumInterval: BACKGROUND_INTERVAL_MIN });
}
