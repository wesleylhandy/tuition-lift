/**
 * Academic year utilities for award-year-driven logic (014).
 * Format: "YYYY-YYYY" (e.g. "2027-2028"). US cycle: Fall YYYY through Spring YYYY+1.
 */

/**
 * Converts an award year (e.g. 2027) to academic year string "YYYY-YYYY".
 * Award year 2027 = student starting fall 2027 → academic year "2027-2028".
 */
export function awardYearToAcademicYear(yr: number): string {
  return `${yr}-${yr + 1}`;
}
