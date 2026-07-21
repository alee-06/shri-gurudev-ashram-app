import multer from 'multer'
import { Router } from 'express'
import { requireDonationAuth } from '../middleware/donationAuth'
import { applyCollector, collectorDashboard, collectorStatus, leaderboard } from '../controllers/collector'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })
export const collectorRouter = Router()
collectorRouter.get('/leaderboard', leaderboard)
collectorRouter.get('/my-collector-stats', requireDonationAuth, collectorDashboard)
collectorRouter.get('/status', requireDonationAuth, collectorStatus)
collectorRouter.get('/dashboard', requireDonationAuth, collectorDashboard)
const kycUpload = upload.fields([{ name: 'aadharFront', maxCount: 1 }, { name: 'aadharBack', maxCount: 1 }])
collectorRouter.post('/apply', requireDonationAuth, kycUpload, (request, _response, next) => { const fields = (request as any).files ?? {}; (request as any).files = Object.values(fields).flat(); next() }, applyCollector)
collectorRouter.post('/reapply', requireDonationAuth, kycUpload, (request, _response, next) => { const fields = (request as any).files ?? {}; (request as any).files = Object.values(fields).flat(); next() }, applyCollector)
