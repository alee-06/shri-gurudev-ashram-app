import { Router } from 'express'
import { HttpError } from '../errors'
import { AuthenticatedRequest, requireAuth } from '../middleware/auth'
import { supabaseAdmin } from '../services/supabaseAdmin'

export const bookingsRouter = Router()

type CreateBookingPassengerInput = {
  fullName: string
  dob: string
  gender: string
  phone: string
  address: string
  aadhaarNumber: string
  aadhaarImagePath?: string
  selfieImagePath?: string
}

type CreateBookingBody = {
  packageId?: string
  travelerCount?: number
  specialNotes?: string
  transportType?: string
  busType?: string
  roomType?: string
  passengers?: CreateBookingPassengerInput[]
}

bookingsRouter.post('/', requireAuth, async (request, response, next) => {
  try {
    const {
      packageId,
      travelerCount,
      specialNotes,
      transportType,
      busType,
      roomType,
      passengers,
    } = request.body as CreateBookingBody

    // 1. Required fields and empty value checks
    if (!packageId || typeof packageId !== 'string' || !packageId.trim()) {
      throw new HttpError(400, 'packageId is required and cannot be empty')
    }

    if (travelerCount === undefined || typeof travelerCount !== 'number' || !Number.isInteger(travelerCount) || travelerCount < 1 || travelerCount > 20) {
      throw new HttpError(400, 'travelerCount must be a positive integer between 1 and 20')
    }

    if (!Array.isArray(passengers) || passengers.length !== travelerCount) {
      throw new HttpError(400, 'passengers array must be provided and its length must match travelerCount')
    }

    if (!transportType || typeof transportType !== 'string' || !transportType.trim()) {
      throw new HttpError(400, 'transportType is required and cannot be empty')
    }

    if (!roomType || typeof roomType !== 'string' || !roomType.trim()) {
      throw new HttpError(400, 'roomType is required and cannot be empty')
    }

    // 2. Validate passengers
    const phoneRegex = /^\d{10}$/
    const aadhaarRegex = /^\d{12}$/
    const today = new Date()

    for (let i = 0; i < passengers.length; i++) {
      const p = passengers[i]
      if (!p.fullName || typeof p.fullName !== 'string' || !p.fullName.trim()) {
        throw new HttpError(400, `Passenger ${i + 1}: fullName is required`)
      }
      if (!p.phone || typeof p.phone !== 'string' || !phoneRegex.test(p.phone)) {
        throw new HttpError(400, `Passenger ${i + 1}: phone must be a valid 10-digit number`)
      }
      if (!p.dob || typeof p.dob !== 'string' || !p.dob.trim()) {
        throw new HttpError(400, `Passenger ${i + 1}: dob is required`)
      }
      if (!p.address || typeof p.address !== 'string' || !p.address.trim()) {
        throw new HttpError(400, `Passenger ${i + 1}: address is required`)
      }
      if (!p.gender || !['male', 'female', 'other'].includes(p.gender)) {
        throw new HttpError(400, `Passenger ${i + 1}: gender must be male, female, or other`)
      }
      if (!p.aadhaarNumber || typeof p.aadhaarNumber !== 'string' || !aadhaarRegex.test(p.aadhaarNumber)) {
        throw new HttpError(400, `Passenger ${i + 1}: aadhaarNumber must be a valid 12-digit number`)
      }

      const birthDate = new Date(p.dob)
      if (Number.isNaN(birthDate.getTime())) {
        throw new HttpError(400, `Passenger ${i + 1}: dob must be a valid date`)
      }

      let calculatedAge = today.getFullYear() - birthDate.getFullYear()
      const monthDelta = today.getMonth() - birthDate.getMonth()
      if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge -= 1
      }
      if (calculatedAge < 0 || calculatedAge > 120) {
        throw new HttpError(400, `Passenger ${i + 1}: dob corresponds to an invalid age`)
      }
    }

    // 3. Validate transport options and constraints
    if (transportType !== 'Flight' && transportType !== 'Train') {
      throw new HttpError(400, "transportType must be either 'Flight' or 'Train'")
    }

    if (transportType === 'Train') {
      if (!busType || (busType !== 'AC Train' && busType !== 'Non-AC Train')) {
        throw new HttpError(400, "busType is required when transportType is 'Train', and must be 'AC Train' or 'Non-AC Train'")
      }
    }

    if (roomType !== 'AC Room' && roomType !== 'Non-AC Room') {
      throw new HttpError(400, "roomType must be either 'AC Room' or 'Non-AC Room'")
    }

    // 4. Package information validation
    const { data: travelPackage, error: packageError } = await supabaseAdmin
      .from('travel_packages')
      .select('id, price, is_active, remaining_seats')
      .eq('id', packageId)
      .single()

    if (packageError || !travelPackage) {
      throw new HttpError(404, 'Travel package not found')
    }

    if (!travelPackage.is_active) {
      throw new HttpError(400, 'Travel package is not active')
    }

    if (travelPackage.remaining_seats < travelerCount) {
      throw new HttpError(400, 'Not enough seats available')
    }

    const { getYatraPrice } = require('../utils/yatraPricing')

    const preferencePrice = getYatraPrice(transportType, roomType, busType)
    const expectedAmount = preferencePrice.amount * travelerCount
    const actualAmount = Number(travelPackage.price) * travelerCount // Or whatever they pass, but we use preferencePrice

    const totalAmount = expectedAmount

    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      throw new HttpError(400, 'Travel package has an invalid price')
    }

    const bookingReference = `BK${Date.now()}${Math.floor(Math.random() * 1000)}`
    const authRequest = request as AuthenticatedRequest

    // 5. Document validation and User Profile

    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('verification_status, aadhaar_number, aadhaar_image_path, selfie_image_path')
      .eq('id', authRequest.userId)
      .maybeSingle()

    if (profileError) {
      throw new HttpError(500, 'Failed to load user profile')
    }

    const isLeadVerified = userProfile && ['submitted', 'verified'].includes(userProfile.verification_status)

    // Validate document paths
    for (let i = 0; i < passengers.length; i++) {
      const p = passengers[i]
      if (i === 0 && isLeadVerified) {
        // Skip validation, we will attach user profile documents
        continue
      }
      if (!p.aadhaarImagePath || !p.aadhaarImagePath.trim()) {
        throw new HttpError(400, `Passenger ${i + 1}: Aadhaar document image is required`)
      }
      if (!p.selfieImagePath || !p.selfieImagePath.trim()) {
        throw new HttpError(400, `Passenger ${i + 1}: Selfie document image is required`)
      }
    }

    const leadPassenger = passengers[0]
    
    // 6. Application-Layer Transaction
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .insert({
        user_id: authRequest.userId,
        package_id: packageId,
        status: 'payment_pending',
        total_amount: totalAmount,
        traveler_count: travelerCount,
        special_notes: specialNotes?.trim() || null,
        booking_reference: bookingReference,
        full_name: leadPassenger.fullName.trim(),
        phone_number: leadPassenger.phone.trim(),
        whatsapp_number: leadPassenger.phone.trim(),
        dob: new Date(leadPassenger.dob).toISOString(),
        address: leadPassenger.address.trim(),
        transport_type: transportType,
        bus_type: transportType === 'Train' ? busType : null,
        room_type: roomType,
      })
      .select('*')
      .single()

    if (bookingError || !booking) {
      throw new HttpError(500, bookingError?.message ?? 'Failed to create booking')
    }

    try {
      // 6a. Batch Insert Passengers
      const passengersToInsert = passengers.map((p, index) => ({
        booking_id: booking.id,
        passenger_index: index,
        is_primary: index === 0,
        full_name: p.fullName.trim(),
        dob: new Date(p.dob).toISOString(),
        gender: p.gender,
        phone: p.phone.trim(),
        address: p.address.trim(),
        aadhaar_number: p.aadhaarNumber,
        verification_status: (index === 0 && isLeadVerified) ? userProfile.verification_status : 'submitted',
      }))

      const { data: insertedPassengers, error: passengerError } = await supabaseAdmin
        .from('booking_passengers')
        .insert(passengersToInsert)
        .select('id, passenger_index')

      if (passengerError || !insertedPassengers) {
        throw new Error(passengerError?.message ?? 'Failed to insert passengers')
      }

      // 6b. Batch Insert Documents
      const documentsToInsert: any[] = []
      for (const ip of insertedPassengers) {
        const p = passengers[ip.passenger_index]
        
        if (ip.passenger_index === 0 && isLeadVerified) {
          if (userProfile.aadhaar_image_path) {
            documentsToInsert.push({ passenger_id: ip.id, document_type: 'aadhaar_front', file_path: userProfile.aadhaar_image_path })
          }
          if (userProfile.selfie_image_path) {
            documentsToInsert.push({ passenger_id: ip.id, document_type: 'selfie', file_path: userProfile.selfie_image_path })
          }
        } else {
          documentsToInsert.push({ passenger_id: ip.id, document_type: 'aadhaar_front', file_path: p.aadhaarImagePath })
          documentsToInsert.push({ passenger_id: ip.id, document_type: 'selfie', file_path: p.selfieImagePath })
        }
      }

      if (documentsToInsert.length > 0) {
        const { error: documentError } = await supabaseAdmin
          .from('passenger_documents')
          .insert(documentsToInsert)

        if (documentError) {
          throw new Error(documentError.message ?? 'Failed to insert documents')
        }
      }

    } catch (txError) {
      console.error('Partial booking failure, rolling back booking:', txError)
      // Manual Rollback
      await supabaseAdmin.from('bookings').delete().eq('id', booking.id)
      throw new HttpError(500, txError instanceof Error ? txError.message : 'Transaction failed during passenger insertion')
    }

    response.status(201).json({ booking })
  } catch (error) {
    next(error)
  }
})

