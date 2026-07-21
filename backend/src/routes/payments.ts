import crypto from 'crypto'
import { Router } from 'express'
import { HttpError } from '../errors'
import { AuthenticatedRequest, requireAuth } from '../middleware/auth'
import { razorpay, razorpayKeySecret } from '../services/razorpay'
import { supabaseAdmin } from '../services/supabaseAdmin'

export const paymentsRouter = Router()

type CreateOrderBody = {
  bookingId?: string
}

type VerifyPaymentBody = {
  bookingId?: string
  razorpay_order_id?: string
  razorpay_payment_id?: string
  razorpay_signature?: string
}

paymentsRouter.post('/create-order', requireAuth, async (request, response, next) => {
  try {
    const { bookingId } = request.body as CreateOrderBody

    if (!bookingId || typeof bookingId !== 'string' || !bookingId.trim()) {
      throw new HttpError(400, 'bookingId is required')
    }

    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
    if (!uuidRegex.test(bookingId)) {
      throw new HttpError(400, 'Invalid bookingId format (must be a valid UUID)')
    }

    const booking = await loadBooking(bookingId)
    assertBookingOwner(booking.user_id, (request as AuthenticatedRequest).userId)

    if (booking.status !== 'payment_pending') {
      throw new HttpError(400, 'Booking is not pending payment')
    }

    const travelPackage = await loadPackage(booking.package_id)

    if (!travelPackage.is_active) {
      throw new HttpError(400, 'Travel package is not active')
    }

    if (travelPackage.remaining_seats < booking.traveler_count) {
      throw new HttpError(400, 'Not enough seats available')
    }

    const baseAmount = Number(booking.total_amount)
    if (!Number.isFinite(baseAmount) || baseAmount <= 0) {
      throw new HttpError(400, 'Invalid booking amount')
    }
    const convenienceFee = Math.round(baseAmount * 0.02) // 2% convenience fee
    const amount = baseAmount + convenienceFee
    const amountInPaise = Math.round(amount * 100)

    const { data: existingPayment, error: existingError } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('booking_id', bookingId)
      .maybeSingle()

    if (existingError) {
      throw new HttpError(500, existingError.message)
    }

    if (existingPayment?.status === 'captured') {
      throw new HttpError(409, 'Booking is already paid')
    }

    if (existingPayment?.status === 'created' && existingPayment.razorpay_order_id) {
      // If amount has changed due to some reason (e.g., fee change), we technically should recreate the order, 
      // but assuming fixed 2% fee, it matches.
      response.json({
        order: {
          id: existingPayment.razorpay_order_id,
          amount: amountInPaise,
          currency: 'INR',
        },
        booking,
      })
      return
    }

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: booking.booking_reference,
      notes: {
        bookingId,
      },
    })

    const paymentPayload = {
      booking_id: bookingId,
      amount,
      payment_method: 'razorpay',
      razorpay_order_id: order.id,
      status: 'created',
      gateway_fee: convenienceFee,
    }

    const paymentQuery = existingPayment
      ? supabaseAdmin.from('payments').update(paymentPayload).eq('id', existingPayment.id)
      : supabaseAdmin.from('payments').insert(paymentPayload)

    const { error: paymentError } = await paymentQuery

    if (paymentError) {
      throw new HttpError(500, paymentError.message)
    }

    response.json({ order, booking })
  } catch (error) {
    next(error)
  }
})

