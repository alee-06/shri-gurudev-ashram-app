/**
 * Smoke tests — Auth Service (auth critical path)
 * Mocks Firebase auth and the API client at the module boundary and verifies
 * that authenticatePhone/confirmPhoneOtp/signOut/getCurrentUser behave correctly.
 */

import { authenticatePhone, confirmPhoneOtp, signOut, getCurrentUser } from '../services/auth'
import * as firebaseAuth from '@react-native-firebase/auth'
import * as SecureStore from 'expo-secure-store'
import { useAuthStore } from '../store/useAuthStore'

jest.mock('@react-native-firebase/auth', () => {
  const mockUser = {
    getIdToken: jest.fn(),
  }
  const mockConfirmationResult = {
    confirm: jest.fn(),
  }
  const mockAuth = {
    signInWithPhoneNumber: jest.fn(),
    signOut: jest.fn(),
    currentUser: null,
  }
  const authFunc = jest.fn(() => mockAuth)
  return {
    getAuth: jest.fn(() => mockAuth),
    signInWithPhoneNumber: jest.fn((auth, phone) => mockAuth.signInWithPhoneNumber(phone)),
    signOut: jest.fn((auth) => mockAuth.signOut()),
    getIdToken: jest.fn((user, force) => user.getIdToken(force)),
    __mockUser: mockUser,
    __mockConfirmationResult: mockConfirmationResult,
    __mockAuth: mockAuth,
  }
})

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}))

jest.mock('../store/useAuthStore', () => ({
  useAuthStore: {
    getState: jest.fn(() => ({
      setUser: jest.fn(),
      clearUser: jest.fn(),
    })),
  },
}))

const mockUserRow = {
  id: 'user-abc',
  full_name: 'Ashram User',
  email: 'user@example.com',
  phone: '9876543210',
  role: 'user',
  profile_image_url: null,
  verification_status: 'not_submitted',
  aadhaar_number: null,
  aadhaar_image_path: null,
  selfie_image_path: null,
  created_at: '2024-01-01T00:00:00Z',
  deleted_at: null,
}

// Global fetch mock
global.fetch = jest.fn()

describe('authenticatePhone', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('calls Firebase signInWithPhoneNumber with the formatted number', async () => {
    const authModule = require('@react-native-firebase/auth')
    authModule.__mockAuth.signInWithPhoneNumber.mockResolvedValue(authModule.__mockConfirmationResult)

    const result = await authenticatePhone('9876543210')
    expect(authModule.__mockAuth.signInWithPhoneNumber).toHaveBeenCalledWith('+919876543210')
    expect(result).toBe(authModule.__mockConfirmationResult)
  })
})

describe('confirmPhoneOtp', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('completes the token exchange and returns an AuthUser on successful confirm', async () => {
    const authModule = require('@react-native-firebase/auth')
    const confirmation = authModule.__mockConfirmationResult
    
    // 1. Firebase confirm returns the user
    confirmation.confirm.mockResolvedValue({ user: authModule.__mockUser })
    // 2. Getting Firebase token
    authModule.__mockUser.getIdToken.mockResolvedValue('firebase-token-123')
    
    // 3. Mock API responses
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, token: 'donation-jwt-456' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: mockUserRow }),
      })

    const user = await confirmPhoneOtp(confirmation, '123456')
    
    expect(confirmation.confirm).toHaveBeenCalledWith('123456')
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('shri_gurudev_firebase_id_token', 'firebase-token-123')
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('shri_gurudev_donation_jwt', 'donation-jwt-456')
    
    expect(user.id).toBe('user-abc')
    expect(user.fullName).toBe('Ashram User')
    expect(user.role).toBe('user')
  })

  it('throws when Firebase confirm returns no user', async () => {
    const authModule = require('@react-native-firebase/auth')
    const confirmation = authModule.__mockConfirmationResult
    confirmation.confirm.mockResolvedValue({ user: null })

    await expect(confirmPhoneOtp(confirmation, '123456')).rejects.toThrow(/Firebase did not return a user/i)
  })
})

describe('signOut', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('clears firebase auth, secure store, and store state', async () => {
    const authModule = require('@react-native-firebase/auth')
    const mockClearUser = jest.fn()
    ;(useAuthStore.getState as jest.Mock).mockReturnValue({ clearUser: mockClearUser })

    await signOut()

    expect(authModule.__mockAuth.signOut).toHaveBeenCalled()
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('shri_gurudev_firebase_id_token')
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('shri_gurudev_donation_jwt')
    expect(mockClearUser).toHaveBeenCalled()
  })
})

describe('getCurrentUser', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns null when there is no active firebase user', async () => {
    const authModule = require('@react-native-firebase/auth')
    authModule.__mockAuth.currentUser = null

    const user = await getCurrentUser()
    expect(user).toBeNull()
  })

  it('returns an AuthUser when a session exists and backend succeeds', async () => {
    const authModule = require('@react-native-firebase/auth')
    authModule.__mockAuth.currentUser = authModule.__mockUser
    authModule.__mockUser.getIdToken.mockResolvedValue('firebase-token-123')

    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, token: 'donation-jwt-456' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: mockUserRow }),
      })

    const user = await getCurrentUser()
    
    expect(user).not.toBeNull()
    expect(user?.id).toBe('user-abc')
  })

  it('returns null when the backend profile fetch fails', async () => {
    const authModule = require('@react-native-firebase/auth')
    authModule.__mockAuth.currentUser = authModule.__mockUser
    authModule.__mockUser.getIdToken.mockResolvedValue('firebase-token-123')

    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, token: 'donation-jwt-456' }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Unauthorized' }),
      })

    const user = await getCurrentUser()
    expect(user).toBeNull()
  })
})
