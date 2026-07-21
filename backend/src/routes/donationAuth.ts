import crypto from 'crypto'
import { Router } from 'express'
import { Donation } from '../models/donation'
import { DonationUser } from '../models/user'
import { issueDonationToken } from '../middleware/donationAuth'
import { requireDonationAuth } from '../middleware/donationAuth'
import { HttpError } from '../errors'
import { normalizeFirebasePhone, verifyFirebaseIdToken } from '../services/firebaseAdmin'

export const donationAuthRouter = Router()

donationAuthRouter.post('/verify-firebase-token', async (request, response, next) => {
  try {
    const body = request.body ?? {}
    if (typeof body.token !== 'string' || !body.token.trim()) throw new HttpError(400, 'Firebase ID token is required')
    const phoneNumber = (await verifyFirebaseIdToken(body.token)).phone_number
    if (!phoneNumber) throw new HttpError(400, 'Firebase token is missing a phone number')
    const mobile = normalizeFirebasePhone(phoneNumber)
    if (!/^\d{10}$/.test(mobile)) throw new HttpError(400, 'Invalid phone number')
    let user = await DonationUser.findOne({ mobile })
    if (!user) user = await DonationUser.create({ mobile })
    await Donation.updateMany({ user: null, 'donor.mobile': mobile }, { $set: { user: user._id } })
    if (!user.referralCode) { user.referralCode = `COL${crypto.randomBytes(4).toString('hex').toUpperCase()}`; await user.save() }
    response.json({ success: true, token: issueDonationToken(user), user: { id: user._id, mobile: user.mobile, fullName: user.fullName ?? null, email: user.email ?? null, role: user.role, referralCode: user.referralCode } })
  } catch (error) { next(error) }
})

donationAuthRouter.get('/me', requireDonationAuth, async (request, response, next) => { try { const userId = (request as any).donationUser.id; const user = await DonationUser.findById(userId).select('-emailVerificationToken -emailVerificationExpiry'); if (!user) throw new HttpError(404, 'User not found'); response.json(user) } catch (error) { next(error) } })
