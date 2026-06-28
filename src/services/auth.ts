import { getSupabaseClient } from "../lib/supabase";
import type { Database } from "../types/database.types";
import { useAuthStore } from "../store/useAuthStore";

type UserRow = Database["public"]["Tables"]["users"]["Row"];

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

type AuthMetadata = {
  full_name?: string;
  phone?: string;
};

class AccountDeletedError extends Error {
  constructor() {
    super("This account has been deactivated.");
    this.name = "AccountDeletedError";
  }
}

function logAuthError(error: unknown) {
  console.warn(JSON.stringify(error, null, 2));
}

function toReadableAuthError(error: unknown, fallbackMessage: string) {
  if (error && typeof error === "object" && "message" in error) {
    const message = String(
      (error as { message?: unknown }).message ?? fallbackMessage,
    );

    if (/invalid login credentials/i.test(message)) {
      return new Error("Login failed. Please check your email and password.");
    }

    if (
      /user already registered/i.test(message) ||
      /already been registered/i.test(message)
    ) {
      return new Error("An account with this email already exists.");
    }

    if (/password.*at least/i.test(message)) {
      return new Error("Password is too short.");
    }

    return new Error(message);
  }

  return new Error(fallbackMessage);
}

function mapUserRow(row: UserRow): AuthUser {
  if (row.deleted_at) {
    throw new AccountDeletedError();
  }

  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    profileImageUrl: row.profile_image_url || null,
    verificationStatus:
      (row.verification_status as VerificationStatus) || "not_submitted",
    aadhaarNumber: row.aadhaar_number || null,
    aadhaarImagePath: row.aadhaar_image_path || null,
    selfieImagePath: row.selfie_image_path || null,
    createdAt: row.created_at || undefined,
    deletedAt: row.deleted_at || null,
  };
}

function mapFallbackAuthUser(user: {
  id: string;
  email?: string | null;
  user_metadata?: AuthMetadata | null;
}): AuthUser {
  return {
    id: user.id,
    fullName: user.user_metadata?.full_name?.trim() || user.email || "User",
    email: user.email ?? null,
    phone: user.user_metadata?.phone?.trim() || "",
    role: "user",
    profileImageUrl: null,
    verificationStatus: "not_submitted",
    aadhaarNumber: null,
    aadhaarImagePath: null,
    selfieImagePath: null,
    createdAt: undefined,
    deletedAt: null,
  };
}

async function getProfileForAuthUser(authUser: {
  id: string;
  email?: string | null;
  user_metadata?: AuthMetadata | null;
}) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data) {
    return mapUserRow(data);
  }

  return mapFallbackAuthUser(authUser);
}

export async function signUp(
  email: string,
  password: string,
  fullName: string,
  phone: string,
): Promise<AuthUser> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone,
      },
    },
  });

  if (error) {
    logAuthError(error);
    throw toReadableAuthError(
      error,
      "Could not create your account. Please try again.",
    );
  }

  if (!data.user) {
    throw new Error("Signup succeeded but Supabase did not return a user.");
  }

  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();

  if (sessionError) {
    logAuthError(sessionError);
    throw toReadableAuthError(
      sessionError,
      "Your account was created, but the session could not be loaded.",
    );
  }

  if (sessionData.session?.user) {
    return getProfileForAuthUser(sessionData.session.user);
  }

  return {
    id: data.user.id,
    fullName: fullName.trim() || data.user.email || "User",
    email: data.user.email ?? email.trim() ?? null,
    phone: phone.trim(),
    role: "user",
    profileImageUrl: null,
    verificationStatus: "not_submitted",
    aadhaarNumber: null,
    aadhaarImagePath: null,
    selfieImagePath: null,
    deletedAt: null,
  };
}

export async function signIn(
  email: string,
  password: string,
): Promise<AuthUser> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    logAuthError(error);
    throw toReadableAuthError(
      error,
      "Could not sign you in. Please check your credentials.",
    );
  }

  if (!data.user) {
    throw new Error("Signin succeeded but Supabase did not return a user.");
  }

  try {
    return await getProfileForAuthUser(data.user);
  } catch (error) {
    if (error instanceof AccountDeletedError) {
      await supabase.auth.signOut();
    }

    throw error;
  }
}

export async function signOut(): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    logAuthError(error);
    throw toReadableAuthError(
      error,
      "Could not sign you out. Please try again.",
    );
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    return null;
  }

  const authUser = data.session?.user;

  if (!authUser) {
    return null;
  }

  try {
    return await getProfileForAuthUser(authUser);
  } catch (error) {
    if (error instanceof AccountDeletedError) {
      await supabase.auth.signOut();
      return null;
    }

    return mapFallbackAuthUser(authUser);
  }
}

export async function refreshCurrentUser(): Promise<AuthUser | null> {
  const currentUser = await getCurrentUser();

  if (currentUser) {
    useAuthStore.getState().setUser(currentUser);
    return currentUser;
  }

  useAuthStore.getState().clearUser();
  return null;
}
