import * as MediaLibrary from 'expo-media-library/legacy';
import * as SQLite from 'expo-sqlite';
import { extractTextFromImage } from './ocr';
import {isMemeIndexed, saveMeme} from './db';

const db = SQLite.openDatabaseSync('memes.db');

export function getLastScanTime(): number {
    db.execSync(`
        CREATE TABLE IF NOT EXISTS sync_meta (
                                                 key TEXT PRIMARY KEY,
                                                 value TEXT
        );
    `);
    const row = db.getFirstSync<{ value: string }>(
        "SELECT value FROM sync_meta WHERE key = 'last_scan_time';"
    );
    return row ? parseInt(row.value, 10) : 0;
}

export function updateLastScanTime(timestamp: number) {
    db.runSync(
        "INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('last_scan_time', ?);",
        [timestamp.toString()]
    );
}

const sleep = (ms: number = 0) => new Promise((resolve) => setTimeout(resolve, ms));

export async function syncNewPhotos(
    onNewMemeFound?: (meme: { uri: string; extracted_text: string }) => void
): Promise<number> {
    const { status } = await MediaLibrary.getPermissionsAsync();
    if (status !== 'granted') return 0;

    const lastScan = getLastScanTime();
    let hasMore = true;
    let cursor: string | undefined = undefined;
    let latestSeenTimestamp = lastScan;
    let newlyIndexedCount = 0;

    while (hasMore) {
        const options: MediaLibrary.AssetsOptions = {
            first: 30,
            after: cursor,
            mediaType: [MediaLibrary.MediaType.photo],
            sortBy: [MediaLibrary.SortBy.creationTime],
            ...(lastScan > 0 ? { createdAfter: lastScan } : {}),
        };

        const page = await MediaLibrary.getAssetsAsync(options);

        for (const asset of page.assets) {
            let uri = asset.uri;

            try {
                const assetInfo = await MediaLibrary.getAssetInfoAsync(asset);
                uri = assetInfo.localUri || asset.uri;
            } catch {
                // Keep asset.uri
            }

            if (!isMemeIndexed(uri)) {
                try {
                    const text = await extractTextFromImage(uri);

                    if (text && text.trim().length > 0) {
                        saveMeme(uri, text);
                        newlyIndexedCount++;

                        if (onNewMemeFound) {
                            onNewMemeFound({ uri, extracted_text: text.toLowerCase() });
                        }
                    }
                } catch (ocrErr) {
                    console.warn(`[Sync] OCR skipped for asset ${uri}:`, ocrErr);
                }
            }

            if (asset.creationTime && asset.creationTime > latestSeenTimestamp) {
                latestSeenTimestamp = asset.creationTime;
            }

            await sleep(10);
        }

        hasMore = page.hasNextPage;
        cursor = page.endCursor;
    }

    if (latestSeenTimestamp > lastScan) {
        updateLastScanTime(latestSeenTimestamp);
    }

    return newlyIndexedCount;
}