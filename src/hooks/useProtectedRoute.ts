import { useFocusEffect, useRouter, usePathname } from 'expo-router'
import { useCallback, useRef } from 'react'
import { useAuthStore } from '../store/useAuthStore'

export function useProtectedRoute(fallbackRoute: string = '/(tabs)/home') {
  const router = useRouter()
  const pathname = usePathname()
  const user = useAuthStore((state) => state.user)
  const isHydrated = useAuthStore((state) => state.isHydrated)
  
  // Track if we are currently redirecting so we don't trap the user in a loop
  const hasRedirected = useRef(false)

  useFocusEffect(
    useCallback(() => {
      if (!isHydrated) return

      if (!user) {
        if (hasRedirected.current) {
          // User returned to this screen from Login without logging in
          // Redirect to fallback to escape the protected route cleanly
          hasRedirected.current = false
          router.replace(fallbackRoute as never)
        } else {
          // Push to login and record the current path
          hasRedirected.current = true
          router.push({ pathname: '/(auth)/login', params: { returnTo: pathname } } as never)
        }
      } else {
        // Reset redirection tracker when logged in
        hasRedirected.current = false
      }
    }, [isHydrated, user, router, fallbackRoute, pathname])
  )
}
