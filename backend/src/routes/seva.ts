import { Router } from 'express'
import { HttpError } from '../errors'
import { AuthenticatedRequest, requireAuth } from '../middleware/auth'
import { supabaseAdmin } from '../services/supabaseAdmin'
import crypto from 'crypto'

export const sevaRouter = Router()

// Common Seva Types from frontend
type SevaType = 'annadan' | 'yajman' | 'gau_seva' | 'temple_seva' | 'special_pooja' | 'event'

function generateSevaReference(type: SevaType): string {
  const prefix = type === 'annadan' ? 'ANN' : type === 'yajman' ? 'YAJ' : 'SEV'
  const random = crypto.randomBytes(3).toString('hex').toUpperCase()
  return `${prefix}-${random}`
}

sevaRouter.post('/', requireAuth, async (request, response, next) => {
  try {
    const {
      sevaType,
      sevaDate,
      fullName,
      phoneNumber,
      totalAmount,
      notes,
    } = request.body

    if (!sevaType || !sevaDate || !fullName || !phoneNumber || !totalAmount) {
      throw new HttpError(400, 'Missing required seva fields')
    }

    const numericAmount = Number(totalAmount)
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      throw new HttpError(400, 'Invalid total amount')
    }

    const bookingReference = generateSevaReference(sevaType as SevaType)
    const userId = (request as AuthenticatedRequest).userId

    const { data, error } = await supabaseAdmin
      .from('seva_bookings')
      .insert({
        booking_reference: bookingReference,
        user_id: userId,
        seva_type: sevaType,
        seva_date: sevaDate,
        full_name: fullName,
        phone_number: phoneNumber,
        total_amount: numericAmount,
        status: 'payment_pending',
        notes: notes ?? null,
      })
      .select()
      .single()

    if (error || !data) {
      console.error('Error creating seva booking:', error)
      throw new HttpError(500, 'Failed to create seva booking')
    }

    // Convert keys from snake_case to camelCase to match frontend expectations
    response.status(201).json({
      success: true,
      data: {
        id: data.id,
        bookingReference: data.booking_reference,
        userId: data.user_id,
        sevaType: data.seva_type,
        sevaDate: data.seva_date,
        fullName: data.full_name,
        phoneNumber: data.phone_number,
        totalAmount: data.total_amount,
        status: data.status,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    })
  } catch (error) {
    next(error)
  }
})

sevaRouter.get('/upcoming', requireAuth, async (request, response, next) => {
  try {
    const userId = (request as AuthenticatedRequest).userId
    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabaseAdmin
      .from('seva_bookings')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['paid', 'payment_pending'])
      .gte('seva_date', today)
      .order('seva_date', { ascending: true })

    if (error) {
      console.error('Error fetching upcoming sevas:', error)
      throw new HttpError(500, 'Failed to fetch upcoming sevas')
    }

    const formattedData = (data || []).map(b => ({
      id: b.id,
      bookingReference: b.booking_reference,
      userId: b.user_id,
      sevaType: b.seva_type,
      sevaDate: b.seva_date,
      fullName: b.full_name,
      phoneNumber: b.phone_number,
      totalAmount: b.total_amount,
      status: b.status,
      createdAt: b.created_at,
      updatedAt: b.updated_at,
    }))

    response.json(formattedData)
  } catch (error) {
    next(error)
  }
})

sevaRouter.get('/history', requireAuth, async (request, response, next) => {
  try {
    const userId = (request as AuthenticatedRequest).userId

    const { data, error } = await supabaseAdmin
      .from('seva_bookings')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching seva history:', error)
      throw new HttpError(500, 'Failed to fetch seva history')
    }

    const formattedData = (data || []).map(b => ({
      id: b.id,
      bookingReference: b.booking_reference,
      userId: b.user_id,
      sevaType: b.seva_type,
      sevaDate: b.seva_date,
      fullName: b.full_name,
      phoneNumber: b.phone_number,
      totalAmount: b.total_amount,
      status: b.status,
      createdAt: b.created_at,
      updatedAt: b.updated_at,
    }))

    response.json(formattedData)
  } catch (error) {
    next(error)
  }
})

sevaRouter.get('/:type/availability', async (request, response, next) => {
  try {
    // For now, always return available. Real implementation could check capacity limits
    // in the seva_bookings table.
    const type = request.params.type
    const date = request.query.date as string

    if (!date) {
      throw new HttpError(400, 'Date parameter is required')
    }

    const { count, error } = await supabaseAdmin
      .from('seva_bookings')
      .select('*', { count: 'exact', head: true })
      .eq('seva_type', type)
      .eq('seva_date', date)
      .in('status', ['paid', 'payment_pending'])

    if (error) {
      console.error('Error fetching availability:', error)
      throw new HttpError(500, 'Failed to check availability')
    }

    const MAX_CAPACITY = type === 'annadan' ? 100 : 50
    const availableSeats = MAX_CAPACITY - (count || 0)

    response.json({
      available: availableSeats > 0,
      remainingSeats: Math.max(0, availableSeats)
    })
  } catch (error) {
    next(error)
  }
})
