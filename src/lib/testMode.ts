/**
 * TEST MODE - Local development & AI agent testing only.
 * 
 * Security:
 * 1. VITE_ENABLE_TEST_MODE must be "true"
 * 2. Hard-blocked on any hostname containing "lawnly.com.au"
 */

const TEST_MODE_STORAGE_KEY = "lawnly_test_mode_session";
const TEST_MODE_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

export interface TestModeUser {
  id: string;
  email: string;
  full_name: string;
  role: "user" | "contractor" | "admin";
  profile: Record<string, unknown>;
  created_at: string;
  expires_at: number;
}

export type TestPersona = "customer_new" | "customer_returning" | "contractor_active";

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Returns true only if ALL three conditions are met and no block conditions exist.
 */
export function isTestModeAllowed(): boolean {
  // Hard block: production domain — always false on lawnly.com.au
  if (typeof window !== "undefined" && window.location.hostname.includes("lawnly.com.au")) {
    return false;
  }

  // Only requirement: env var must be explicitly enabled
  const envEnabled = import.meta.env.VITE_ENABLE_TEST_MODE === "true";

  return envEnabled;
}

const PERSONAS: Record<TestPersona, () => TestModeUser> = {
  customer_new: () => ({
    id: generateUUID(),
    email: "test.customer.new@lawnly-test.local",
    full_name: "Test Customer (New)",
    role: "user",
    profile: {
      bookings_completed: 0,
      addresses: [],
    },
    created_at: new Date().toISOString(),
    expires_at: Date.now() + TEST_MODE_EXPIRY_MS,
  }),
  customer_returning: () => ({
    id: generateUUID(),
    email: "test.customer.returning@lawnly-test.local",
    full_name: "Test Customer (Returning)",
    role: "user",
    profile: {
      bookings_completed: 2,
      addresses: [
        { street: "42 Test Street", city: "Melbourne", state: "VIC", postal_code: "3000" },
      ],
    },
    created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    expires_at: Date.now() + TEST_MODE_EXPIRY_MS,
  }),
  contractor_active: () => ({
    id: generateUUID(),
    email: "test.contractor@lawnly-test.local",
    full_name: "Test Contractor (Active)",
    role: "contractor",
    profile: {
      jobs_completed: 5,
      average_rating: 4.8,
      tier: "standard",
      business_name: "Test Lawn Care Co.",
      is_active: true,
      stripe_onboarding_complete: true,
    },
    created_at: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
    expires_at: Date.now() + TEST_MODE_EXPIRY_MS,
  }),
};

export function activateTestMode(persona: TestPersona): TestModeUser {
  if (!isTestModeAllowed()) {
    throw new Error("Test mode is not allowed in this environment");
  }

  const user = PERSONAS[persona]();
  localStorage.setItem(TEST_MODE_STORAGE_KEY, JSON.stringify(user));
  
  console.log(
    `%c🧪 TEST MODE ACTIVATED [${new Date().toISOString()}]`,
    "background: #ff0000; color: white; font-size: 14px; padding: 4px 8px;",
    { persona, userId: user.id, expiresAt: new Date(user.expires_at).toISOString() }
  );

  return user;
}

export function getTestModeSession(): TestModeUser | null {
  if (!isTestModeAllowed()) {
    // Silently clear any stale test sessions in non-allowed environments
    localStorage.removeItem(TEST_MODE_STORAGE_KEY);
    return null;
  }

  try {
    const raw = localStorage.getItem(TEST_MODE_STORAGE_KEY);
    if (!raw) return null;

    const session: TestModeUser = JSON.parse(raw);

    // Check expiry
    if (Date.now() > session.expires_at) {
      console.log("🧪 Test mode session expired, clearing.");
      localStorage.removeItem(TEST_MODE_STORAGE_KEY);
      return null;
    }

    return session;
  } catch {
    localStorage.removeItem(TEST_MODE_STORAGE_KEY);
    return null;
  }
}

export function clearTestModeSession(): void {
  localStorage.removeItem(TEST_MODE_STORAGE_KEY);
  console.log(
    `%c🧪 TEST MODE DEACTIVATED [${new Date().toISOString()}]`,
    "background: #666; color: white; font-size: 14px; padding: 4px 8px;"
  );
}

export function isTestModeActive(): boolean {
  return getTestModeSession() !== null;
}
