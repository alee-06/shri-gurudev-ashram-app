import { Schema } from 'mongoose'
import { mainDb } from '../services/mongo'

const donationSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  collectorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  collectorName: { type: String, default: null },
  hasCollectorAttribution: { type: Boolean, default: false },
  donor: {
    name: { type: String, required: true },
    mobile: { type: String, required: true },
    email: String,
    emailOptIn: { type: Boolean, default: false },
    emailVerified: { type: Boolean, default: false },
    address: String,
    addressObj: { line: String, city: String, state: String, country: { type: String, default: 'India' }, pincode: String },
    anonymousDisplay: { type: Boolean, default: false },
    dob: { type: Date, required: true },
    idType: { type: String, enum: ['PAN'], default: 'PAN', required: true },
    idNumber: { type: String, required: true },
  },
  donationHead: { id: { type: String, required: true }, name: { type: String, required: true }, key: String },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['ONLINE', 'CASH', 'UPI', 'CHEQUE'], default: 'ONLINE' },
  razorpayOrderId: String,
  paymentId: String,
  status: { type: String, enum: ['PENDING', 'SUCCESS', 'FAILED'], default: 'PENDING' },
  transactionRef: String,
  failureReason: String,
  payment: {
    method: { type: String, enum: ['ONLINE', 'CASH', 'UPI', 'CHEQUE'] },
    status: { type: String, enum: ['PENDING', 'SUCCESS', 'FAILED'] },
    utrNumber: String,
    chequeNumber: String,
    bankName: String,
    chequeDate: Date,
  },
  receiptUrl: String,
  receiptNumber: String,
  emailSent: { type: Boolean, default: false },
  otpVerified: { type: Boolean, default: false },
  addedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  receiptToken: { type: String, required: false },
}, { timestamps: true })

donationSchema.index({ user: 1, createdAt: -1 })
donationSchema.index({ user: 1, status: 1, createdAt: -1 })
donationSchema.index({ collectorId: 1, createdAt: -1 })
donationSchema.index({ hasCollectorAttribution: 1, status: 1 })
donationSchema.index({ 'donor.mobile': 1 })

export const Donation = mainDb.models.Donation ?? mainDb.model('Donation', donationSchema)
