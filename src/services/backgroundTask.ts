import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { syncNewPhotos } from './syncService';

export const BACKGROUND_SYNC_TASK = 'BACKGROUND_PHOTO_SYNC';

TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
    try{
        const indexed = await syncNewPhotos();
        console.log(`[Background Sync] Processed ${indexed} new photos.`);
        return indexed > 0
            ? BackgroundFetch.BackgroundFetchResult.NewData
            : BackgroundFetch.BackgroundFetchResult.NoData;
    } catch(error) {
        console.error('[Background Sync] Failed:', error);
        return BackgroundFetch.BackgroundFetchResult.Failed;
    }
});

// Register interval with OS
export async function registerBackgroundSync(){
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK)
    if(!isRegistered){
        await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
            minimumInterval: 15 * 60, // Run every 15 minutes (OS decides exact timing)
            stopOnTerminate: false,    // Android: Continue running after app close
            startOnBoot: true,         // Android: Start task after reboot
        });
    }
}