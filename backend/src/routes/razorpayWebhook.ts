import crypto from 'crypto'
import { Router } from 'express'
import { HttpError } from '../errors'
import { razorpayWebhookSecret } from '../services/razorpay'
import { supabaseAdmin } from '../services/supabaseAdmin'
import { Donation } from '../models/donation'
import { generateReceipt, publicReceiptUrl } from '../services/donationReceipt'

export const razorpayWebhookRouter = Router()

razorpayWebhookRouter.post('/', async (request, response, next) => {
  try {
    const signature = request.headers['x-razorpay-signature']
    const eventId = request.headers['x-razorpay-event-id']
    const rawBody = Buffer.isBuffer(request.body) ? request.body : Buffer.from(JSON.stringify(request.body))

    if (typeof signature !== 'string') {
      throw new HttpError(400, 'Missing Razorpay webhook signature')
    }

    if (!isValidWebhookSignature(rawBody, signature)) {
      throw new HttpError(400, 'Invalid Razorpay webhook signature')
    }

    if (typeof eventId !== 'string') {
      throw new HttpError(400, 'Missing Razorpay webhook event id')
    }

    const { error: eventError } = await supabaseAdmin
      .from('razorpay_webhook_events')
      .insert({ event_id: eventId })

    if (eventError?.code === '23505') {
      response.json({ received: true, duplicate: true })
      return
    }

    if (eventError) {
      throw new HttpError(500, eventError.message)
    }

    const payload = JSON.parse(rawBody.toString('utf8'))

    // The merged server shares Razorpay's public webhook URL. Dispatch donation
    // orders before the travel Supabase event ledger, while retaining the same
    // raw-body signature validation and idempotent state transition.
    const donationOrderId = payload.payload?.payment?.entity?.order_id
    if (donationOrderId) {
      const donation = await Donation.findOne({ razorpayOrderId: donationOrderId })
      if (donation) {
        const payment = payload.payload.payment.entity
        if (payload.event === 'payment.captured' && donation.status === 'PENDING') {
          donation.status = 'SUCCESS'
          donation.paymentId = payment.id
          donation.transactionRef = payment.id
          donation.receiptNumber = `GRD-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`
          const filePath = await generateReceipt(donation)
          donation.receiptUrl = publicReceiptUrl(filePath)
          await donation.save()
        } else if (payload.event === 'payment.failed' && donation.status !== 'SUCCESS' && donation.status !== 'FAILED') {
          donation.status = 'FAILED'
          donation.transactionRef = payment.id ?? null
          donation.failureReason = payment.error_description ?? payment.error_reason ?? 'Payment failed'
          await donation.save()
        }
        response.json({ received: true, donation: true })
        return
      }
    }

    if (payload.event === 'payment.captured') {
      await reconcileCapturedPayment(payload.payload?.payment?.entity)
    }

    if (payload.event === 'payment.failed') {
      await reconcileFailedPayment(payload.payload?.payment?.entity)
    }

    response.json({ received: true })
  } catch (error) {
    next(error)
  }
})

function isValidWebhookSignature(rawBody: Buffer, signature: string) {
  const expectedSignature = crypto
    .createHmac('sha256', razorpayWebhookSecret)
    .update(rawBody)
    .digest('hex')

  return expectedSignature.length === signature.length && crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature))
}

async function reconcileCapturedPayment(payment: any) {
  if (!payment?.id || !payment?.order_id) {
    return
  }

  const { data: existingPayment, error: paymentError } = await supabaseAdmin
    .from('payments')
    .select('*')
    .eq('razorpay_order_id', payment.order_id)
    .maybeSingle()

  if (paymentError || !existingPayment) {
    throw new HttpError(404, paymentError?.message ?? 'Payment record not found for Razorpay order')
  }

  if (existingPayment.status === 'captured') {
    return
  }

  const { data: booking, error: bookingError } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('id', existingPayment.booking_id)
    .single()

  if (bookingError || !booking) {
    throw new HttpError(404, bookingError?.message ?? 'Booking not found for payment')
  }

  const { error: captureError } = await supabaseAdmin.rpc('capture_booking_payment' as never, {
    p_booking_id: booking.id,
    p_razorpay_order_id: payment.order_id,
    p_razorpay_payment_id: payment.id,
    p_razorpay_signature: existingPayment.razorpay_signature,
    p_payment_method: payment.method ?? existingPayment.payment_method,
    p_gateway_fee: payment.fee ? Number(payment.fee) / 100 : existingPayment.gateway_fee,
  } as never)

  if (captureError) {
    throw new HttpError(500, captureError.message)
  }
}

async function reconcileFailedPayment(payment: any) {
  if (!payment?.order_id) {
    return
  }

  const { error } = await supabaseAdmin
    .from('payments')
    .update({
      razorpay_payment_id: payment.id ?? null,
      payment_method: payment.method ?? 'razorpay',
      status: 'failed',
    })
    .eq('razorpay_order_id', payment.order_id)
    .neq('status', 'captured')

  if (error) {
    throw new HttpError(500, error.message)
  }
}
