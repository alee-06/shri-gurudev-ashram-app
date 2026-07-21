import { Schema } from 'mongoose'
import { sharedDb } from '../services/mongo'

const multilingual = { type: Schema.Types.Mixed, default: '' }
const subCauseSchema = new Schema({
  key: { type: String, required: true, lowercase: true, trim: true },
  name: { type: Schema.Types.Mixed, required: true },
  description: multilingual,
  minAmount: { type: Number, default: null, min: 0 },
  isActive: { type: Boolean, default: true },
})

const donationHeadSchema = new Schema({
  key: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: Schema.Types.Mixed, required: true },
  description: { type: Schema.Types.Mixed, required: true },
  longDescription: multilingual,
  imageUrl: { type: String, default: null },
  iconKey: { type: String, default: 'general' },
  minAmount: { type: Number, default: null, min: 0 },
  presetAmounts: { type: [Number], default: [100, 500, 1000, 2500, 5000, 10000] },
  subCauses: { type: [subCauseSchema], default: [] },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  is80GEligible: { type: Boolean, default: true },
  goalAmount: { type: Number, default: null, min: 0 },
  currentAmount: { type: Number, default: 0, min: 0 },
  createdBy: { type: Schema.Types.ObjectId, ref: 'DonationUser' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'DonationUser' },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } })

donationHeadSchema.virtual('collectedPercentage').get(function () {
  if (!this.goalAmount) return null
  return Math.min(100, Math.round((this.currentAmount / this.goalAmount) * 100))
})

export const DonationHead = sharedDb.models.DonationHead ?? sharedDb.model('DonationHead', donationHeadSchema)
