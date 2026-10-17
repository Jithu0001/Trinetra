/** Trinetra mark: an open eye with a third eye above it. Takes its colour from the surrounding text colour. */
export default function Logo({ size = 32, className = '' }) {
  return (
    <svg className={className} viewBox="0 0 48 48" width={size} height={size} aria-hidden="true" focusable="false">
      <path d="M3.5 29C8.5 21 15.5 17 24 17s15.5 4 20.5 12c-5 8-12 12-20.5 12S8.5 37 3.5 29z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="24" cy="29" r="6.5" fill="#ff5a1f" />
      <circle cx="24" cy="29" r="2.4" fill="#fff" />
      <path d="M24 3c2.6 3 4 5.6 4 8s-1.4 4-4 4-4-1.6-4-4 1.4-5 4-8z" fill="currentColor" />
    </svg>
  );
}
