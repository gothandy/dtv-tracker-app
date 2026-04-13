const LIMIT = parseInt(process.env.EMAIL_RATE_LIMIT_PER_HOUR || '60', 10);
let windowStart = Date.now();
let count = 0;

function resetIfExpired() {
  if (Date.now() - windowStart > 3_600_000) { windowStart = Date.now(); count = 0; }
}

/** Returns false if the hourly limit has already been reached. Does not increment. */
export function isEmailRateLimited(): boolean {
  resetIfExpired();
  return count >= LIMIT;
}

/** Record one successfully sent email against the quota. */
export function recordEmailSent(): void {
  resetIfExpired();
  count++;
}
