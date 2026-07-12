/**
 * Smoke tests — Auth Service (auth critical path)
 * Mocks Supabase client at the module boundary and verifies
 * that signIn/signOut/getCurrentUser behave correctly under
 * success and error conditions.
 */

// ── Mock Supabase (jest.mock is hoisted; use factory with inline jest.fn()) ───
jest.mock('../lib/supabase', () => ({
  getSupabaseClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(),
  })),
}))

import { getSupabaseClient } from '../lib/supabase'
import { signIn, signOut, getCurrentUser } from '../services/auth'

// ── Helpers ───────────────────────────────────────────────────────────────────
function getAuthMocks() {
  const client = (getSupabaseClient as jest.Mock)()
  return {
    getSession: client.auth.getSession as jest.Mock,
    signInWithPassword: client.auth.signInWithPassword as jest.Mock,
    signOut: client.auth.signOut as jest.Mock,
    from: client.from as jest.Mock,
  }
}

function buildDbChain(returnValue: { data: unknown; error: unknown }) {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue(returnValue),
  }
}

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

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('signIn', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Re-initialize: getSupabaseClient is called fresh each time, but we need
    // the mock to return a consistent object. Easiest fix: set mockReturnValue.
    ;(getSupabaseClient as jest.Mock).mockReturnValue({
      auth: {
        getSession: jest.fn(),
        signInWithPassword: jest.fn(),
        signOut: jest.fn(),
      },
      from: jest.fn(),
    })
  })

  it('returns an AuthUser on successful sign-in', async () => {
    const mocks = getAuthMocks()
    mocks.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'user-abc', email: 'user@example.com', user_metadata: {} } },
      error: null,
    })
    mocks.from.mockReturnValue(buildDbChain({ data: mockUserRow, error: null }))

    const user = await signIn('user@example.com', 'password123')
    expect(user.id).toBe('user-abc')
    expect(user.email).toBe('user@example.com')
    expect(user.role).toBe('user')
  })

  it('throws a readable error on invalid credentials', async () => {
    const mocks = getAuthMocks()
    mocks.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid login credentials' },
    })

    await expect(signIn('bad@example.com', 'wrong')).rejects.toThrow(
      /check your email and password/i,
    )
  })

  it('throws when Supabase returns no user object', async () => {
    const mocks = getAuthMocks()
    mocks.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    await expect(signIn('x@example.com', 'pass')).rejects.toThrow(
      /did not return a user/i,
    )
  })
})

describe('signOut', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getSupabaseClient as jest.Mock).mockReturnValue({
      auth: {
        getSession: jest.fn(),
        signInWithPassword: jest.fn(),
        signOut: jest.fn(),
      },
      from: jest.fn(),
    })
  })

  it('resolves without error on success', async () => {
    const mocks = getAuthMocks()
    mocks.signOut.mockResolvedValue({ error: null })
    await expect(signOut()).resolves.toBeUndefined()
  })

  it('throws a readable error on failure', async () => {
    const mocks = getAuthMocks()
    mocks.signOut.mockResolvedValue({ error: { message: 'Network error' } })
    await expect(signOut()).rejects.toThrow(/Network error/i)
  })
})

describe('getCurrentUser', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getSupabaseClient as jest.Mock).mockReturnValue({
      auth: {
        getSession: jest.fn(),
        signInWithPassword: jest.fn(),
        signOut: jest.fn(),
      },
      from: jest.fn(),
    })
  })

  it('returns null when there is no active session', async () => {
    const mocks = getAuthMocks()
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null })
    const user = await getCurrentUser()
    expect(user).toBeNull()
  })

  it('returns an AuthUser when a session exists', async () => {
    const mocks = getAuthMocks()
    mocks.getSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-abc', email: 'user@example.com', user_metadata: {} },
        },
      },
      error: null,
    })
    mocks.from.mockReturnValue(buildDbChain({ data: mockUserRow, error: null }))

    const user = await getCurrentUser()
    expect(user).not.toBeNull()
    expect(user?.id).toBe('user-abc')
  })

  it('returns null when getSession returns an error', async () => {
    const mocks = getAuthMocks()
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: { message: 'fail' } })
    const user = await getCurrentUser()
    expect(user).toBeNull()
  })
})
