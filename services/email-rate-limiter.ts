const LIMIT = parseInt(process.env.EMAIL_RATE_LIMIT_PER_HOUR || '60', 10);
let windowStart = Date.now();
let count = 0;

/** Returns false (and does NOT increment) if the hourly limit has been reached. */
export function checkEmailRateLimit(): boolean {
  const now = Date.now();
  if (now - windowStart > 3_600_000) { windowStart = now; count = 0; }
  if (count >= LIMIT) return false;
  count++;
  return true;
}
