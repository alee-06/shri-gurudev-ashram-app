import { randomUUID } from 'crypto'
import { NextFunction, Request, Response } from 'express'
import { HttpError } from '../errors'
import { supabaseAdmin } from '../services/supabaseAdmin'
import { normalizeFirebasePhone, verifyFirebaseIdToken } from '../services/firebaseAdmin'

export type AuthenticatedRequest = Request & { userId: string }

export async function requireAuth(request: Request, _response: Response, next: NextFunction) {
  try {
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, '')
    if (!token) throw new HttpError(401, 'Missing authorization token')

    const firebaseUser = await verifyFirebaseIdToken(token)
    if (!firebaseUser.phone_number) throw new HttpError(401, 'Firebase token has no phone number')
    
    const phone = normalizeFirebasePhone(firebaseUser.phone_number)
    
    const profile = await supabaseAdmin.from('users').select('id, deleted_at').eq('phone', phone).is('deleted_at', null).maybeSingle()
    if (profile.error) throw new HttpError(500, profile.error.message)

    if (profile.data) {
      ;(request as AuthenticatedRequest).userId = profile.data.id
      return next()
    }

    const created = await supabaseAdmin
      .from('users')
      .insert({ id: randomUUID(), phone, full_name: '' })
      .select('id')
      .single()

    if (created.error || !created.data) {
      throw new HttpError(500, created.error?.message ?? 'Could not create travel user profile')
    }

    ;(request as AuthenticatedRequest).userId = created.data.id
    next()
  } catch (error) { next(error) }
}
