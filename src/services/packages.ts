import { getSupabaseClient } from '../lib/supabase'
import { TravelPackage } from '../types/travel'

type PackageRow = {
  id: string | number
  title?: string | null
  name?: string | null
  description?: string | null
  duration?: string | null
  duration_label?: string | null
  price?: string | number | null
  remaining_seats?: number | null
  remainingSeats?: number | null
  inclusions?: string[] | string | null
  image_url?: string | null
  imageUrl?: string | null
  flight_price?: number | string | null
  train_ac_price?: number | string | null
  train_non_ac_price?: number | string | null
  room_ac_price?: number | string | null
  room_non_ac_price?: number | string | null
}

function parsePriceAmount(price: string | number | null | undefined) {
  if (typeof price === 'number') {
    return price
  }

  if (typeof price === 'string') {
    const parsed = Number(price.replace(/[^\d.]/g, ''))
    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

function formatPrice(price: string | number | null | undefined) {
  if (typeof price === 'number') {
    return `INR ${price.toLocaleString('en-IN')}`
  }
  if (typeof price === 'string' && price.trim().length > 0) {
    return price
  }
  return 'INR 0'
}

function parseInclusions(inclusions: string[] | string | null | undefined): string[] {
  if (Array.isArray(inclusions)) return inclusions
  if (typeof inclusions === 'string' && inclusions.trim()) {
    try {
      const parsed = JSON.parse(inclusions)
      if (Array.isArray(parsed)) return parsed
    } catch {
      return inclusions.split(',').map((s) => s.trim()).filter(Boolean)
    }
  }
  return []
}

function mapPackageRow(row: PackageRow): TravelPackage {
  return {
    id: String(row.id),
    title: row.title ?? row.name ?? 'Untitled Yatra',
    description: row.description ?? '',
    duration: row.duration ?? row.duration_label ?? 'Duration TBA',
    price: formatPrice(row.price),
    priceAmount: parsePriceAmount(row.price),
    remainingSeats: row.remaining_seats ?? row.remainingSeats ?? 0,
    inclusions: parseInclusions(row.inclusions),
    imageUrl: row.image_url ?? row.imageUrl ?? null,
    flightPrice: parsePriceAmount(row.flight_price),
    trainAcPrice: parsePriceAmount(row.train_ac_price),
    trainNonAcPrice: parsePriceAmount(row.train_non_ac_price),
    roomAcPrice: parsePriceAmount(row.room_ac_price),
    roomNonAcPrice: parsePriceAmount(row.room_non_ac_price),
  }
}

export async function fetchPackages(): Promise<TravelPackage[]> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('travel_packages')
    .select('*')
    .eq('is_active', true)

  if (error) {
    throw error
  }

  return ((data ?? []) as PackageRow[]).map(mapPackageRow)
}
