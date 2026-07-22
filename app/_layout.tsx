import React from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../src/api/queryClient';
import { getCurrentUser } from '../src/services/auth';
import { useAuthStore } from '../src/store/useAuthStore';
import { registerPushToken } from '../src/services/pushTokenService';

export default function RootLayout() {
  const user = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)
  const clearUser = useAuthStore((state) => state.clearUser)
  const setHydrated = useAuthStore((state) => state.setHydrated)
  const isHydrated = useAuthStore((state) => state.isHydrated)

  React.useEffect(() => {
    let isMounted = true

    const syncSession = async () => {
      try {
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000))
        const currentUser = await Promise.race([getCurrentUser(), timeoutPromise])

        if (!isMounted) {
          return
        }

        if (currentUser) {
          setUser(currentUser)
        } else {
          clearUser()
        }
      } catch {
        if (!isMounted) {
          return
        }

        clearUser()
      } finally {
        if (isMounted) {
          setHydrated(true)
        }
      }
    }

    void syncSession()

    return () => {
      isMounted = false
    }
  }, [clearUser, setHydrated, setUser])

  React.useEffect(() => {
    if (!user?.id) {
      return
    }

    registerPushToken(user.id).catch((error) => {
      console.warn('[pushToken] registration failed.', error)
    })
  }, [user?.id])

  const router = useRouter()
  const segments = useSegments()

  React.useEffect(() => {
    if (!isHydrated) return

    const inAuthGroup = segments[0] === '(auth)'
    
    // If the user is authenticated but has an incomplete profile (e.g. empty fullName),
    // force them to the onboarding screen. Guest users (user === null) are allowed.
    if (user && !user.fullName.trim() && segments[0] !== 'edit-profile') {
      router.replace({ pathname: '/edit-profile', params: { onboarding: '1' } } as never)
    }
  }, [isHydrated, user, segments, router])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <Stack screenOptions={{ headerShown: false }} />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
