/** Shared rules for signup + password reset (client + tests). */

export const NEW_PASSWORD_HINT = "Use at least 8 characters.";

export function isValidNewPassword(password: string): boolean {
  return password.trim().length >= 8;
}
