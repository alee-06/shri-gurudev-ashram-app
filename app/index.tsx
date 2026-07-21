import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/store/useAuthStore';

export default function IndexRoute() {
  const user = useAuthStore((state) => state.user);
  const isHydrated = useAuthStore((state) => state.isHydrated);

  if (!isHydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAF6F0' }}>
        <ActivityIndicator size="small" color="#8B5A00" />
      </View>
    );
  }

  return <Redirect href={'/(tabs)/home' as any} />;
}
