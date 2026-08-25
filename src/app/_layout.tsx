import { Stack } from 'expo-router';

export default function RootLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false, // Hides the default top title/header bar
            }}
        >
            <Stack.Screen name="index" />
        </Stack>
    );
}