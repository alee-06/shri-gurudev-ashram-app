jest.mock('../services/razorpay', () => ({
  razorpay: { orders: { create: jest.fn() } },
}))

jest.mock('../models/donation', () => ({
  Donation: { findById: jest.fn() },
}))

import { createDonationOrder } from '../controllers/donations'
import { razorpay } from '../services/razorpay'
import { Donation } from '../models/donation'

describe('donation order idempotency', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret'
    jest.clearAllMocks()
  })

  it('reuses an existing Razorpay order on the second call', async () => {
    const donation: any = {
      _id: '507f1f77bcf86cd799439011',
      amount: 100,
      status: 'PENDING',
      user: null,
      razorpayOrderId: undefined,
      save: jest.fn(),
    }
    ;(Donation.findById as jest.Mock).mockImplementation(async () => donation)
    ;(razorpay.orders.create as jest.Mock).mockResolvedValue({ id: 'order_test_1', amount: 10000, currency: 'INR' })
    const response = { json: jest.fn() } as any
    const next = jest.fn()

    await createDonationOrder({ body: { donationId: donation._id }, headers: {} } as any, response, next)
    await createDonationOrder({ body: { donationId: donation._id }, headers: {} } as any, response, next)

    expect(razorpay.orders.create).toHaveBeenCalledTimes(1)
    expect(response.json).toHaveBeenCalledTimes(2)
    expect(response.json.mock.calls[1][0].razorpayOrderId).toBe('order_test_1')
    expect(next).not.toHaveBeenCalled()
  })
})
