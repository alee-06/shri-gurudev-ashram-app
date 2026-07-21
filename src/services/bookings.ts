import api from "../api/axiosClient";
import { getSupabaseClient } from "../lib/supabase";
import type { Database } from "../types/database.types";
import { Booking, BookingStatus, CreateBookingInput } from "../types/travel";
import { getFriendlyApiError } from "../utils/apiErrors";

type BookingApiRow = {
  id: string;
  booking_reference: string;
  package_id: string;
  user_id: string;
  traveler_count: number;
  special_notes: string | null;
  total_amount: number;
  status: string;
  created_at?: string;
  // Traveler information persisted on the booking row
  full_name?: string | null;
  phone_number?: string | null;
  whatsapp_number?: string | null;
  dob?: string | null;
  address?: string | null;
  transport_type?: string | null;
  bus_type?: string | null;
  room_type?: string | null;
};
type PackageSelection = Pick<Database["public"]["Tables"]["travel_packages"]["Row"], "title" | "start_date" | "end_date"> | null;
type BookingHistoryRow = BookingApiRow & {
  travel_packages: PackageSelection;
};

function mapBookingStatus(status: string): BookingStatus {
  if (
    status === "pending" ||
    status === "confirmed" ||
    status === "payment_pending" ||
    status === "paid" ||
    status === "cancelled" ||
    status === "completed"
  ) {
    return status;
  }

  return "payment_pending";
}

function mapBookingRow(row: BookingApiRow, options?: { packageTitle?: string; travelStartDate?: string | null; travelEndDate?: string | null }): Booking {
  return {
    id: row.id,
    bookingReference: row.booking_reference,
    packageId: row.package_id,
    packageTitle: options?.packageTitle,
    travelStartDate: options?.travelStartDate,
    travelEndDate: options?.travelEndDate,
    userId: row.user_id,
    travelerCount: row.traveler_count,
    specialNotes: row.special_notes,
    totalAmount: row.total_amount,
    status: mapBookingStatus(row.status),
    createdAt: row.created_at,
    fullName: row.full_name ?? undefined,
    phoneNumber: row.phone_number ?? undefined,
    whatsappNumber: row.whatsapp_number ?? undefined,
    dob: row.dob ?? undefined,
    address: row.address ?? undefined,
    transportType: row.transport_type ?? undefined,
    busType: row.bus_type ?? undefined,
    roomType: row.room_type ?? undefined,
  };
}

export async function createBooking(
  input: CreateBookingInput,
): Promise<Booking> {
  try {
    const { data } = await api.post<{ booking: BookingApiRow }>(
      "/api/bookings",
      input,
    );
    return mapBookingRow(data.booking);
  } catch (error) {
    throw new Error(
      getFriendlyApiError(
        error,
        "Could not create booking. Please try again.",
        [
          {
            match: /Identity verification must be completed before booking/i,
            message: "Please verify your identity before booking.",
          },
          {
            match: /Not enough seats available/i,
            message: "Not enough seats are available for this package.",
          },
          {
            match: /Travel package is not active/i,
            message: "This travel package is no longer active.",
          },
        ],
      ),
    );
  }
}

export async function getBookingsByUser(_userId?: string): Promise<Booking[]> {
  try {

    const { data } = await api.get<{ bookings: BookingHistoryRow[] }>("/api/bookings");

    const bookings = data.bookings ?? [];

    return bookings.map((booking) =>
      mapBookingRow(booking, {
        packageTitle: booking.travel_packages?.title,
        travelStartDate: booking.travel_packages?.start_date ?? null,
        travelEndDate: booking.travel_packages?.end_date ?? null,
      }),
    );
  } catch (error) {
    throw new Error(
      getFriendlyApiError(
        error,
        "We could not load your bookings right now. Please try again.",
      ),
    );
  }
}

export async function getBookingById(bookingId: string): Promise<Booking> {
  try {
    const { data } = await api.get<{ booking: BookingApiRow }>(
      `/api/bookings/${bookingId}`,
    );
    return mapBookingRow(data.booking);
  } catch (error) {
    throw new Error(
      getFriendlyApiError(
        error,
        "Could not load booking details. Please try again.",
      ),
    );
  }
}

export async function cancelBooking(bookingId: string): Promise<Booking> {
  try {
    const { data } = await api.post<{ booking: BookingApiRow }>(
      `/api/bookings/${bookingId}/cancel`,
    );
    return mapBookingRow(data.booking);
  } catch (error) {
    throw new Error(
      getFriendlyApiError(
        error,
        "Could not cancel booking. Please try again.",
      ),
    );
  }
}
