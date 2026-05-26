import { create } from 'zustand';
import { TravelPackage } from '../types/travel';

export type BookingDraftValues = {
  fullName: string;
  phoneNumber: string;
  age: string;
  gender: string;
  numberOfTravelers: string;
  specialNotes: string;
  utr: string;
  proofLabel: string;
};

export type BookingDraftState = {
  selectedPackage: TravelPackage | null;
} & BookingDraftValues & {
  setSelectedPackage: (packageItem: TravelPackage) => void;
  updateField: <K extends keyof BookingDraftValues>(field: K, value: BookingDraftValues[K]) => void;
  resetDraft: () => void;
};

const initialState: BookingDraftValues = {
  fullName: '',
  phoneNumber: '',
  age: '',
  gender: 'Male',
  numberOfTravelers: '1',
  specialNotes: '',
  utr: '',
  proofLabel: '',
};

export const useBookingDraftStore = create<BookingDraftState>((set) => ({
  selectedPackage: null,
  ...initialState,
  setSelectedPackage: (packageItem) => set({ selectedPackage: packageItem }),
  updateField: (field, value) => set({ [field]: value } as Partial<BookingDraftState>),
  resetDraft: () => set(initialState),
}));
