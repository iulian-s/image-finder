import React, {useEffect, useState, useCallback, useRef} from 'react';
import {
    View,
    TextInput,
    FlatList,
    TouchableOpacity,
    Text,
    StyleSheet,
    ActivityIndicator,
    Alert,
} from 'react-native';
import * as MediaLibrary from 'expo-media-library/legacy';
import * as Sharing from 'expo-sharing';

import {initDatabase, searchMemes, getAllMemes, getInitialMemes} from '@/services/db';
import { syncNewPhotos } from '@/services/syncService';
import { registerBackgroundSync } from '@/services/backgroundTask';
import { InteractionManager } from 'react-native';
import { Image } from 'expo-image';

export default function MemeSearchScreen() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<{ uri: string; extracted_text: string }[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState('Ready');
    const queryRef = useRef('');

    // Keep ref synced so streaming doesn't overwrite active searches
    queryRef.current = query;

    const refreshGallery = useCallback(() => {
        const all = getAllMemes();
        setResults(all);
    }, []);

    useEffect(() => {
        let isMounted = true;

        // 1. Instant paint of cached items
        initDatabase();
        const cached = getInitialMemes(30);
        setResults(cached);

        // 2. Run heavier tasks AFTER initial screen transitions & animations finish
        // Inside useEffect:
        const task = InteractionManager.runAfterInteractions(async () => {
            if (!isMounted) return;

            const { status } = await MediaLibrary.requestPermissionsAsync(true);
            if (status !== 'granted') {
                setSyncStatus('Gallery permission denied.');
                return;
            }

            await registerBackgroundSync();

            setIsSyncing(true);
            setSyncStatus('Checking for new photos...');
            try {
                const count = await syncNewPhotos((newMeme) => {
                    if (!queryRef.current.trim() && isMounted) {
                        setResults((prev) => {
                            // Guard against duplicate state entry
                            if (prev.some((item) => item.uri === newMeme.uri)) {
                                return prev;
                            }
                            return [newMeme, ...prev];
                        });
                    }
                });

                if (isMounted) {
                    setSyncStatus(count > 0 ? `Indexed ${count} new image(s)` : 'All images up to date');
                    // Ensure full unique list is displayed if not actively searching
                    if (!queryRef.current.trim()) {
                        refreshGallery();
                    }
                }
            } catch (err) {
                console.error('Sync failed:', err);
                if (isMounted) setSyncStatus('Sync error');
            } finally {
                if (isMounted) setIsSyncing(false);
            }
        });

        return () => {
            isMounted = false;
            task.cancel();
        };
    }, []);

    const handleSearch = (text: string) => {
        setQuery(text);
        if (text.trim().length > 0) {
            const hits = searchMemes(text);
            setResults(hits);
        } else {
            refreshGallery();
        }
    };

    const handleClear = () => {
        setQuery('');
        refreshGallery();
    };

    const handleShare = async (uri: string) => {
        try {
            const isAvailable = await Sharing.isAvailableAsync();
            if (isAvailable) {
                await Sharing.shareAsync(uri);
            } else {
                Alert.alert('Sharing Unavailable', 'Native sharing is not supported on this platform.');
            }
        } catch (error) {
            Alert.alert('Share Failed', 'Could not open share dialog.');
            console.error(error);
        }
    };

    return (
        <View style={styles.container}>
            {/* Search Input */}
            <View style={styles.searchWrapper}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Type text inside the picture..."
                    placeholderTextColor="#94a3b8"
                    value={query}
                    onChangeText={handleSearch}
                    autoCapitalize="none"
                />
                {query.length > 0 && (
                    <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
                        <Text style={styles.clearBtnText}>✕</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Status Bar */}
            <View style={styles.statusBar}>
                {isSyncing && <ActivityIndicator size="small" color="#2563eb" style={styles.spinner} />}
                <Text style={styles.statusText}>{syncStatus}</Text>
                <Text style={styles.countText}>{results.length} items</Text>
            </View>

            {/* Lazy-loading Optimized Grid */}
            <FlatList
                data={results}
                keyExtractor={(item) => item.uri}
                numColumns={3}
                contentContainerStyle={styles.gridList}
                initialNumToRender={15}
                maxToRenderPerBatch={15}
                windowSize={5}
                removeClippedSubviews={true}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>
                            {query.trim().length > 0
                                ? `No images found matching "${query}"`
                                : 'Scanning gallery for images...'}
                        </Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.imageCard}
                        activeOpacity={0.8}
                        onPress={() => handleShare(item.uri)}
                    >
                        <Image
                            source={{ uri: item.uri }}
                            style={styles.thumbnail}
                            contentFit="cover"
                            recyclingKey={item.uri}
                            transition={150}
                        />
                    </TouchableOpacity>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 60,
        paddingHorizontal: 16,
        backgroundColor: '#f8fafc',
    },
    searchWrapper: {
        position: 'relative',
        justifyContent: 'center',
    },
    searchInput: {
        height: 50,
        backgroundColor: '#ffffff',
        borderRadius: 12,
        paddingLeft: 16,
        paddingRight: 40,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#cbd5e1',
        color: '#0f172a',
        elevation: 2,
    },
    clearBtn: {
        position: 'absolute',
        right: 12,
        height: 26,
        width: 26,
        borderRadius: 13,
        backgroundColor: '#e2e8f0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    clearBtnText: {
        color: '#64748b',
        fontSize: 13,
        fontWeight: 'bold',
    },
    statusBar: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 10,
        paddingHorizontal: 4,
    },
    spinner: {
        marginRight: 8,
    },
    statusText: {
        fontSize: 13,
        color: '#64748b',
        flex: 1,
    },
    countText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#3b82f6',
    },
    gridList: {
        paddingBottom: 24,
    },
    imageCard: {
        flex: 1 / 3,
        margin: 4,
        aspectRatio: 1,
        borderRadius: 10,
        overflow: 'hidden',
        backgroundColor: '#e2e8f0',
    },
    thumbnail: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 60,
        paddingHorizontal: 20,
    },
    emptyText: {
        fontSize: 15,
        color: '#64748b',
        textAlign: 'center',
    },
});