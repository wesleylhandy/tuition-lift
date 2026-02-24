/**
 * LogoPlaceholder — inline SVG "TL" monogram, replaceable when final logo available.
 * @see contracts/component-shell.md, FR-009
 */
export function LogoPlaceholder({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`h-9 w-9 text-navy ${className}`}
      aria-hidden
    >
      {/* T: top bar + stem */}
      <path d="M8 10h32v4H26v24h-4V14H8v-4z" fill="currentColor" />
      {/* L: stem + base */}
      <path d="M28 10h4v20h8v4H28V10z" fill="currentColor" />
    </svg>
  );
}
