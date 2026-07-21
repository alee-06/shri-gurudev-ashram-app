import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { Types } from 'mongoose'
import { Request, Response, NextFunction } from 'express'
import { Donation } from '../models/donation'
import { DonationHead } from '../models/donationHead'
import { DonationRequest } from '../middleware/donationAuth'
import { HttpError } from '../errors'
import { razorpay } from '../services/razorpay'
import { generateReceipt, publicReceiptUrl } from '../services/donationReceipt'

function objectId(value: string) {
  if (!Types.ObjectId.isValid(value)) throw new HttpError(400, 'Invalid donation ID')
  return new Types.ObjectId(value)
}

function text(value: unknown) { return typeof value === 'string' ? value.trim() : '' }

function headName(head: any) {
  if (typeof head === 'string') return head
  return head?.en ?? head?.hi ?? Object.values(head ?? {})[0] ?? ''
}

async function canonicalHead(input: any) {
  const suppliedId = text(input?.id)
  const suppliedKey = text(input?.key)
  const suppliedName = text(headName(input?.name))
  const head = suppliedKey
    ? await DonationHead.findOne({ key: suppliedKey.toLowerCase(), isActive: true }).lean()
    : await DonationHead.findOne({ $or: [{ key: suppliedId.toLowerCase() }, { _id: Types.ObjectId.isValid(suppliedId) ? suppliedId : undefined }], isActive: true }).lean()
  if (!head) throw new HttpError(400, 'Please select a valid active donation cause')
  const canonicalName = headName(head.name)
  if (suppliedName && canonicalName && suppliedName !== canonicalName) throw new HttpError(400, 'Donation cause name does not match the selected cause')
  return { id: String(head._id), key: head.key, name: canonicalName }
}

function validateDonor(donor: any) {
  const addressObj = donor?.addressObj
  const address = text(donor?.address) || [addressObj?.line, addressObj?.city, addressObj?.state, addressObj?.country, addressObj?.pincode].filter(Boolean).join(', ')
  if (!text(donor?.name) || !text(donor?.mobile) || !address || !text(donor?.dob) || text(donor?.idType) !== 'PAN' || !text(donor?.idNumber)) throw new HttpError(400, 'Missing required donor details')
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(text(donor.idNumber).toUpperCase())) throw new HttpError(400, 'Invalid PAN number format')
  const dob = new Date(donor.dob)
  if (Number.isNaN(dob.getTime())) throw new HttpError(400, 'Invalid date of birth')
  const today = new Date(); let age = today.getFullYear() - dob.getFullYear(); const month = today.getMonth() - dob.getMonth(); if (month < 0 || (month === 0 && today.getDate() < dob.getDate())) age -= 1
  if (age < 18) throw new HttpError(400, 'Donor must be 18 years or older')
  return { ...donor, name: text(donor.name), mobile: text(donor.mobile), idNumber: text(donor.idNumber).toUpperCase(), address, dob }
}

export async function createDonation(request: Request, response: Response, next: NextFunction) {
  try {
    const { donor: rawDonor, donationHead: rawHead, amount, referralCode } = request.body ?? {}
    const numericAmount = Number(amount)
    if (!Number.isFinite(numericAmount) || numericAmount < 10 || numericAmount > 10_000_000) throw new HttpError(400, 'Donation amount must be between INR 10 and INR 10,000,000')
    const donor = validateDonor(rawDonor)
    const donationHead = await canonicalHead(rawHead)
    const receiptToken = crypto.randomBytes(32).toString('hex')
    const record = await Donation.create({
      user: (request as DonationRequest).donationUser?.id ?? null,
      donor: { ...donor, addressObj: rawDonor.addressObj, emailOptIn: Boolean(rawDonor.emailOptIn), emailVerified: Boolean(rawDonor.emailVerified), anonymousDisplay: Boolean(rawDonor.anonymousDisplay), idType: 'PAN' },
      donationHead,
      amount: numericAmount,
      paymentMethod: 'ONLINE', status: 'PENDING', otpVerified: false,
      receiptToken,
      ...(text(referralCode) ? await resolveReferral(text(referralCode)) : {}),
    })
    response.status(201).json({ message: 'Donation initiated', donationId: record._id, status: record.status, receiptToken })
  } catch (error) { next(error) }
}

async function resolveReferral(code: string) {
  const { DonationUser } = await import('../models/user')
  const collector = await DonationUser.findOne({ referralCode: code.toUpperCase(), collectorDisabled: { $ne: true } }).lean()
  if (!collector) throw new HttpError(400, 'Invalid or inactive referral code')
  return { collectorId: collector._id, collectorName: collector.fullName, hasCollectorAttribution: true }
}

