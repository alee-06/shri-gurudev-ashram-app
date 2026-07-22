import { getAuthToken } from './auth'
import type { Database } from '../types/database.types'
import api from '../api/axiosClient'
import { getBaseUrl } from '../utils/config'

export type ProfileInfo = {
  id: string
  fullName: string
  email: string | null
  phone: string
  memberSince: string
  profileImageUrl: string | null
  aadhaarNumber: string | null
  verificationStatus: 'not_submitted' | 'submitted' | 'verified' | 'rejected'
}

export type YatraStats = {
  totalBookings: number
  upcomingYatras: number
  completedYatras: number
  pendingPayments: number
}

type UserRow = Database['public']['Tables']['users']['Row']
type UserUpdate = Database['public']['Tables']['users']['Update']
type BookingRow = Database['public']['Tables']['bookings']['Row']
type PackageDates = Pick<Database['public']['Tables']['travel_packages']['Row'], 'start_date' | 'end_date'>

type BookingStatsRow = Pick<BookingRow, 'id' | 'status' | 'total_amount'> & {
  travel_packages: PackageDates | null
}

const PROFILE_IMAGE_BUCKET = 'profile-images'

async function requestCurrentProfile(path: string, init: RequestInit = {}) {
  const token = await getAuthToken()
  const baseUrl = getBaseUrl()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 6000)

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers ?? {}) },
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(body.error ?? 'Could not load your profile.')
    return body
  } finally {
    clearTimeout(timeoutId)
  }
}

function mapProfile(row: UserRow): ProfileInfo {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    memberSince: row.created_at,
    profileImageUrl: row.profile_image_url,
    aadhaarNumber: row.aadhaar_number,
    verificationStatus: (row.verification_status as ProfileInfo['verificationStatus']) || 'not_submitted',
  }
}

function getTodayDateString() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function isUpcomingBooking(booking: BookingStatsRow, today: string) {
  const startDate = booking.travel_packages?.start_date

  return Boolean(startDate && startDate > today)
}

function isCompletedBooking(booking: BookingStatsRow, today: string) {
  const endDate = booking.travel_packages?.end_date

  return Boolean(endDate && endDate < today)
}

export async function getCurrentProfileInfo(): Promise<ProfileInfo> {
  const { user } = await requestCurrentProfile('/api/users/me')
  return mapProfile(user)
}

export async function getCurrentUserYatraStats(): Promise<YatraStats> {
  const { data } = await api.get<{ bookings: BookingStatsRow[] }>('/api/bookings')
  const bookings = data.bookings ?? []
  
  const today = getTodayDateString()

  return {
    totalBookings: bookings.length,
    upcomingYatras: bookings.filter((booking) => isUpcomingBooking(booking as any, today)).length,
    completedYatras: bookings.filter((booking) => isCompletedBooking(booking as any, today)).length,
    pendingPayments: bookings.filter((booking) => booking.status === 'payment_pending').length,
  }
}

export async function updateCurrentProfile(input: {
  fullName: string
  profileImageUrl: string | null
}): Promise<ProfileInfo> {
  const { user } = await requestCurrentProfile('/api/users/me', { method: 'PUT', body: JSON.stringify({ fullName: input.fullName.trim(), profileImageUrl: input.profileImageUrl }) })
  return mapProfile(user)
}

export async function uploadProfileImage(imageUri: string): Promise<string> {
  const formData = new FormData()
  
  // We need to fetch the file to get its type if we don't have it, but FormData in React Native
  // can just take an object with uri, type, and name.
  formData.append('profileImage', {
    uri: imageUri,
    type: 'image/jpeg', // Default, multer will check extensions if needed
    name: `profile-${Date.now()}.jpg`,
  } as any)

  try {
    const { data } = await api.post<{ publicUrl: string }>('/api/users/upload-profile-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return data.publicUrl
  } catch (error) {
    throw new Error('Could not upload profile image. Please try again.')
  }
}

export async function softDeleteCurrentUser(): Promise<void> {
  await api.delete('/api/users/me')
}
