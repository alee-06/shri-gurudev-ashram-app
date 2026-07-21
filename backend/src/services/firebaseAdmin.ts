import type { DecodedIdToken } from "firebase-admin/auth";
import {
  cert,
  getApp,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { access, readFile } from "fs/promises";
import { constants as fsConstants } from "fs";
import path from "path";

let firebaseAdminApp: App | null = null;

async function readServiceAccountFile(filePath: string) {
  await access(filePath, fsConstants.R_OK);
  return readFile(filePath, "utf8");
}

async function resolveServiceAccountSource(raw: string) {
  const trimmed = raw.trim();

  if (!trimmed) {
    throw new Error("Firebase Admin service account is not configured");
  }

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return trimmed;
  }

  const candidatePaths = [
    trimmed,
    path.resolve(process.cwd(), trimmed),
    path.resolve(process.cwd(), "backend", trimmed),
  ];

  for (const candidatePath of candidatePaths) {
    try {
      return await readServiceAccountFile(candidatePath);
    } catch {
      // Try the next candidate.
    }
  }

  const unwrapped =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
      ? trimmed.slice(1, -1)
      : trimmed;

  return unwrapped.replace(/\\"/g, '"');
}

async function parseServiceAccount(raw: string) {
  const source = await resolveServiceAccountSource(raw);
  try {
    return JSON.parse(source);
  } catch {
    throw new Error(
      "Firebase Admin service account is malformed. Provide a JSON object, a JSON-stringified value, or a readable path to the credentials file.",
    );
  }
}

async function readServiceAccountFromEnvFile() {
  const envFiles = [
    path.resolve(process.cwd(), "backend", ".env.development"),
    path.resolve(process.cwd(), "backend", ".env"),
    path.resolve(process.cwd(), ".env.development"),
    path.resolve(process.cwd(), ".env"),
  ];

  for (const envFile of envFiles) {
    try {
      const contents = await readFile(envFile, "utf8");
      const match = contents.match(
        /^FIREBASE_SERVICE_ACCOUNT_JSON=([\s\S]*?)(?:\r?\n[A-Z0-9_]+=|$)/m,
      );

      if (match?.[1]) {
        return match[1].trim();
      }
    } catch {
      // Try the next env file.
    }
  }

  return null;
}

async function loadFirebaseServiceAccountSource() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (raw) {
    try {
      await parseServiceAccount(raw);
      return raw;
    } catch {
      // Fall back to the backend env file, which may contain a multiline block.
    }
  }

  const fromEnvFile = await readServiceAccountFromEnvFile();
  if (fromEnvFile) {
    return fromEnvFile;
  }

  if (raw) {
    return raw;
  }

  throw new Error("Firebase Admin service account is not configured");
}

async function getFirebaseAdminApp() {
  if (firebaseAdminApp) {
    return firebaseAdminApp;
  }

  const credential = cert(
    await parseServiceAccount(await loadFirebaseServiceAccountSource()),
  );
  firebaseAdminApp = getApps().length
    ? getApp()
    : initializeApp({ credential });
  return firebaseAdminApp;
}

export async function verifyFirebaseIdToken(
  token: string,
): Promise<DecodedIdToken> {
  return getAuth(await getFirebaseAdminApp()).verifyIdToken(token);
}

export function normalizeFirebasePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("91") && digits.length === 12
    ? digits.slice(2)
    : digits.slice(-10);
}
