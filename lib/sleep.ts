/** Minutes between bed and wake (handles crossing midnight). */
export function sleepMinutes(bed: string, wake: string): number {
  const [bh, bm] = bed.split(":").map(Number);
  const [wh, wm] = wake.split(":").map(Number);
  let m = wh * 60 + wm - (bh * 60 + bm);
  if (m <= 0) m += 24 * 60;
  return m;
}

/**
 * Sleep score 0–100 (inspired by watchOS 26): duration (50), quality self-rating (30),
 * bedtime regularity — earlier than 00:30 scores best (20).
 */
export function sleepScore(bed: string, wake: string, quality: number): number {
  const hrs = sleepMinutes(bed, wake) / 60;
  const duration = hrs >= 7 && hrs <= 9 ? 50 : Math.max(0, 50 - Math.abs(hrs < 7 ? 7 - hrs : hrs - 9) * 15);
  const q = (Math.min(5, Math.max(1, quality)) / 5) * 30;
  const [bh, bm] = bed.split(":").map(Number);
  // minutes after 22:00, wrapping past midnight
  let late = (bh * 60 + bm - 22 * 60 + 24 * 60) % (24 * 60);
  if (late > 12 * 60) late = 0; // bed before 22:00
  const timing = late <= 150 ? 20 : Math.max(0, 20 - (late - 150) / 9);
  return Math.round(duration + q + timing);
}
