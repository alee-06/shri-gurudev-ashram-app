/**
 * Smoke tests — Payment Verification (payment critical path)
 * Mocks the Axios client to verify that:
 * - createRazorpayOrder posts to the correct endpoint
 * - verifyRazorpayPayment posts to the correct endpoint
 * - Error messages are mapped to human-readable strings
 */

// ── Mock Axios client (jest.mock is hoisted; use only jest.fn() inside) ───────
jest.mock('../api/axiosClient', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
  },
}))

import api from '../api/axiosClient'
import { AxiosError } from 'axios'
import { createRazorpayOrder, verifyRazorpayPayment } from '../services/payments'

const mockPost = api.post as jest.Mock

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

// ── Fixtures ──────────────────────────────────────────────────────────────────
const mockOrderResponse = {
  order: { id: 'order_123', amount: 1200000, currency: 'INR' },
  booking: { id: 'booking-xyz' },
}

const verifyInput = {
  bookingId: 'booking-xyz',
  razorpay_order_id: 'order_123',
  razorpay_payment_id: 'pay_abc',
  razorpay_signature: 'sig_xyz',
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('createRazorpayOrder', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns order and booking data on success', async () => {
    mockPost.mockResolvedValue({ data: mockOrderResponse })

    const result = await createRazorpayOrder('booking-xyz')
    expect(result.order.id).toBe('order_123')
    expect(result.order.amount).toBe(1200000)
    expect(result.order.currency).toBe('INR')
  })

  it('posts to /api/payments/create-order with the booking id', async () => {
    mockPost.mockResolvedValue({ data: mockOrderResponse })

    await createRazorpayOrder('booking-xyz')
    expect(mockPost).toHaveBeenCalledWith('/api/payments/create-order', { bookingId: 'booking-xyz' })
  })

  it('throws readable error when booking is already paid', async () => {
    mockPost.mockRejectedValue(makeAxiosError('Booking is already paid'))

    await expect(createRazorpayOrder('booking-xyz')).rejects.toThrow(
      /already paid/i,
    )
  })

  it('throws readable error when not enough seats available', async () => {
    mockPost.mockRejectedValue(makeAxiosError('Not enough seats available'))

    await expect(createRazorpayOrder('booking-xyz')).rejects.toThrow(
      /not enough seats/i,
    )
  })

  it('throws fallback error on unexpected failure', async () => {
    mockPost.mockRejectedValue(new Error('timeout'))

    await expect(createRazorpayOrder('booking-xyz')).rejects.toThrow(
      /Could not prepare payment/i,
    )
  })
})

describe('verifyRazorpayPayment', () => {
  beforeEach(() => jest.clearAllMocks())

  it('resolves without error on successful verification', async () => {
    mockPost.mockResolvedValue({ data: {} })

    await expect(verifyRazorpayPayment(verifyInput)).resolves.toBeUndefined()
  })

  it('posts to /api/payments/verify with all four required fields', async () => {
    mockPost.mockResolvedValue({ data: {} })

    await verifyRazorpayPayment(verifyInput)

    expect(mockPost).toHaveBeenCalledWith('/api/payments/verify', verifyInput)
    const [, payload] = mockPost.mock.calls[0]
    expect(payload).toHaveProperty('razorpay_order_id')
    expect(payload).toHaveProperty('razorpay_payment_id')
    expect(payload).toHaveProperty('razorpay_signature')
  })

  it('throws readable error on invalid signature', async () => {
    mockPost.mockRejectedValue(makeAxiosError('Invalid Razorpay signature'))

    await expect(verifyRazorpayPayment(verifyInput)).rejects.toThrow(
      /signature was invalid/i,
    )
  })

  it('throws readable error when payment already processed', async () => {
    mockPost.mockRejectedValue(makeAxiosError('Razorpay payment has already been processed'))

    await expect(verifyRazorpayPayment(verifyInput)).rejects.toThrow(
      /already been processed/i,
    )
  })

  it('throws fallback error on network failure', async () => {
    mockPost.mockRejectedValue(new Error('Network error'))

    await expect(verifyRazorpayPayment(verifyInput)).rejects.toThrow(
      /Payment failed/i,
    )
  })
})
