// Original shared paths. Decorative icons inherit the surrounding control color.
const paths = {
  diagonal: 'M5 19 19 5M5 5h14v14',
  right: 'M4 12h16M13 5l7 7-7 7',
  left: 'M20 12H4M11 5l-7 7 7 7',
  close: 'm6 6 12 12M6 18 18 6',
  menu: 'M4 8h16M4 16h16',
  move: 'M12 3v18M3 12h18m-12-6 3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3m12-6 3 3-3 3',
} as const;
export function Icon({ name = 'diagonal' }: { name?: keyof typeof paths }) {
  return (
    <svg
      className="ui-icon"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name]} />
    </svg>
  );
}
