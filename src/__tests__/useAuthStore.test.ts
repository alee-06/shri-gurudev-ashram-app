/**
 * Smoke tests — Auth Store (critical store path)
 * Tests that the Zustand store initialises correctly and
 * that setUser / clearUser / logout mutations work as expected.
 */
import { act } from '@testing-library/react-native'
import { useAuthStore } from '../store/useAuthStore'
import type { AuthUser } from '../services/auth'

const mockUser: AuthUser = {
  id: 'user-123',
  fullName: 'Test User',
  email: 'test@example.com',
  phone: '9876543210',
  role: 'user',
  profileImageUrl: null,
  verificationStatus: 'not_submitted',
  aadhaarNumber: null,
  aadhaarImagePath: null,
  selfieImagePath: null,
  deletedAt: null,
}

describe('useAuthStore', () => {
  // Reset store between tests
  beforeEach(() => {
    act(() => {
      useAuthStore.getState().clearUser()
    })
  })

  it('initialises with null user and isHydrated false', () => {
    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.isHydrated).toBe(false)
  })

  it('setUser stores the user object', () => {
    act(() => {
      useAuthStore.getState().setUser(mockUser)
    })
    expect(useAuthStore.getState().user).toEqual(mockUser)
  })

  it('clearUser removes the user', () => {
    act(() => {
      useAuthStore.getState().setUser(mockUser)
      useAuthStore.getState().clearUser()
    })
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('logout removes the user', () => {
    act(() => {
      useAuthStore.getState().setUser(mockUser)
      useAuthStore.getState().logout()
    })
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('setHydrated sets isHydrated to true', () => {
    act(() => {
      useAuthStore.getState().setHydrated(true)
    })
    expect(useAuthStore.getState().isHydrated).toBe(true)
  })

  it('setAadhaarNumber stores the aadhaar value', () => {
    act(() => {
      useAuthStore.getState().setAadhaarNumber('123456789012')
    })
    expect(useAuthStore.getState().aadhaarNumber).toBe('123456789012')
  })

  it('setTemporaryAadhaarUri / clearTemporaryUris round-trips', () => {
    act(() => {
      useAuthStore.getState().setTemporaryAadhaarUri('file://aadhaar.jpg')
      useAuthStore.getState().setTemporarySelfieUri('file://selfie.jpg')
    })
    expect(useAuthStore.getState().temporaryAadhaarUri).toBe('file://aadhaar.jpg')
    expect(useAuthStore.getState().temporarySelfieUri).toBe('file://selfie.jpg')

    act(() => {
      useAuthStore.getState().clearTemporaryUris()
    })
    expect(useAuthStore.getState().temporaryAadhaarUri).toBeNull()
    expect(useAuthStore.getState().temporarySelfieUri).toBeNull()
  })

  it('role === collector is detected correctly from user object', () => {
    const collectorUser: AuthUser = { ...mockUser, role: 'collector' }
    act(() => {
      useAuthStore.getState().setUser(collectorUser)
    })
    const { user } = useAuthStore.getState()
    expect(user?.role).toBe('collector')
  })
})
