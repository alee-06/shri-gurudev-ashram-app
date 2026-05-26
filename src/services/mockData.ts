import { BookingRecord, CollectorTask, NotificationItem, TravelPackage } from '../types/travel';

export const travelPackages: TravelPackage[] = [
  {
    id: '1',
    title: 'Goa Beach Escape',
    price: '$499',
    duration: '4 Days / 3 Nights',
    description: 'Relax by the sea with curated stays and sunset cruises.',
  },
  {
    id: '2',
    title: 'Himalayan Retreat',
    price: '$899',
    duration: '6 Days / 5 Nights',
    description: 'Mountain views, guided treks, and cozy hillside cafes.',
  },
  {
    id: '3',
    title: 'Kerala Backwaters',
    price: '$699',
    duration: '5 Days / 4 Nights',
    description: 'Houseboat stay, local cuisine, and nature-rich routes.',
  },
  {
    id: '4',
    title: 'Rajasthan Heritage Tour',
    price: '$799',
    duration: '5 Days / 4 Nights',
    description: 'Palaces, forts, and vibrant markets with local guides.',
  },
];

export const bookingHistory: BookingRecord[] = [
  {
    id: 'b1',
    bookingId: 'BK-000245',
    packageName: 'Goa Beach Escape',
    status: 'Pending',
    travelDate: '12 Jun 2026',
    amount: '$499',
  },
  {
    id: 'b2',
    bookingId: 'BK-000198',
    packageName: 'Kerala Backwaters',
    status: 'Verified',
    travelDate: '01 Jul 2026',
    amount: '$699',
  },
  {
    id: 'b3',
    bookingId: 'BK-000181',
    packageName: 'Himalayan Retreat',
    status: 'Rejected',
    travelDate: '22 Jul 2026',
    amount: '$899',
  },
];

export const notifications: NotificationItem[] = [
  {
    id: 'n1',
    title: 'Payment under review',
    message: 'Your Goa booking proof is waiting for admin verification.',
    time: '10 min ago',
  },
  {
    id: 'n2',
    title: 'Travel reminder',
    message: 'Your Kerala booking is scheduled for next week.',
    time: '2 hours ago',
  },
  {
    id: 'n3',
    title: 'Document upload needed',
    message: 'Please upload an ID document for your Himalayan trip.',
    time: '1 day ago',
  },
];

export const collectorTasks: CollectorTask[] = [
  {
    id: 'c1',
    title: 'Verify payment proof',
    description: 'Review new booking uploads and verify transaction details.',
    status: 'Open',
  },
  {
    id: 'c2',
    title: 'Document review',
    description: 'Check uploaded identity documents for completed bookings.',
    status: 'In Review',
  },
];
