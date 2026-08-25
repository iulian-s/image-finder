import React from 'react';
import { TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
import { Image } from 'expo-image';

interface MemeCardProps {
    uri: string;
    onPress: (uri: string) => void;
}

export const MemeCard = React.memo(
    ({ uri, onPress }: MemeCardProps) => {
        const isDark = useColorScheme() === 'dark';

        return (
            <TouchableOpacity
                style={[
                    styles.imageCard,
                    { backgroundColor: isDark ? '#1e293b' : '#e2e8f0' },
                ]}
                activeOpacity={0.8}
                onPress={() => onPress(uri)}
            >
                <Image
                    source={{ uri }}
                    style={styles.thumbnail}
                    contentFit="cover"
                    recyclingKey={uri}
                    cachePolicy="memory-disk"
                    transition={0}
                />
            </TouchableOpacity>
        );
    },
    (prevProps, nextProps) => prevProps.uri === nextProps.uri
);

const styles = StyleSheet.create({
    imageCard: {
        flex: 1 / 3,
        margin: 4,
        aspectRatio: 1,
        borderRadius: 10,
        overflow: 'hidden',
    },
    thumbnail: {
        width: '100%',
        height: '100%',
    },
});