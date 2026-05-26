import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TravelScreen from '../screens/travel/TravelScreen';
import PackageDetailsScreen from '../screens/travel/PackageDetailsScreen';
import BookingFormScreen from '../screens/travel/BookingFormScreen';
import PaymentScreen from '../screens/travel/PaymentScreen';
import SuccessScreen from '../screens/travel/SuccessScreen';
import BookingHistoryScreen from '../screens/travel/BookingHistoryScreen';
import BookingDetailsScreen from '../screens/travel/BookingDetailsScreen';
import BookingStatusScreen from '../screens/travel/BookingStatusScreen';
import UploadDocumentsScreen from '../screens/travel/UploadDocumentsScreen';

import { TravelPackage } from '../types/travel';

export type TravelStackParamList = {
  TravelList: undefined;
  BookingHistory: undefined;
  PackageDetails: { packageItem: TravelPackage };
  BookingForm: { packageItem: TravelPackage };
  Payment: { packageName: string; totalAmount: string };
  Success: undefined;
  BookingDetails: { bookingId: string };
  BookingStatus: { bookingId: string };
  UploadDocuments: { bookingId: string };
};

const Stack = createNativeStackNavigator<TravelStackParamList>();

// The travel experience is kept inside its own stack so cards, booking, payment, and success
// can evolve without affecting the rest of the app tabs.
export default function TravelStackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="TravelList" component={TravelScreen} options={{ title: 'Travel' }} />
      <Stack.Screen name="BookingHistory" component={BookingHistoryScreen} options={{ title: 'Bookings' }} />
      <Stack.Screen name="PackageDetails" component={PackageDetailsScreen} options={{ title: 'Package' }} />
      <Stack.Screen name="BookingForm" component={BookingFormScreen} options={{ title: 'Booking' }} />
      <Stack.Screen name="Payment" component={PaymentScreen} options={{ title: 'Payment' }} />
      <Stack.Screen name="Success" component={SuccessScreen} options={{ title: 'Success' }} />
      <Stack.Screen name="BookingDetails" component={BookingDetailsScreen} options={{ title: 'Booking Details' }} />
      <Stack.Screen name="BookingStatus" component={BookingStatusScreen} options={{ title: 'Status' }} />
      <Stack.Screen name="UploadDocuments" component={UploadDocumentsScreen} options={{ title: 'Upload Docs' }} />
    </Stack.Navigator>
  );
}
