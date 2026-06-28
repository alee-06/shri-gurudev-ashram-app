export type TravelPackage = {
  id: string;
  title: string;
  price: string;
  priceAmount?: number;
  duration: string;
  description: string;
};

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'payment_pending' | 'paid';

export type Booking = {
  id: string;
  bookingReference: string;
  packageId: string;
  packageTitle?: string;
  travelStartDate?: string | null;
  travelEndDate?: string | null;
  userId: string;
  travelerCount: number;
  specialNotes: string | null;
  totalAmount: number;
  status: BookingStatus;
  createdAt?: string;
  // Traveler information (persisted on the booking row)
  fullName?: string;
  phoneNumber?: string;
  whatsappNumber?: string;
  dob?: string;
  address?: string;
  transportType?: string;
  busType?: string;
  roomType?: string;
};

export type CreateBookingInput = {
  packageId: string;
  travelerCount: number;
  specialNotes?: string;
  fullName: string;
  phoneNumber: string;
  whatsappNumber: string;
  dob: string;
  address: string;
  transportType: string;
  busType?: string;
  roomType: string;
};

export type BookingRecord = {
  id: string;
  bookingId: string;
  packageName: string;
  status: 'Payment Pending' | 'Paid' | 'Cancelled' | 'Completed';
  travelDate: string;
  amount: string;
};

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  time: string;
};

export type CollectorTask = {
  id: string;
  title: string;
  description: string;
  status: 'Open' | 'In Review' | 'Approved';
};
