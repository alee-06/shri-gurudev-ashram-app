import { getSupabaseClient } from '../lib/supabase'
import type { Database } from '../types/database.types'

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
  const supabase = getSupabaseClient()
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !sessionData.session?.user) {
    throw new Error('Please sign in to view your profile.')
  }

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', sessionData.session.user.id)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error('Profile record not found.')
  }

  if (data.deleted_at) {
    throw new Error('This account has been deactivated.')
  }

  return mapProfile(data)
}

export async function getCurrentUserYatraStats(): Promise<YatraStats> {
  const supabase = getSupabaseClient()
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !sessionData.session?.user) {
    throw new Error('Please sign in to view your yatra summary.')
  }

  const { data, error } = await supabase
    .from('bookings')
    .select('id, status, total_amount, travel_packages(start_date, end_date)')
    .eq('user_id', sessionData.session.user.id)

  if (error) {
    throw error
  }

  const bookings = (data ?? []) as BookingStatsRow[]
  const today = getTodayDateString()

  return {
    totalBookings: bookings.length,
    upcomingYatras: bookings.filter((booking) => isUpcomingBooking(booking, today)).length,
    completedYatras: bookings.filter((booking) => isCompletedBooking(booking, today)).length,
    pendingPayments: bookings.filter((booking) => booking.status === 'payment_pending').length,
  }
}

export async function updateCurrentProfile(input: {
  fullName: string
  profileImageUrl: string | null
}): Promise<ProfileInfo> {
  const supabase = getSupabaseClient()
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !sessionData.session?.user) {
    throw new Error('Please sign in to update your profile.')
  }

  const update: UserUpdate = {
    full_name: input.fullName.trim(),
    profile_image_url: input.profileImageUrl,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('users')
    .update(update)
    .eq('id', sessionData.session.user.id)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return mapProfile(data)
}

export async function uploadProfileImage(imageUri: string): Promise<string> {
  const supabase = getSupabaseClient()
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !sessionData.session?.user) {
    throw new Error('Please sign in to upload a profile image.')
  }

  const response = await fetch(imageUri)
  const blob = await response.blob()
  const imageData = await blob.arrayBuffer()

  const contentType = blob.type || 'image/jpeg'
  const extension = contentType.split('/')[1] || 'jpg'
  const path = `${sessionData.session.user.id}/${Date.now()}.${extension}`

  const { error } = await supabase.storage
    .from(PROFILE_IMAGE_BUCKET)
    .upload(path, imageData, {
      contentType,
      upsert: true,
    })

  if (error) {
    throw new Error(error.message)
  }

  const { data } = supabase.storage.from(PROFILE_IMAGE_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export async function softDeleteCurrentUser(): Promise<void> {
  const supabase = getSupabaseClient()
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !sessionData.session?.user) {
    throw new Error('Please sign in to delete your account.')
  }

  const { error } = await supabase
    .from('users')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', sessionData.session.user.id)

  if (error) {
    throw error
  }
}
