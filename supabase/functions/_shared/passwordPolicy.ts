export interface PasswordCheck {
  valid: boolean;
  errors: string[];
}

/**
 * Server-side password policy enforcement. This MUST be the source of
 * truth — any client-side regex is UX-only and can be bypassed by a
 * direct API call, so every code path that sets a password (employee
 * creation, credential reset, self-service change) calls this first.
 *
 * Policy: min 10 chars, at least one uppercase, one lowercase, one
 * digit, one special character.
 */
export function validatePassword(pw: string): PasswordCheck {
  const errors: string[] = [];

  if (!pw || pw.length < 10) {
    errors.push("Password must be at least 10 characters long.");
  }
  if (!/[A-Z]/.test(pw)) {
    errors.push("Password must contain at least one uppercase letter.");
  }
  if (!/[a-z]/.test(pw)) {
    errors.push("Password must contain at least one lowercase letter.");
  }
  if (!/[0-9]/.test(pw)) {
    errors.push("Password must contain at least one number.");
  }
  if (!/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\/~`;']/.test(pw)) {
    errors.push("Password must contain at least one special character.");
  }

  return { valid: errors.length === 0, errors };
}
