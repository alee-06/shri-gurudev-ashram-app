import type { SevaType } from '../constants/seva';
import type { CreateSevaBookingInput, SevaBooking, UpcomingSeva } from '../types/seva';
import { useSevaStore } from '../store/useSevaStore';

import api from '../api/axiosClient';

export type DateAvailabilityInfo = {
  booked: number;
  capacity: number;
  remaining: number;
  available: boolean;
};

// ─── Fetch Dynamic Seva Pricing ─────────────────────────────────────────────
export async function fetchSevaPricing(): Promise<Record<SevaType, number>> {
  const { data } = await api.get('/api/seva/pricing');
  return data.pricing;
}

// ─── Fetch Monthly Seva Availability ─────────────────────────────────────────
export async function fetchSevaMonthlyAvailability(
  type: SevaType,
  month: string,
): Promise<Record<string, DateAvailabilityInfo>> {
  const { data } = await api.get(`/api/seva/availability?type=${type}&month=${month}`);
  return data.availability || {};
}

// ─── Create a Seva Booking ─────────────────────────────────────────────
export async function createSevaBooking(
  input: CreateSevaBookingInput,
): Promise<SevaBooking> {
  const { data } = await api.post('/api/seva', input);
  return data.data; // The backend returns { success: true, data: { ... } }
}

// ─── "Pay" a seva booking (Razorpay checkout) ───────────────────
// This returns the Razorpay order for the frontend to open Checkout
export async function createSevaOrder(bookingId: string): Promise<{ order: any, booking: SevaBooking }> {
  const { data } = await api.post('/api/payments/create-seva-order', { bookingId });
  return data;
}

export async function verifySevaPayment(paymentData: {
  bookingId: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): Promise<{ success: boolean }> {
  const { data } = await api.post('/api/payments/verify-seva', paymentData);
  return data;
}

// ─── Upcoming Sevas for the Home feed ─────────────────────────────────
export async function fetchUpcomingSevas(): Promise<UpcomingSeva[]> {
  const { data } = await api.get('/api/seva/upcoming');
  return data;
}

// ─── Seva History ────────────────────────────────────────────────────────
export async function fetchSevaHistory(): Promise<SevaBooking[]> {
  const { data } = await api.get('/api/seva/history');
  return data;
}

// ─── Check Annadan date availability ───────────────────────────────────
export async function checkAnnadanAvailability(
  date: string,
): Promise<{ available: boolean; reason?: string }> {
  const { data } = await api.get(`/api/seva/annadan/availability?date=${date}`);
  return data;
}

// ─── Check Yajman date availability ────────────────────────────────────
export async function checkYajmanAvailability(
  date: string,
): Promise<{ available: boolean; reason?: string }> {
  const { data } = await api.get(`/api/seva/yajman/availability?date=${date}`);
  return data;
}
