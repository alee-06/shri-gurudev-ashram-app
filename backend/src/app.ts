import 'dotenv/config'
import cors from 'cors'
import express, { NextFunction, Request, Response } from 'express'
import helmet from 'helmet'
import { HttpError } from './errors'
import { connectDonationDatabases, mainDb } from './services/mongo'
import { supabaseAdmin } from './services/supabaseAdmin'
import { bookingsRouter } from './routes/bookings'
import { paymentsRouter } from './routes/payments'
import { razorpayWebhookRouter } from './routes/razorpayWebhook'
import { usersRouter } from './routes/users'
import { notificationsRouter } from './routes/notifications'
import { sevaRouter } from './routes/seva'
import { donationsRouter } from './routes/donations'
import { donationPublicRouter } from './routes/donationPublic'
import { donationAuthRouter } from './routes/donationAuth'
import { collectorRouter } from './routes/collector'
import { donationAdminRouter, donationHeadAdminRouter } from './routes/donationAdmin'
import { DonationUser } from './models/user'
import { Donation } from './models/donation'
import { requireDonationAuth } from './middleware/donationAuth'
import rateLimit from 'express-rate-limit'

const isDev = process.env.NODE_ENV !== 'production'

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: isDev ? 1000 : 10, standardHeaders: true, legacyHeaders: false })
const bookingLimiter = rateLimit({ windowMs: 60 * 1000, max: isDev ? 1000 : 5, standardHeaders: true, legacyHeaders: false })
const donationCreateLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: isDev ? 1000 : 10, standardHeaders: true, legacyHeaders: false })
const paymentLimiter = rateLimit({ windowMs: 5 * 60 * 1000, max: isDev ? 1000 : 15, standardHeaders: true, legacyHeaders: false })
const adminLimiter = rateLimit({ windowMs: 60 * 1000, max: isDev ? 1000 : 60, standardHeaders: true, legacyHeaders: false })
const globalLimiter = rateLimit({ windowMs: 60 * 1000, max: isDev ? 10000 : 100, standardHeaders: true, legacyHeaders: false })

export const app = express()
app.set('trust proxy', 1)

app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : ['https://shrigurudevashram.org', 'https://donate.shrigurudevashram.org'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// Health Check API (unauthenticated, lightweight, suitable for VPS / load balancer probes)
app.get(['/health', '/api/health'], async (_request: Request, response: Response) => {
  const startTime = Date.now()
  let supabaseStatus = 'ok'
  let mongoStatus = 'ok'

  try {
    const { error } = await supabaseAdmin.from('travel_packages').select('id', { head: true, count: 'exact' })
    if (error) supabaseStatus = 'error'
  } catch (e) {
    supabaseStatus = 'error'
  }

  try {
    if (mainDb.readyState !== 1) {
      mongoStatus = 'error'
    }
  } catch (e) {
    mongoStatus = 'error'
  }

  const isHealthy = supabaseStatus === 'ok' && mongoStatus === 'ok'
  const statusCode = isHealthy ? 200 : 503

  response.status(statusCode).json({
    status: isHealthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version ?? '1.0.0',
    environment: process.env.NODE_ENV ?? 'development',
    services: {
      supabase: supabaseStatus,
      mongodb: mongoStatus,
    },
    latencyMs: Date.now() - startTime,
  })
})

app.use('/api/webhooks/razorpay', express.raw({ type: 'application/json' }), razorpayWebhookRouter)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use(globalLimiter)
app.use('/api/bookings', bookingLimiter, bookingsRouter)
app.use('/api/payments', paymentLimiter, paymentsRouter)
app.use('/api/users', usersRouter)
app.use('/api/users/login', authLimiter)
app.use('/api/notifications', notificationsRouter)
app.use('/api/seva', sevaRouter)
app.use('/api/donations', donationsRouter)
app.use('/api/public', donationPublicRouter)
app.use('/api/auth', authLimiter, donationAuthRouter)
app.use('/api/collector', collectorRouter)
app.get('/api/referral/validate/:code', async (request, response, next) => {
  try {
    const user = await DonationUser.findOne({ referralCode: String(request.params.code).toUpperCase(), collectorDisabled: { $ne: true } }).select('_id fullName collectorProfile.fullName').lean()
    response.json(user ? { valid: true, collectorId: user._id, collectorName: user.fullName ?? user.collectorProfile?.fullName } : { valid: false, error: 'Invalid or inactive referral code' })
  } catch (error) { next(error) }
})
app.get('/api/leaderboard/top', async (request, response, next) => {
  try {
    const { leaderboard } = await import('./controllers/collector')
    await leaderboard(request, response, next)
  } catch (error) { next(error) }
})
app.use('/api/admin/system', adminLimiter, donationAdminRouter)
app.use('/api/admin/website/donation-heads', adminLimiter, donationHeadAdminRouter)
app.get('/api/user/donations', requireDonationAuth, async (request, response, next) => {
  try {
    const { userDonations } = await import('./controllers/donations')
    await userDonations(request, response, next)
  } catch (error) { next(error) }
})
app.use('/receipts', express.static('backend/receipts'))

export async function connectAppDatabases() {
  await connectDonationDatabases()
}

app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  const status = error instanceof HttpError ? error.status : 500
  const message = error instanceof HttpError ? error.message : 'Internal server error'

  if (!(error instanceof HttpError)) {
    console.error('Unhandled error:', error)
  }

  response.status(status).json({
    error: message,
  })
})

export function startServer() {
  const port = Number(process.env.PORT ?? 3000)

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('Missing or invalid environment variable: PORT')
  }

  return app.listen(port, () => {
    console.log(`Backend server listening on port ${port}`)
    
    // TEMPORARY SCHEDULER: Background job to expire stale bookings every 5 minutes.
    // In a production environment with multiple backend instances, this should be 
    // replaced with pg_cron, Supabase Scheduled Functions, or a centralized task queue.
    setInterval(() => {
      void (async () => {
        const { error } = await supabaseAdmin.rpc('expire_stale_bookings')
        if (error) {
          console.error('Failed to expire stale bookings in background:', error)
        }
      })()
    }, 5 * 60 * 1000)
  })
}
