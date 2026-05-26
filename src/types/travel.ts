export type TravelPackage = {
  id: string;
  title: string;
  price: string;
  duration: string;
  description: string;
};

export type BookingRecord = {
  id: string;
  bookingId: string;
  packageName: string;
  status: 'Pending' | 'Verified' | 'Rejected';
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
