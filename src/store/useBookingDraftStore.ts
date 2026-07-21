import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { TravelPackage } from "../types/travel";
import { BusType, RoomType, TransportType } from "../utils/yatraPricing";

export type PassengerDraft = {
  fullName: string;
  dob: string;
  age: string;
  gender: string;
  phone: string;
  address: string;
  aadhaarNumber: string;
  aadhaarImageUri?: string;
  selfieImageUri?: string;
};

export type BookingDraftValues = {
  transportType: TransportType | "";
  busType: BusType | "";
  roomType: RoomType | "";
  numberOfTravelers: string;
  specialNotes: string;
  passengers: PassengerDraft[];
};

export type BookingDraftState = {
  selectedPackage: TravelPackage | null;
} & BookingDraftValues & {
    setSelectedPackage: (packageItem: TravelPackage) => void;
    updateField: <K extends keyof BookingDraftValues>(
      field: K,
      value: BookingDraftValues[K],
    ) => void;
    updatePassengerField: <K extends keyof PassengerDraft>(
      index: number,
      field: K,
      value: PassengerDraft[K],
    ) => void;
    resetDraft: () => void;
  };

export const initialPassenger: PassengerDraft = {
  fullName: "",
  dob: "",
  age: "",
  gender: "",
  phone: "",
  address: "",
  aadhaarNumber: "",
};

const initialState: BookingDraftValues = {
  transportType: "",
  busType: "",
  roomType: "",
  numberOfTravelers: "1",
  specialNotes: "",
  passengers: [{ ...initialPassenger }],
};

export const useBookingDraftStore = create<BookingDraftState>()(
  persist(
    (set) => ({
      selectedPackage: null,
      ...initialState,
      setSelectedPackage: (packageItem) => set({ selectedPackage: packageItem }),
      updateField: (field, value) => {
        set((state) => {
          const updates = { [field]: value } as Partial<BookingDraftState>;
          // If numberOfTravelers changes, resize the passengers array
          if (field === "numberOfTravelers") {
            const count = parseInt(value as string, 10);
            if (!isNaN(count) && count > 0) {
              const currentPassengers = state.passengers || [];
              const newPassengers = [...currentPassengers];
              while (newPassengers.length < count) {
                newPassengers.push({ ...initialPassenger });
              }
              if (newPassengers.length > count) {
                newPassengers.length = count;
              }
              updates.passengers = newPassengers;
            }
          }
          return updates;
        });
      },
      updatePassengerField: (index, field, value) => {
        set((state) => {
          const currentPassengers = state.passengers ? [...state.passengers] : [];
          if (currentPassengers[index]) {
            currentPassengers[index] = { ...currentPassengers[index], [field]: value };
          }
          return { passengers: currentPassengers };
        });
      },
      resetDraft: () => set({ selectedPackage: null, ...initialState }),
    }),
    {
      name: 'booking-draft-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
