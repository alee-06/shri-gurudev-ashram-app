export type TransportType = 'Flight' | 'Train'
export type BusType = 'AC Train' | 'Non-AC Train'
export type RoomType = 'AC Room' | 'Non-AC Room'

export type YatraPriceOption = {
  amount: number
  inclusions: string[]
}

export const YATRA_PRICE_MATRIX: Record<string, YatraPriceOption> = {
  'Flight|AC Room': { amount: 35000, inclusions: ['Flight transfers', 'AC accommodation', 'Temple assistance'] },
  'Flight|Non-AC Room': { amount: 30000, inclusions: ['Flight transfers', 'Non-AC stay', 'Temple assistance'] },
  'AC Train|AC Room': { amount: 25000, inclusions: ['AC train travel', 'AC accommodation', 'Temple assistance'] },
  'AC Train|Non-AC Room': { amount: 22000, inclusions: ['AC train travel', 'Non-AC stay', 'Temple assistance'] },
  'Non-AC Train|AC Room': { amount: 20000, inclusions: ['Train travel', 'AC accommodation', 'Temple assistance'] },
  'Non-AC Train|Non-AC Room': { amount: 18000, inclusions: ['Train travel', 'Non-AC stay', 'Temple assistance'] },
}

export function getYatraPrice(transportType: TransportType, roomType: RoomType, busType?: BusType | null) {
  const key = `${transportType === 'Train' ? busType ?? 'AC Train' : 'Flight'}|${roomType}`
  return YATRA_PRICE_MATRIX[key] ?? YATRA_PRICE_MATRIX['Flight|AC Room']
}
