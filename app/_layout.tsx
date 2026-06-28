import React from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../src/api/queryClient';
import { getCurrentUser } from '../src/services/auth';
import { getSupabaseClient } from '../src/lib/supabase';
import { useAuthStore } from '../src/store/useAuthStore';
import { registerPushToken } from '../src/services/pushTokenService';

export default function RootLayout() {
  const user = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)
  const clearUser = useAuthStore((state) => state.clearUser)
  const setHydrated = useAuthStore((state) => state.setHydrated)

  React.useEffect(() => {
    const supabase = getSupabaseClient()
    let isMounted = true

    const syncSession = async () => {
      try {
        const currentUser = await getCurrentUser()

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

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) {
        return
      }

      if (!session?.user) {
        clearUser()
        setHydrated(true)
        return
      }

      void getCurrentUser()
        .then((currentUser) => {
          if (!isMounted) {
            return
          }

          if (currentUser) {
            setUser(currentUser)
          } else {
            clearUser()
          }
        })
        .finally(() => {
          if (isMounted) {
            setHydrated(true)
          }
        })
    })

    return () => {
      isMounted = false
      authListener.subscription.unsubscribe()
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