export async function createDonationOrder(request: Request, response: Response, next: NextFunction) {
  try {
    const id = objectId(text(request.body?.donationId))
    const donation = await Donation.findById(id)
    if (!donation) throw new HttpError(404, 'Donation not found')
    const authUser = (request as DonationRequest).donationUser
    if (authUser && donation.user && String(donation.user) !== authUser.id) throw new HttpError(403, 'Donation does not belong to the authenticated user')
    if (donation.status !== 'PENDING') throw new HttpError(409, 'Donation is not pending payment')
    if (donation.razorpayOrderId) return response.json({ razorpayOrderId: donation.razorpayOrderId, amount: Math.round(donation.amount * 100), currency: 'INR', key: process.env.RAZORPAY_KEY_ID })
    const order = await razorpay.orders.create({ amount: Math.round(donation.amount * 100), currency: 'INR', receipt: String(donation._id).slice(-12) })
    donation.razorpayOrderId = order.id; await donation.save()
    response.json({ razorpayOrderId: order.id, amount: order.amount, currency: order.currency, key: process.env.RAZORPAY_KEY_ID })
  } catch (error) { next(error) }
}

export async function donationStatus(request: Request, response: Response, next: NextFunction) {
  try {
    const donation = await Donation.findById(objectId(String(request.params.id))).select('user status donationHead amount receiptNumber receiptToken')
    if (!donation) throw new HttpError(404, 'NOT_FOUND')
    
    // Auth check: either valid receiptToken OR authenticated owner
    const token = request.query.token as string
    const authUser = (request as DonationRequest).donationUser
    if ((!token || donation.receiptToken !== token) && (!authUser || String(donation.user) !== authUser.id)) {
      throw new HttpError(403, 'Unauthorized access to donation status')
    }
    
    response.json({ status: donation.status, donationHead: donation.donationHead, amount: donation.amount, receiptNumber: donation.receiptNumber })
  } catch (error) { next(error) }
}

export async function donationReceipt(request: Request, response: Response, next: NextFunction) {
  try {
    const donation = await Donation.findById(objectId(String(request.params.id)))
    if (!donation) throw new HttpError(404, 'Donation not found')
    
    // Auth check: either valid receiptToken OR authenticated owner
    const token = request.query.token as string
    const authUser = (request as DonationRequest).donationUser
    if ((!token || donation.receiptToken !== token) && (!authUser || String(donation.user) !== authUser.id)) {
      throw new HttpError(403, 'Unauthorized access to donation receipt')
    }
    
    if (donation.status !== 'SUCCESS') throw new HttpError(403, 'Receipt not available for this donation')
    
    if (!donation.receiptNumber) {
      donation.receiptNumber = `GRD-${new Date().getFullYear()}-${String(donation._id).slice(-6).toUpperCase()}`
      await donation.save()
    }
    const filePath = await generateReceipt(donation)
    donation.receiptUrl = publicReceiptUrl(filePath)
    await donation.save()
    response.setHeader('Content-Type', 'application/pdf')
    response.setHeader('Content-Disposition', `attachment; filename="receipt-${donation.receiptNumber}.pdf"`)
    fs.createReadStream(filePath).pipe(response)
  } catch (error) { next(error) }
}

export async function userDonations(request: Request, response: Response, next: NextFunction) { try { const user = (request as DonationRequest).donationUser!; const donations = await Donation.find({ user: user.id }).select('_id donationHead donor amount status createdAt receiptUrl receiptNumber').sort({ createdAt: -1 }).lean(); response.json(donations.map((d: any) => ({ ...d, donorName: d.donor?.anonymousDisplay ? 'Anonymous' : d.donor?.name }))) } catch (error) { next(error) } }

export async function lastProfile(request: Request, response: Response, next: NextFunction) { try { const user = (request as DonationRequest).donationUser!; const donation: any = await Donation.findOne({ user: user.id, status: 'SUCCESS' }).sort({ createdAt: -1 }).lean(); if (!donation) throw new HttpError(404, 'No past donation found'); response.json({ fullName: donation.donor.name, mobile: donation.donor.mobile, email: donation.donor.email ?? '', panNumber: donation.donor.idNumber, dob: donation.donor.dob, address: donation.donor.address, addressObj: donation.donor.addressObj }) } catch (error) { next(error) } }
