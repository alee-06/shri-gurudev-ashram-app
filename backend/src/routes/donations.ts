import { Router } from 'express'
import { optionalDonationAuth, requireDonationAuth } from '../middleware/donationAuth'
import { createDonation, createDonationOrder, donationReceipt, donationStatus, lastProfile, userDonations } from '../controllers/donations'
import { collectorDashboard, leaderboard } from '../controllers/collector'

import rateLimit from 'express-rate-limit'

export const donationsRouter = Router()

const createLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false })
const statusLimiter = rateLimit({ windowMs: 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false })

donationsRouter.post('/create', createLimiter, optionalDonationAuth, createDonation)
donationsRouter.post('/create-order', createLimiter, optionalDonationAuth, createDonationOrder)
donationsRouter.get('/:id/status', statusLimiter, donationStatus)
donationsRouter.get('/:id/receipt', statusLimiter, donationReceipt)
donationsRouter.get('/me/last-profile', requireDonationAuth, lastProfile)
donationsRouter.get('/history', requireDonationAuth, userDonations)
donationsRouter.get('/leaderboard', leaderboard)
donationsRouter.get('/my-collector-stats', requireDonationAuth, collectorDashboard)
