export type TravelPackage = {
  id: string;
  title: string;
  price: string;
  priceAmount?: number;
  duration: string;
  description: string;
  remainingSeats?: number;
  inclusions?: string[];
  imageUrl?: string | null;
  flightPrice?: number;
  trainAcPrice?: number;
  trainNonAcPrice?: number;
  roomAcPrice?: number;
  roomNonAcPrice?: number;
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

export type CreateBookingPassengerInput = {
  fullName: string;
  dob: string;
  gender: string;
  phone: string;
  address: string;
  aadhaarNumber: string;
  aadhaarImagePath?: string;
  selfieImagePath?: string;
};

export type CreateBookingInput = {
  packageId: string;
  travelerCount: number;
  specialNotes?: string;
  transportType: string;
  busType?: string;
  roomType: string;
  passengers: CreateBookingPassengerInput[];
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
