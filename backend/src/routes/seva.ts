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

sevaRouter.get('/pricing', async (_request, response, next) => {
  try {
    const annadanAmount = Number(process.env.ANNADAN_SEVA_PRICE ?? 2100)
    const yajmanAmount = Number(process.env.YAJMAN_SEVA_PRICE ?? 5100)

    response.json({
      success: true,
      pricing: {
        annadan: annadanAmount,
        yajman: yajmanAmount,
      },
    })
  } catch (error) {
    next(error)
  }
})

sevaRouter.get('/availability', async (request, response, next) => {
  try {
    const type = ((request.query.type as string) || '').toLowerCase()
    const month = request.query.month as string // e.g. "2026-07"

    if (!type || (type !== 'annadan' && type !== 'yajman')) {
      throw new HttpError(400, 'type query parameter is required (annadan or yajman)')
    }

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      throw new HttpError(400, 'month query parameter is required (format YYYY-MM)')
    }

    const [yearStr, monthStr] = month.split('-')
    const year = Number(yearStr)
    const monthNum = Number(monthStr)
    const startDate = `${month}-01`
    const lastDayNum = new Date(year, monthNum, 0).getDate()
    const endDate = `${month}-${String(lastDayNum).padStart(2, '0')}`

    const { data: bookings, error } = await supabaseAdmin
      .from('seva_bookings')
      .select('seva_date, status')
      .eq('seva_type', type)
      .gte('seva_date', startDate)
      .lte('seva_date', endDate)
      .in('status', ['paid', 'payment_pending'])

    if (error) {
      console.error('Error fetching monthly availability:', error)
      throw new HttpError(500, 'Failed to fetch monthly availability')
    }

    const countsByDate: Record<string, number> = {}
    if (bookings) {
      for (const b of bookings) {
        if (b.seva_date) {
          countsByDate[b.seva_date] = (countsByDate[b.seva_date] || 0) + 1
        }
      }
    }

    const envCapKey = `SEVA_CAPACITY_${type.toUpperCase()}`
    const defaultCapacity = type === 'annadan' ? 100 : 50
    const capacity = Number(process.env[envCapKey] ?? defaultCapacity)

    const availabilityMap: Record<string, { booked: number; capacity: number; remaining: number; available: boolean }> = {}

    for (let day = 1; day <= lastDayNum; day++) {
      const dateKey = `${month}-${String(day).padStart(2, '0')}`
      const booked = countsByDate[dateKey] || 0
      const remaining = Math.max(0, capacity - booked)
      availabilityMap[dateKey] = {
        booked,
        capacity,
        remaining,
        available: remaining > 0,
      }
    }

    response.json({
      success: true,
      type,
      month,
      availability: availabilityMap,
    })
  } catch (error) {
    next(error)
  }
})

sevaRouter.get('/:type/availability', async (request, response, next) => {
  try {
    const type = request.params.type
    const month = request.query.month as string
    const date = request.query.date as string

    const envCapKey = `SEVA_CAPACITY_${type.toUpperCase()}`
    const defaultCapacity = type === 'annadan' ? 100 : 50
    const capacity = Number(process.env[envCapKey] ?? defaultCapacity)

    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [yearStr, monthStr] = month.split('-')
      const year = Number(yearStr)
      const monthNum = Number(monthStr)
      const startDate = `${month}-01`
      const lastDayNum = new Date(year, monthNum, 0).getDate()
      const endDate = `${month}-${String(lastDayNum).padStart(2, '0')}`

      const { data: bookings, error } = await supabaseAdmin
        .from('seva_bookings')
        .select('seva_date, status')
        .eq('seva_type', type)
        .gte('seva_date', startDate)
        .lte('seva_date', endDate)
        .in('status', ['paid', 'payment_pending'])

      if (error) {
        console.error('Error fetching monthly availability:', error)
        throw new HttpError(500, 'Failed to fetch monthly availability')
      }

      const countsByDate: Record<string, number> = {}
      if (bookings) {
        for (const b of bookings) {
          if (b.seva_date) {
            countsByDate[b.seva_date] = (countsByDate[b.seva_date] || 0) + 1
          }
        }
      }

      const availabilityMap: Record<string, { booked: number; capacity: number; remaining: number; available: boolean }> = {}

      for (let day = 1; day <= lastDayNum; day++) {
        const dateKey = `${month}-${String(day).padStart(2, '0')}`
        const booked = countsByDate[dateKey] || 0
        const remaining = Math.max(0, capacity - booked)
        availabilityMap[dateKey] = {
          booked,
          capacity,
          remaining,
          available: remaining > 0,
        }
      }

      response.json({
        success: true,
        type,
        month,
        availability: availabilityMap,
      })
      return
    }

    if (!date) {
      throw new HttpError(400, 'Date or month parameter is required')
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

    const availableSeats = capacity - (count || 0)

    response.json({
      available: availableSeats > 0,
      remainingSeats: Math.max(0, availableSeats)
    })
  } catch (error) {
    next(error)
  }
})
