import {
  getAuth,
  signInWithPhoneNumber,
  signOut as firebaseSignOut,
  getIdToken,
  type User,
  type ConfirmationResult,
} from "@react-native-firebase/auth";
import * as SecureStore from "expo-secure-store";
import { useAuthStore } from "../store/useAuthStore";

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://10.0.2.2:3000";
const FIREBASE_TOKEN_KEY = "shri_gurudev_firebase_id_token";
const DONATION_TOKEN_KEY = "shri_gurudev_donation_jwt";

export type VerificationStatus =
  | "not_submitted"
  | "submitted"
  | "verified"
  | "rejected";
export type AuthUser = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string;
  role: string;
  profileImageUrl: string | null;
  verificationStatus: VerificationStatus;
  aadhaarNumber: string | null;
  aadhaarImagePath: string | null;
  selfieImagePath: string | null;
  createdAt?: string;
  deletedAt: string | null;
};

function mapUser(row: any): AuthUser {
  return {
    id: row.id,
    fullName: row.full_name ?? "",
    email: row.email ?? null,
    phone: row.phone ?? "",
    role: row.role ?? "user",
    profileImageUrl: row.profile_image_url ?? null,
    verificationStatus: row.verification_status ?? "not_submitted",
    aadhaarNumber: row.aadhaar_number ?? null,
    aadhaarImagePath: row.aadhaar_image_path ?? null,
    selfieImagePath: row.selfie_image_path ?? null,
    createdAt: row.created_at,
    deletedAt: row.deleted_at ?? null,
  };
}
async function request(path: string, init: RequestInit = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? "Request failed");
  return body;
}
async function finishFirebaseUser(user: User) {
  const token = await getIdToken(user, true);
  await SecureStore.setItemAsync(FIREBASE_TOKEN_KEY, token);
  const donation = await request("/api/auth/verify-firebase-token", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
  if (donation.token)
    await SecureStore.setItemAsync(DONATION_TOKEN_KEY, donation.token);
  const profile = await request("/api/users/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return mapUser(profile.user);
}
export async function requestPhoneOtp(
  phone: string,
): Promise<ConfirmationResult> {
  const auth = getAuth();
  return signInWithPhoneNumber(auth, `+91${phone.replace(/\D/g, "")}`);
}
export async function confirmPhoneOtp(
  confirmation: ConfirmationResult,
  code: string,
) {
  const result = await confirmation.confirm(code);
  const user = result?.user;
  if (!user) throw new Error("Firebase did not return a user");
  return finishFirebaseUser(user);
}
export async function authenticatePhone(phone: string): Promise<any> {
  return requestPhoneOtp(phone);
}
export async function signOut() {
  const auth = getAuth();
  await firebaseSignOut(auth);
  await SecureStore.deleteItemAsync(FIREBASE_TOKEN_KEY);
  await SecureStore.deleteItemAsync(DONATION_TOKEN_KEY);
  useAuthStore.getState().clearUser();
}
export async function getCurrentUser(): Promise<AuthUser | null> {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return null;
  try {
    return await finishFirebaseUser(user);
  } catch {
    return null;
  }
}
export async function getAuthToken() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (user) {
    const token = await getIdToken(user);
    await SecureStore.setItemAsync(FIREBASE_TOKEN_KEY, token);
    return token;
  }
  return SecureStore.getItemAsync(FIREBASE_TOKEN_KEY);
}
export async function getDonationToken() {
  return SecureStore.getItemAsync(DONATION_TOKEN_KEY);
}
export async function refreshCurrentUser() {
  const user = await getCurrentUser();
  if (user) useAuthStore.getState().setUser(user);
  else useAuthStore.getState().clearUser();
  return user;
}
