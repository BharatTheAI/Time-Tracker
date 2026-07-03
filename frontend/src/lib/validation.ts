// UX-only mirror of the server-side policy in
// supabase/functions/_shared/passwordPolicy.ts. This exists purely so
// the form can show inline feedback before submitting — the actual
// enforcement happens server-side in create-employee and
// reset-employee-credentials, since a client-side check alone could be
// bypassed by calling those endpoints directly.

export interface PasswordCheck {
  valid: boolean;
  errors: string[];
}

export function validatePasswordClientSide(pw: string): PasswordCheck {
  const errors: string[] = [];

  if (!pw || pw.length < 10) errors.push("At least 10 characters.");
  if (!/[A-Z]/.test(pw)) errors.push("At least one uppercase letter.");
  if (!/[a-z]/.test(pw)) errors.push("At least one lowercase letter.");
  if (!/[0-9]/.test(pw)) errors.push("At least one number.");
  if (!/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\/~`;']/.test(pw)) {
    errors.push("At least one special character.");
  }

  return { valid: errors.length === 0, errors };
}
