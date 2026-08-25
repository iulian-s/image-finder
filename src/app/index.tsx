import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    View,
    TextInput,
    FlatList,
    TouchableOpacity,
    Text,
    StyleSheet,
    ActivityIndicator,
    Alert,
    Dimensions,
    useColorScheme,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as MediaLibrary from 'expo-media-library/legacy';
import * as Sharing from 'expo-sharing';

import { initDatabase, searchMemes, getAllMemes, getInitialMemes } from '@/services/db';
import { syncNewPhotos } from '@/services/syncService';
import { registerBackgroundSync } from '@/services/backgroundTask';
import { MemeCard } from '@/components/MemeCard';

const ITEM_SIZE = (Dimensions.get('window').width - 32) / 3;

export default function MemeSearchScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [query, setQuery] = useState('');
    const [results, setResults] = useState<{ uri: string; extracted_text: string }[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState('Ready');
    const queryRef = useRef('');

    queryRef.current = query;

    // Dynamic Theme Colors
    const theme = {
        background: isDark ? '#0f172a' : '#f8fafc',
        card: isDark ? '#1e293b' : '#ffffff',
        text: isDark ? '#f8fafc' : '#0f172a',
        subtext: isDark ? '#94a3b8' : '#64748b',
        border: isDark ? '#334155' : '#cbd5e1',
        inputBg: isDark ? '#1e293b' : '#ffffff',
        placeholder: isDark ? '#64748b' : '#94a3b8',
        clearBtn: isDark ? '#334155' : '#e2e8f0',
        clearBtnText: isDark ? '#94a3b8' : '#64748b',
        accent: isDark ? '#60a5fa' : '#2563eb',
    };

    const refreshGallery = useCallback(() => {
        const all = getAllMemes();
        setResults(all);
    }, []);

    useEffect(() => {
        let isMounted = true;

        try {
            initDatabase();
            const cached = getInitialMemes(60);
            setResults(cached);
        } catch (e) {
            console.error('Initial DB read failed:', e);
        }

        const timer = setTimeout(async () => {
            if (!isMounted) return;

            try {
                const { status } = await MediaLibrary.requestPermissionsAsync(false, ['photo']);
                if (status !== 'granted') {
                    if (isMounted) setSyncStatus('Gallery permission denied.');
                    return;
                }

                await registerBackgroundSync();

                if (isMounted) {
                    setIsSyncing(true);
                    setSyncStatus('Checking for new photos...');
                }

                const count = await syncNewPhotos((newMeme) => {
                    if (!queryRef.current.trim() && isMounted) {
                        setResults((prev) => {
                            if (prev.some((item) => item.uri === newMeme.uri)) return prev;
                            return [...prev, newMeme];
                        });
                    }
                });

                if (isMounted) {
                    setSyncStatus(count > 0 ? `Indexed ${count} new meme(s)` : 'All memes up to date');
                    if (!queryRef.current.trim()) {
                        refreshGallery();
                    }
                }
            } catch (err: any) {
                console.error('Sync failed:', err);
                if (isMounted) setSyncStatus('Sync error');
            } finally {
                if (isMounted) setIsSyncing(false);
            }
        }, 150);

        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, [refreshGallery]);

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

    const handleShare = useCallback(async (uri: string) => {
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
    }, []);

    const renderItem = useCallback(
        ({ item }: { item: { uri: string; extracted_text: string } }) => (
            <MemeCard uri={item.uri} onPress={handleShare} />
        ),
        [handleShare]
    );

    const keyExtractor = useCallback(
        (item: { uri: string }) => item.uri,
        []
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar style={isDark ? 'light' : 'dark'} />

            {/* Search Bar */}
            <View style={styles.searchWrapper}>
                <TextInput
                    style={[
                        styles.searchInput,
                        {
                            backgroundColor: theme.inputBg,
                            borderColor: theme.border,
                            color: theme.text,
                        },
                    ]}
                    placeholder="Type text inside meme (e.g. 'queen')..."
                    placeholderTextColor={theme.placeholder}
                    value={query}
                    onChangeText={handleSearch}
                    autoCapitalize="none"
                />
                {query.length > 0 && (
                    <TouchableOpacity
                        onPress={handleClear}
                        style={[styles.clearBtn, { backgroundColor: theme.clearBtn }]}
                    >
                        <Text style={[styles.clearBtnText, { color: theme.clearBtnText }]}>✕</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Status Bar */}
            <View style={styles.statusBar}>
                {isSyncing && <ActivityIndicator size="small" color={theme.accent} style={styles.spinner} />}
                <Text style={[styles.statusText, { color: theme.subtext }]}>{syncStatus}</Text>
                <Text style={[styles.countText, { color: theme.accent }]}>{results.length} items</Text>
            </View>

            {/* Grid */}
            <FlatList
                data={results}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                numColumns={3}
                contentContainerStyle={styles.gridList}
                initialNumToRender={18}
                maxToRenderPerBatch={18}
                windowSize={7}
                removeClippedSubviews={true}
                getItemLayout={(_, index) => ({
                    length: ITEM_SIZE,
                    offset: ITEM_SIZE * Math.floor(index / 3),
                    index,
                })}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={[styles.emptyText, { color: theme.subtext }]}>
                            {query.trim().length > 0
                                ? `No memes found matching "${query}"`
                                : 'Scanning gallery for memes...'}
                        </Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 60,
        paddingHorizontal: 16,
    },
    searchWrapper: {
        position: 'relative',
        justifyContent: 'center',
    },
    searchInput: {
        height: 50,
        borderRadius: 12,
        paddingLeft: 16,
        paddingRight: 40,
        fontSize: 16,
        borderWidth: 1,
        elevation: 2,
    },
    clearBtn: {
        position: 'absolute',
        right: 12,
        height: 26,
        width: 26,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
    },
    clearBtnText: {
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
        flex: 1,
    },
    countText: {
        fontSize: 13,
        fontWeight: '600',
    },
    gridList: {
        paddingBottom: 24,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 60,
        paddingHorizontal: 20,
    },
    emptyText: {
        fontSize: 15,
        textAlign: 'center',
    },
});