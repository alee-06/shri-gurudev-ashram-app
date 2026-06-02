import React from 'react';
import { Redirect, Tabs } from 'expo-router';
import { useAuthStore } from '../../src/store/useAuthStore';
import CustomTabBar from '../../src/components/CustomTabBar';

export default function TabsLayout() {
  const user = useAuthStore((state) => state.user);
  const isHydrated = useAuthStore((state) => state.isHydrated);

  if (!isHydrated) {
    return null;
  }

  if (!user) {
    return <Redirect href={'/(auth)/splash' as any} />;
  }

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="travel" options={{ title: 'Travel' }} />
      <Tabs.Screen name="donate" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ title: 'Alerts' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
