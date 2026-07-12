/**
 * Smoke tests — Booking Creation (booking creation critical path)
 * Mocks the Axios client so tests don't hit the backend.
 */

// ── Mock Supabase & Axios (both import chains need to be cut) ─────────────────
jest.mock('../lib/supabase', () => ({
  getSupabaseClient: jest.fn(),
}))

jest.mock('../api/axiosClient', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
  },
}))

import api from '../api/axiosClient'
import { AxiosError } from 'axios'
import { createBooking, getBookingById } from '../services/bookings'
import type { CreateBookingInput } from '../types/travel'

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeAxiosError(message: string, status = 400): AxiosError {
  const err = new AxiosError(message)
  err.response = {
    status,
    statusText: 'Bad Request',
    headers: {},
    config: {} as any,
    data: { error: message },
  }
  return err
}

const mockPost = api.post as jest.Mock
const mockGet = api.get as jest.Mock

// ── Fixtures ──────────────────────────────────────────────────────────────────
const validInput: CreateBookingInput = {
  packageId: 'pkg-haridwar-2024',
  travelerCount: 2,
  fullName: 'Ramesh Kumar',
  phoneNumber: '9876543210',
  whatsappNumber: '9876543210',
  dob: '1985-06-15',
  address: 'Pune, Maharashtra',
  transportType: 'Bus',
  busType: 'AC',
  roomType: 'Double',
}

const mockBookingRow = {
  id: 'booking-xyz',
  booking_reference: 'BK-2024-001',
  package_id: 'pkg-haridwar-2024',
  user_id: 'user-abc',
  traveler_count: 2,
  special_notes: null,
  total_amount: 12000,
  status: 'payment_pending',
  created_at: '2024-05-01T10:00:00Z',
  full_name: 'Ramesh Kumar',
  phone_number: '9876543210',
  transport_type: 'Bus',
  room_type: 'Double',
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('createBooking', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns a Booking object on success', async () => {
    mockPost.mockResolvedValue({ data: { booking: mockBookingRow } })

    const booking = await createBooking(validInput)

    expect(booking.id).toBe('booking-xyz')
    expect(booking.bookingReference).toBe('BK-2024-001')
    expect(booking.status).toBe('payment_pending')
    expect(booking.totalAmount).toBe(12000)
    expect(booking.travelerCount).toBe(2)
  })

  it('posts to the /api/bookings endpoint', async () => {
    mockPost.mockResolvedValue({ data: { booking: mockBookingRow } })

    await createBooking(validInput)

    expect(mockPost).toHaveBeenCalledWith('/api/bookings', validInput)
  })

  it('throws a human-readable error on identity verification failure', async () => {
    mockPost.mockRejectedValue(
      makeAxiosError('Identity verification must be completed before booking'),
    )

    await expect(createBooking(validInput)).rejects.toThrow(
      /verify your identity before booking/i,
    )
  })

  it('throws a human-readable error on seat unavailability', async () => {
    mockPost.mockRejectedValue(makeAxiosError('Not enough seats available'))

    await expect(createBooking(validInput)).rejects.toThrow(
      /not enough seats/i,
    )
  })

  it('throws a fallback error on unexpected failure', async () => {
    mockPost.mockRejectedValue(new Error('Network error'))

    await expect(createBooking(validInput)).rejects.toThrow(
      /Could not create booking/i,
    )
  })
})

describe('getBookingById', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns a Booking object on success', async () => {
    mockGet.mockResolvedValue({ data: { booking: mockBookingRow } })

    const booking = await getBookingById('booking-xyz')
    expect(booking.id).toBe('booking-xyz')
    expect(booking.bookingReference).toBe('BK-2024-001')
  })

  it('calls the correct endpoint', async () => {
    mockGet.mockResolvedValue({ data: { booking: mockBookingRow } })

    await getBookingById('booking-xyz')
    expect(mockGet).toHaveBeenCalledWith('/api/bookings/booking-xyz')
  })

  it('throws a readable error on network failure', async () => {
    mockGet.mockRejectedValue(new Error('timeout'))

    await expect(getBookingById('bad-id')).rejects.toThrow(
      /Could not load booking details/i,
    )
  })
})
