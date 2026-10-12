export default function CrossedSwords({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M8 6 L30 28" />
      <path d="M26 33 L35 24" />
      <path d="M31 30 L37 36" />
      <circle cx="38.5" cy="37.5" r="2" />
      <path d="M40 6 L18 28" />
      <path d="M22 33 L13 24" />
      <path d="M17 30 L11 36" />
      <circle cx="9.5" cy="37.5" r="2" />
    </svg>
  );
}
