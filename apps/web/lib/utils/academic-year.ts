/**
 * Academic year utility — compute current academic year from date per Constitution §8.
 * Format: "YYYY-YYYY" (e.g. "2025-2026"). US cycle: Jul onward = year–(year+1); Jan–Jun = (year-1)–year.
 *
 * @deprecated Use profile-derived academic year via awardYearToAcademicYear(profile.award_year) instead.
 * Application and discovery flows must use user's target award year, not system clock. Kept for legacy fallbacks only.
 */
export function getCurrentAcademicYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed: Jan=0, Jul=6

  if (month >= 6) {
    return `${year}-${year + 1}`;
  }
  return `${year - 1}-${year}`;
}
