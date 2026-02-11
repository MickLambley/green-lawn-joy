/**
 * TEST MODE - Secure activation via URL query parameter + secret key.
 *
 * Security:
 * 1. URL must contain ?test_key=<value> matching VITE_TEST_MODE_SECRET_KEY
 * 2. NODE_ENV must NOT be "production"
 * 3. sessionStorage flag limits activation to the current tab
 * 4. Mock sessions auto-expire after 1 hour
 */

const TEST_MODE_STORAGE_KEY = "lawnly_test_mode_session";
const SESSION_FLAG_KEY = "testModeActive";
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
 * Returns true only when:
 * 1. The URL query param `test_key` matches VITE_TEST_MODE_SECRET_KEY, OR sessionStorage flag is already set
 * 2. NODE_ENV is not "production"
 */
export function isTestModeAllowed(): boolean {
  // Block in production builds
  if (import.meta.env.PROD) {
    return false;
  }

  const secretKey = import.meta.env.VITE_TEST_MODE_SECRET_KEY;
  if (!secretKey) return false;

  // If already activated this tab session, allow
  if (sessionStorage.getItem(SESSION_FLAG_KEY) === "true") {
    return true;
  }

  // Check URL query parameter
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const urlKey = params.get("test_key");
    if (urlKey && urlKey === secretKey) {
      // Set session flag so subsequent navigations within the tab still work
      sessionStorage.setItem(SESSION_FLAG_KEY, "true");
      return true;
    }
  }

  return false;
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
  sessionStorage.setItem(SESSION_FLAG_KEY, "true");

  console.log(
    `%c🧪 TEST MODE ACTIVATED [${new Date().toISOString()}]`,
    "background: #ff0000; color: white; font-size: 14px; padding: 4px 8px;",
    { persona, userId: user.id, expiresAt: new Date(user.expires_at).toISOString() }
  );

  return user;
}

export function getTestModeSession(): TestModeUser | null {
  // Must have sessionStorage flag for current tab
  if (sessionStorage.getItem(SESSION_FLAG_KEY) !== "true") {
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
      sessionStorage.removeItem(SESSION_FLAG_KEY);
      return null;
    }

    return session;
  } catch {
    localStorage.removeItem(TEST_MODE_STORAGE_KEY);
    sessionStorage.removeItem(SESSION_FLAG_KEY);
    return null;
  }
}

export function clearTestModeSession(): void {
  localStorage.removeItem(TEST_MODE_STORAGE_KEY);
  sessionStorage.removeItem(SESSION_FLAG_KEY);
  console.log(
    `%c🧪 TEST MODE DEACTIVATED [${new Date().toISOString()}]`,
    "background: #666; color: white; font-size: 14px; padding: 4px 8px;"
  );
}

export function isTestModeActive(): boolean {
  return getTestModeSession() !== null;
}
