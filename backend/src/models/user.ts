import { Schema } from 'mongoose'
import { mainDb } from '../services/mongo'

const userSchema = new Schema({
  fullName: String,
  email: String,
  emailVerified: { type: Boolean, default: false },
  mobile: { type: String, required: true },
  whatsapp: String,
  address: String,
  role: { type: String, enum: ['USER', 'COLLECTOR_PENDING', 'COLLECTOR_APPROVED', 'WEBSITE_ADMIN', 'SYSTEM_ADMIN'], default: 'USER' },
  referralCode: { type: String, unique: true, sparse: true },
  collectorDisabled: { type: Boolean, default: false },
  collectorProfile: {
    fullName: String,
    address: String,
    panNumber: String,
    aadharFront: { fileKey: String, uploadedAt: Date },
    aadharBack: { fileKey: String, uploadedAt: Date },
    status: { type: String, enum: ['none', 'pending', 'approved', 'rejected'], default: 'none' },
    submittedAt: Date,
    approvedAt: Date,
    rejectedReason: String,
  },
  emailVerificationToken: String,
  emailVerificationExpiry: Date,
}, { timestamps: true })

userSchema.index({ role: 1 })
userSchema.index({ 'collectorProfile.status': 1 })
userSchema.index({ mobile: 1 })

export const DonationUser = mainDb.models.DonationUser ?? mainDb.model('DonationUser', userSchema, 'users')
