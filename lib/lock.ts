import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuration
const TRIAL_DAYS = 30; // Set your trial period here
const FORCE_EXPIRE_FOR_TESTING = false; // Set to true to force immediate expiration for testing
const INSTALL_DATE_KEY = 'mintypos_install_date';
const LOCK_STATUS_KEY = 'mintypos_lock_status';

export interface LockStatus {
  isLocked: boolean;
  installDate: string | null;
  expirationDate: string | null;
  daysRemaining: number;
  message: string;
}

/**
 * Get the installation date (set on first app launch)
 */
async function getInstallDate(): Promise<string> {
  try {
    const existingDate = await AsyncStorage.getItem(INSTALL_DATE_KEY);
    if (existingDate) {
      return existingDate;
    }

    // First time installation - set current date
    const now = new Date().toISOString();
    await AsyncStorage.setItem(INSTALL_DATE_KEY, now);
    return now;
  } catch (error) {
    console.error('Failed to get/set install date:', error);
    return new Date().toISOString();
  }
}

/**
 * Calculate expiration date based on install date
 */
function calculateExpirationDate(installDate: string): string {
  // For testing: force expiration by setting date in the past
  if (FORCE_EXPIRE_FOR_TESTING) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString();
  }

  const install = new Date(installDate);
  const expiration = new Date(install);
  expiration.setDate(expiration.getDate() + TRIAL_DAYS);
  return expiration.toISOString();
}

/**
 * Check if the app should be locked
 */
export async function checkLockStatus(): Promise<LockStatus> {
  try {
    const installDate = await getInstallDate();
    const expirationDate = calculateExpirationDate(installDate);
    const now = new Date();
    const expiration = new Date(expirationDate);

    // Calculate days remaining
    const daysDiff = Math.ceil((expiration.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, daysDiff);

    // Determine if locked
    const isLocked = now >= expiration;

    let message = '';
    if (isLocked) {
      message = `Your trial period has expired. This app can no longer be used.`;
    } else if (daysRemaining <= 7) {
      message = `Trial period expires in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}.`;
    } else {
      message = `Trial period active. ${daysRemaining} days remaining.`;
    }

    return {
      isLocked,
      installDate,
      expirationDate,
      daysRemaining,
      message,
    };
  } catch (error) {
    console.error('Failed to check lock status:', error);
    // On error, allow app to run (fail-safe)
    return {
      isLocked: false,
      installDate: null,
      expirationDate: null,
      daysRemaining: 0,
      message: 'Unable to verify license status.',
    };
  }
}

/**
 * Get formatted date string
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Reset installation date (for development/testing only)
 * WARNING: This should never be exposed in production
 */
export async function resetInstallationDate(): Promise<void> {
  try {
    await AsyncStorage.removeItem(INSTALL_DATE_KEY);
    await AsyncStorage.removeItem(LOCK_STATUS_KEY);
  } catch (error) {
    console.error('Failed to reset installation date:', error);
  }
}