bookingsRouter.get('/', requireAuth, async (request, response, next) => {
  try {
    const authRequest = request as AuthenticatedRequest

    const { data: bookings, error } = await supabaseAdmin
      .from('bookings')
      .select('*, travel_packages(title, start_date, end_date)')
      .eq('user_id', authRequest.userId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new HttpError(500, error.message)
    }

    response.json({ bookings: bookings ?? [] })
  } catch (error) {
    next(error)
  }
})

bookingsRouter.get('/:bookingId', requireAuth, async (request, response, next) => {
  try {
    const authRequest = request as AuthenticatedRequest
    const { bookingId } = request.params

    const { data: booking, error } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single()

    if (error || !booking) {
      throw new HttpError(404, 'Booking not found')
    }

    if (booking.user_id !== authRequest.userId) {
      throw new HttpError(403, 'Booking does not belong to the authenticated user')
    }

    response.json({ booking })
  } catch (error) {
    next(error)
  }
})

bookingsRouter.post('/:bookingId/cancel', requireAuth, async (request, response, next) => {
  try {
    const authRequest = request as AuthenticatedRequest
    const { bookingId } = request.params

    const { data: booking, error } = await supabaseAdmin
      .from('bookings')
      .select('*, travel_packages(id, remaining_seats)')
      .eq('id', bookingId)
      .single()

    if (error || !booking) {
      throw new HttpError(404, 'Booking not found')
    }

    if (booking.user_id !== authRequest.userId) {
      throw new HttpError(403, 'Booking does not belong to the authenticated user')
    }

    if (booking.status === 'cancelled') {
      response.json({ success: true, booking })
      return
    }

    if (booking.status !== 'payment_pending' && booking.status !== 'confirmed') {
      throw new HttpError(400, `Cannot cancel booking with status: ${booking.status}`)
    }

    // Update status to cancelled
    const { data: updatedBooking, error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId)
      .select('*')
      .single()

    if (updateError) {
      throw new HttpError(500, 'Failed to cancel booking')
    }

    // If it was confirmed, we should technically restore seats, but since Razorpay refunds 
    // are manual, seat restoration could be complex. For now we will increment remaining_seats
    // back if it was 'confirmed'.
    if (booking.status === 'confirmed' && booking.travel_packages) {
      const packageId = booking.package_id
      const countToRestore = booking.traveler_count
      // Increment seats
      await supabaseAdmin.rpc('increment_seats', {
        pid: packageId,
        count: countToRestore
      })
    }

    response.json({ success: true, booking: updatedBooking })
  } catch (error) {
    next(error)
  }
})
