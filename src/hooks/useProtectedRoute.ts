import { useFocusEffect, useRouter, usePathname } from 'expo-router'
import { useCallback } from 'react'
import { useAuthStore } from '../store/useAuthStore'

export function useProtectedRoute(fallbackRoute: string = '/(tabs)/home') {
  const router = useRouter()
  const pathname = usePathname()
  const user = useAuthStore((state) => state.user)
  const isHydrated = useAuthStore((state) => state.isHydrated)

  useFocusEffect(
    useCallback(() => {
      if (!isHydrated) return

      if (!user) {
        // Replace current route with Login so the protected route isn't left in the navigation stack
        router.replace({ pathname: '/(auth)/login', params: { returnTo: pathname } } as never)
      }
    }, [isHydrated, user, router, pathname])
  )
}
