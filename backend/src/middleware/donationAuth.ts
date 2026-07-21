import jwt from 'jsonwebtoken'
import { NextFunction, Request, Response } from 'express'
import { HttpError } from '../errors'
import { DonationUser } from '../models/user'

export type DonationRequest = Request & { donationUser?: { id: string; role: string } }

function secret() {
  if (!process.env.JWT_SECRET) throw new Error('Missing required environment variable: JWT_SECRET')
  return process.env.JWT_SECRET
}

export async function optionalDonationAuth(request: Request, _response: Response, next: NextFunction) {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '')
  if (!token) return next()
  try {
    const decoded = jwt.verify(token, secret()) as { userId?: string; role?: string }
    if (decoded.userId && await DonationUser.exists({ _id: decoded.userId })) {
      ;(request as DonationRequest).donationUser = { id: decoded.userId, role: decoded.role ?? 'USER' }
    }
  } catch { /* optional authentication intentionally falls back to guest */ }
  next()
}

export async function requireDonationAuth(request: Request, _response: Response, next: NextFunction) {
  try {
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, '')
    if (!token) throw new HttpError(401, 'Missing authorization token')
    const decoded = jwt.verify(token, secret()) as { userId?: string; role?: string }
    if (!decoded.userId || !(await DonationUser.exists({ _id: decoded.userId }))) throw new HttpError(401, 'Invalid authorization token')
    ;(request as DonationRequest).donationUser = { id: decoded.userId, role: decoded.role ?? 'USER' }
    next()
  } catch (error) { next(error) }
}

export function issueDonationToken(user: { _id: unknown; role?: string }) {
  return jwt.sign({ userId: String(user._id), role: user.role ?? 'USER' }, secret(), { expiresIn: '7d' })
}