paymentsRouter.post('/verify', requireAuth, async (request, response, next) => {
  try {
    const { bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = request.body as VerifyPaymentBody

    if (!bookingId || typeof bookingId !== 'string' || !bookingId.trim()) {
      throw new HttpError(400, 'bookingId is required')
    }

    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
    if (!uuidRegex.test(bookingId)) {
      throw new HttpError(400, 'Invalid bookingId format (must be a valid UUID)')
    }

    if (!razorpay_order_id || typeof razorpay_order_id !== 'string' || !razorpay_order_id.trim()) {
      throw new HttpError(400, 'razorpay_order_id is required')
    }

    if (!razorpay_payment_id || typeof razorpay_payment_id !== 'string' || !razorpay_payment_id.trim()) {
      throw new HttpError(400, 'razorpay_payment_id is required')
    }

    if (!razorpay_signature || typeof razorpay_signature !== 'string' || !razorpay_signature.trim()) {
      throw new HttpError(400, 'razorpay_signature is required')
    }

    if (!isValidPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
      throw new HttpError(400, 'Invalid Razorpay signature')
    }

    const booking = await loadBooking(bookingId)
    assertBookingOwner(booking.user_id, (request as AuthenticatedRequest).userId)

    if (booking.status === 'paid') {
      throw new HttpError(409, 'Booking is already paid')
    }

    const { data: existingPayment, error: existingPaymentError } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('booking_id', bookingId)
      .maybeSingle()

    if (existingPaymentError) {
      throw new HttpError(500, existingPaymentError.message)
    }

    if (!existingPayment || existingPayment.razorpay_order_id !== razorpay_order_id) {
      throw new HttpError(400, 'Razorpay order does not match this booking')
    }

    if (existingPayment.status === 'captured') {
      throw new HttpError(409, 'Booking is already paid')
    }

    const { data: duplicatePayment, error: duplicateError } = await supabaseAdmin
      .from('payments')
      .select('id')
      .eq('razorpay_payment_id', razorpay_payment_id)
      .maybeSingle()

    if (duplicateError) {
      throw new HttpError(500, duplicateError.message)
    }

    if (duplicatePayment) {
      throw new HttpError(409, 'Razorpay payment has already been processed')
    }

    const travelPackage = await loadPackage(booking.package_id)
    const amount = Number(booking.total_amount)

    if (travelPackage.remaining_seats < booking.traveler_count) {
      throw new HttpError(400, 'Not enough seats available')
    }

    await captureBookingPayment({
      bookingId,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      paymentMethod: 'razorpay',
    })

    response.json({ success: true })
  } catch (error) {
    next(error)
  }
})

paymentsRouter.post('/create-seva-order', requireAuth, async (request, response, next) => {
  try {
    const { bookingId } = request.body as CreateOrderBody

    if (!bookingId || typeof bookingId !== 'string' || !bookingId.trim()) {
      throw new HttpError(400, 'bookingId is required')
    }

    const { data: booking, error } = await supabaseAdmin
      .from('seva_bookings')
      .select('*')
      .eq('id', bookingId)
      .single()

    if (error || !booking) {
      throw new HttpError(404, 'Seva booking not found')
    }

    assertBookingOwner(booking.user_id, (request as AuthenticatedRequest).userId)

    if (booking.status !== 'payment_pending') {
      throw new HttpError(400, 'Booking is not pending payment')
    }

    const amountInPaise = Math.round(Number(booking.total_amount) * 100)

    if (booking.razorpay_order_id) {
      response.json({
        order: {
          id: booking.razorpay_order_id,
          amount: amountInPaise,
          currency: 'INR',
        },
        booking,
      })
      return
    }

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: booking.booking_reference,
      notes: {
        sevaBookingId: bookingId,
      },
    })

    const { error: updateError } = await supabaseAdmin
      .from('seva_bookings')
      .update({ razorpay_order_id: order.id })
      .eq('id', bookingId)

    if (updateError) {
      throw new HttpError(500, updateError.message)
    }

    response.json({ order, booking })
  } catch (error) {
    next(error)
  }
})

paymentsRouter.post('/verify-seva', requireAuth, async (request, response, next) => {
  try {
    const { bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = request.body as VerifyPaymentBody

    if (!bookingId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new HttpError(400, 'Missing required payment verification fields')
    }

    if (!isValidPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
      throw new HttpError(400, 'Invalid Razorpay signature')
    }

    const { data: booking, error } = await supabaseAdmin
      .from('seva_bookings')
      .select('*')
      .eq('id', bookingId)
      .single()

    if (error || !booking) {
      throw new HttpError(404, 'Seva booking not found')
    }

    assertBookingOwner(booking.user_id, (request as AuthenticatedRequest).userId)

    if (booking.razorpay_order_id !== razorpay_order_id) {
      throw new HttpError(400, 'Razorpay order does not match this seva booking')
    }

    if (booking.status === 'paid') {
      response.json({ success: true, message: 'Already verified' })
      return
    }

    const { error: updateError } = await supabaseAdmin
      .from('seva_bookings')
      .update({
        status: 'paid',
        razorpay_payment_id,
        razorpay_signature,
      })
      .eq('id', bookingId)

    if (updateError) {
      throw new HttpError(500, updateError.message)
    }

    response.json({ success: true })
  } catch (error) {
    next(error)
  }
})

function isValidPaymentSignature(orderId: string, paymentId: string, signature: string) {
  const expectedSignature = crypto
    .createHmac('sha256', razorpayKeySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex')

  return expectedSignature.length === signature.length && crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature))
}

async function loadBooking(bookingId: string) {
  const { data: booking, error } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single()

  if (error || !booking) {
    throw new HttpError(404, 'Booking not found')
  }

  return booking
}

async function loadPackage(packageId: string) {
  const { data: travelPackage, error } = await supabaseAdmin
    .from('travel_packages')
    .select('id, price, remaining_seats, is_active')
    .eq('id', packageId)
    .single()

  if (error || !travelPackage) {
    throw new HttpError(404, 'Travel package not found')
  }

  return travelPackage
}


function assertBookingOwner(bookingUserId: string, requestUserId: string) {
  if (bookingUserId !== requestUserId) {
    throw new HttpError(403, 'Booking does not belong to the authenticated user')
  }
}

async function captureBookingPayment(input: {
  bookingId: string
  razorpayOrderId: string
  razorpayPaymentId: string
  razorpaySignature?: string | null
  paymentMethod?: string | null
  gatewayFee?: number | null
}) {
  const { error } = await supabaseAdmin.rpc('capture_booking_payment' as never, {
    p_booking_id: input.bookingId,
    p_razorpay_order_id: input.razorpayOrderId,
    p_razorpay_payment_id: input.razorpayPaymentId,
    p_razorpay_signature: input.razorpaySignature ?? null,
    p_payment_method: input.paymentMethod ?? 'razorpay',
    p_gateway_fee: input.gatewayFee ?? null,
  } as never)

  if (error) {
    throw new HttpError(500, error.message)
  }
}
