import crypto from 'crypto';

const OTP_TTL_MS = 10 * 60 * 1000;

function secret(): string {
  return (
    process.env.OTP_SECRET ??
    process.env.RESEND_API_KEY ??
    process.env.RAZORPAY_KEY_SECRET ??
    ''
  );
}

function sign(data: string): string {
  return crypto.createHmac('sha256', secret()).update(data).digest('hex');
}

export function generateOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

export function createOtpToken(
  email: string,
  code: string
): { token: string; expiresAt: number } {
  const expiresAt = Date.now() + OTP_TTL_MS;
  const normEmail = email.toLowerCase();
  const payload = `${normEmail}.${code}.${expiresAt}`;
  // base64url has no dots, so splitting the token on '.' always yields
  // exactly 4 parts regardless of how many dots the email itself contains.
  const emailEnc = Buffer.from(normEmail).toString('base64url');
  return { token: `${emailEnc}.${code}.${expiresAt}.${sign(payload)}`, expiresAt };
}

export function verifyOtpToken(
  token: string,
  email: string,
  code: string
): boolean {
  const parts = token.split('.');
  if (parts.length !== 4) return false;
  const [emailEnc, tokenCode, tokenExpiresAt, tokenSig] = parts;

  let tokenEmail: string;
  try {
    tokenEmail = Buffer.from(emailEnc, 'base64url').toString('utf8');
  } catch {
    return false;
  }

  if (tokenEmail !== email.toLowerCase()) return false;
  if (tokenCode !== code.trim()) return false;
  if (Date.now() > Number(tokenExpiresAt)) return false;

  const payload = `${tokenEmail}.${tokenCode}.${tokenExpiresAt}`;
  const expected = sign(payload);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(tokenSig));
  } catch {
    return false;
  }
}

const RESET_TTL_MS = 15 * 60 * 1000;

/** Issues a signed, email-bound reset token (base64url.email.expiresAt.sig). */
export function createResetToken(email: string): string {
  const expiresAt = Date.now() + RESET_TTL_MS;
  const normEmail = email.toLowerCase();
  const payload = `${normEmail}.${expiresAt}`;
  return `${Buffer.from(normEmail).toString('base64url')}.${expiresAt}.${sign(payload)}`;
}

/** Verifies a reset token produced by createResetToken for the given email. */
export function verifyResetToken(token: string, email: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [emailEnc, tokenExpiresAt, tokenSig] = parts;

  let tokenEmail: string;
  try {
    tokenEmail = Buffer.from(emailEnc, 'base64url').toString('utf8');
  } catch {
    return false;
  }

  if (tokenEmail !== email.toLowerCase()) return false;
  if (Date.now() > Number(tokenExpiresAt)) return false;

  const payload = `${tokenEmail}.${tokenExpiresAt}`;
  const expected = sign(payload);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(tokenSig));
  } catch {
    return false;
  }
}
