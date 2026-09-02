import type { SVGProps } from "react";

const P = {
  dashboard: (
    <>
      <rect height="7" rx="1.5" width="7" x="3" y="3" />
      <rect height="7" rx="1.5" width="7" x="14" y="3" />
      <rect height="7" rx="1.5" width="7" x="14" y="14" />
      <rect height="7" rx="1.5" width="7" x="3" y="14" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.6-3.6" />
    </>
  ),
  rocket: (
    <>
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91 0Z" />
      <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2Z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </>
  ),
  factory: (
    <>
      <path d="M6 22V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v18" />
      <path d="M6 12H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-7" />
      <path d="M9 7h2M9 11h2M17 16h1M17 19h1" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  "user-plus": (
    <>
      <path d="M15 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <path d="M19 8v6M22 11h-6" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.1 14.5a1.6 1.6 0 0 0 .32 1.77l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-.97 1.46V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1.03-1.47 1.6 1.6 0 0 0-1.77.32l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.6 1.6 0 0 0 .32-1.77 1.6 1.6 0 0 0-1.46-.97H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.57 9a1.6 1.6 0 0 0-.32-1.77l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.6 1.6 0 0 0 1.77.32H9a1.6 1.6 0 0 0 .97-1.46V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 .97 1.46 1.6 1.6 0 0 0 1.77-.32l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.6 1.6 0 0 0-.32 1.77V9c.24.58.8.97 1.46.97H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.46.97Z" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M9.2 9.2a3 3 0 0 1 5.8 1c0 2-3 2.6-3 4" />
      <path d="M12 17.5h.01" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8.5a6 6 0 1 0-12 0c0 6.5-2.5 8.5-2.5 8.5h17S18 15 18 8.5" />
      <path d="M13.7 20.5a2 2 0 0 1-3.4 0" />
    </>
  ),
  apps: (
    <>
      {[5, 12, 19].map((y) =>
        [5, 12, 19].map((x) => (
          <circle cx={x} cy={y} fill="currentColor" key={`${x}-${y}`} r="1.6" stroke="none" />
        )),
      )}
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  "chevron-down": <path d="m6 9.5 6 6 6-6" />,
  "chevron-right": <path d="m9.5 6 6 6-6 6" />,
  "arrow-right": <path d="M4 12h15M13 6l6 6-6 6" />,
  "arrow-left": <path d="M20 12H5M11 6l-6 6 6 6" />,
  check: <path d="M20 6.5 9.5 17 4 11.5" />,
  "check-circle": (
    <>
      <circle cx="12" cy="12" r="9.5" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </>
  ),
  x: <path d="M18 6 6 18M6 6l12 12" />,
  map: (
    <>
      <path d="m3 6.5 6-3 6 3 6-3v14l-6 3-6-3-6 3z" />
      <path d="M9 3.5v14M15 6.5v14" />
    </>
  ),
  filter: <path d="M3.5 6.5h17M6.5 12h11M10 17.5h4" />,
  star: (
    <path d="m12 3 2.7 5.5 6 .9-4.35 4.24L17.4 20 12 17.1 6.6 20l1.05-6.36L3.3 9.4l6-.9z" />
  ),
  "map-pin": (
    <>
      <path d="M20 10.5c0 5.5-8 11.5-8 11.5S4 16 4 10.5a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10.3" r="2.8" />
    </>
  ),
  trophy: (
    <>
      <path d="M6.5 4h11v5.5a5.5 5.5 0 0 1-11 0Z" />
      <path d="M6.5 5.5H4.2a2.3 2.3 0 0 0 0 4.6h.8M17.5 5.5h2.3a2.3 2.3 0 0 1 0 4.6H19" />
      <path d="M12 15v3M8 21h8l-.7-3H8.7Z" />
    </>
  ),
  book: (
    <>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 3H20v18H6.5A2.5 2.5 0 0 1 4 18.5v-13A2.5 2.5 0 0 1 6.5 3Z" />
    </>
  ),
  calendar: (
    <>
      <rect height="17" rx="2.5" width="18" x="3" y="4.5" />
      <path d="M16 2.5v4M8 2.5v4M3 10h18" />
    </>
  ),
  award: (
    <>
      <circle cx="12" cy="9" r="5.5" />
      <path d="m15.2 13.6 1.3 7.4L12 18.7 7.5 21l1.3-7.4" />
    </>
  ),
  clipboard: (
    <>
      <rect height="4" rx="1" width="7" x="8.5" y="2.5" />
      <path d="M15.5 4.5H18a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2h2.5" />
      <path d="M8.5 12h7M8.5 16h4.5" />
    </>
  ),
  warning: (
    <>
      <path d="M10.3 3.9 2.1 18a2 2 0 0 0 1.73 3h16.34a2 2 0 0 0 1.73-3l-8.2-14.1a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9.5v4.5M12 17.6h.01" />
    </>
  ),
  heart: (
    <path d="M19 14c1.5-1.46 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5C2 10.8 3.5 12.54 5 14l7 7Z" />
  ),
  message: (
    <path d="M21 15a2 2 0 0 1-2 2H7.5L3 21V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
  ),
  code: <path d="m16 18 5.5-6L16 6M8 6l-5.5 6L8 18" />,
  briefcase: (
    <>
      <rect height="13" rx="2" width="20" x="2" y="7.5" />
      <path d="M16 20.5V5.5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v15" />
      <path d="M2 12.5h20" />
    </>
  ),
  bot: (
    <>
      <rect height="11" rx="2.5" width="17" x="3.5" y="8.5" />
      <path d="M12 4.5v4" />
      <circle cx="12" cy="3.2" fill="currentColor" r="1.2" stroke="none" />
      <path d="M8.8 13h.01M15.2 13h.01" />
      <path d="M9.5 16.5h5" />
    </>
  ),
  scale: (
    <>
      <path d="M12 3.5v17M7 20.5h10" />
      <path d="M4.5 7.5h15l-1.2 3.5" />
      <path d="m4.5 7.5 2.7 6H1.8Z" />
      <path d="m19.5 7.5 2.7 6h-5.4Z" />
    </>
  ),
  "trending-up": (
    <>
      <path d="m3 17 6.2-6.2 3.5 3.5L21 6" />
      <path d="M15.5 6H21v5.5" />
    </>
  ),
  sparkles: (
    <>
      <path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9Z" />
      <path d="m18.5 15 .8 2.1 2.2.9-2.2.9-.8 2.1-.8-2.1-2.2-.9 2.2-.9Z" />
    </>
  ),
  lock: (
    <>
      <rect height="10" rx="2" width="15" x="4.5" y="11" />
      <path d="M8 11V7.5a4 4 0 1 1 8 0V11" />
    </>
  ),
  upload: (
    <>
      <path d="M12 21v-8M8.5 16.5 12 13l3.5 3.5" />
      <path d="M20 16.6A5 5 0 0 0 18 7.5h-1.3A8 8 0 1 0 4 15.5" />
    </>
  ),
  paperclip: (
    <path d="M20.5 11.5 12 20a5.5 5.5 0 0 1-7.8-7.8l8.5-8.5a3.7 3.7 0 1 1 5.2 5.2l-8.5 8.5a1.9 1.9 0 0 1-2.6-2.6l7.8-7.8" />
  ),
  send: (
    <>
      <path d="m21.5 2.5-8 19-3.2-7.8L2.5 10.5Z" />
      <path d="M21.5 2.5 10.3 13.7" />
    </>
  ),
  pause: (
    <>
      <rect height="14" rx="1.3" width="3.6" x="6.5" y="5" />
      <rect height="14" rx="1.3" width="3.6" x="13.9" y="5" />
    </>
  ),
  refresh: (
    <>
      <path d="M20.5 12a8.5 8.5 0 1 1-2.6-6.1" />
      <path d="M21 3.5V10h-6.4" />
    </>
  ),
  "thumbs-up": (
    <>
      <path d="M7 10.5V21" />
      <path d="M14.6 6 13.8 10h5.5a2 2 0 0 1 1.94 2.53l-2 7A2 2 0 0 1 17.3 21H4.5a1.5 1.5 0 0 1-1.5-1.5v-7.5a1.5 1.5 0 0 1 1.5-1.5h2.2a2 2 0 0 0 1.75-1.03L11.6 3a2.9 2.9 0 0 1 3 3Z" />
    </>
  ),
  "alert-circle": (
    <>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M12 7.5v5M12 16.3h.01" />
    </>
  ),
  "more-vertical": (
    <>
      <circle cx="12" cy="5" fill="currentColor" r="1.7" stroke="none" />
      <circle cx="12" cy="12" fill="currentColor" r="1.7" stroke="none" />
      <circle cx="12" cy="19" fill="currentColor" r="1.7" stroke="none" />
    </>
  ),
  graduation: (
    <>
      <path d="M22 9.5 12 4.5 2 9.5l10 5Z" />
      <path d="M6 12v4.6c0 1.7 2.7 3 6 3s6-1.3 6-3V12" />
    </>
  ),
  leaf: (
    <>
      <path d="M11 20.5A7.5 7.5 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.8-4.5 10.5-10 10.5Z" />
      <path d="M2.5 21.5c0-3.2 2-5.7 5.5-6.4" />
    </>
  ),
  landmark: (
    <>
      <path d="M3 21h18M5.5 17.5v-6M10 17.5v-6M14 17.5v-6M18.5 17.5v-6" />
      <path d="m12 3 9 5.5H3Z" />
    </>
  ),
  droplet: (
    <path d="M12 21.5a7 7 0 0 0 7-7c0-2-1.1-3.9-3-5.6C14 7.1 12.6 5 12 2.5 11.4 5 10 7.1 8 8.9 6.1 10.6 5 12.5 5 14.5a7 7 0 0 0 7 7Z" />
  ),
  shield: (
    <>
      <path d="M20 12.5c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9v-7l8-3 8 3Z" />
      <path d="M12 8.5v6M9 11.5h6" />
    </>
  ),
  bulb: (
    <>
      <path d="M9.5 18.5h5M10.5 21.5h3" />
      <path d="M15.1 14.3c.2-1 .7-1.8 1.4-2.5A4.7 4.7 0 0 0 18 8.4a6 6 0 1 0-12 0c0 1.4.6 2.7 1.5 3.4.7.7 1.2 1.5 1.4 2.5" />
    </>
  ),
  "bar-chart": (
    <>
      <path d="M3.5 3.5v17h17" />
      <path d="M8 17v-4.5M13 17V8.5M18 17v-8" />
    </>
  ),
  folder: (
    <path d="M4 20.5h16a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-7.4a2 2 0 0 1-1.6-.83L9.9 4.83A2 2 0 0 0 8.3 4H4a2 2 0 0 0-2 2v12.5a2 2 0 0 0 2 2Z" />
  ),
  "file-pen": (
    <>
      <path d="M14 2.5H6.5a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2H12" />
      <path d="M14 2.5v6h6" />
      <path d="m18.2 13.3-4.7 4.7v2.5H16l4.7-4.7Z" />
    </>
  ),
  banknote: (
    <>
      <rect height="12" rx="2" width="20" x="2" y="6" />
      <circle cx="12" cy="12" r="2.4" />
      <path d="M6 12h.01M18 12h.01" />
    </>
  ),
  download: (
    <>
      <path d="M12 3.5v12M7.5 11 12 15.5 16.5 11" />
      <path d="M4 20.5h16" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M2.5 12h19" />
      <path d="M12 2.5c2.5 2.6 3.9 6 3.9 9.5s-1.4 6.9-3.9 9.5c-2.5-2.6-3.9-6-3.9-9.5s1.4-6.9 3.9-9.5Z" />
    </>
  ),
  zap: <path d="M13 2.5 4 14h7l-1 7.5L20 10h-7.5Z" />,
  eye: (
    <>
      <path d="M2 12s3.8-7 10-7 10 7 10 7-3.8 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  gauge: (
    <>
      <path d="M12 15.5 16 9" />
      <path d="M3 18a9.5 9.5 0 1 1 18 0" />
    </>
  ),
  "arrow-up-right": <path d="M7 17 17 7M8.5 7H17v8.5" />,
  languages: (
    <>
      <path d="M3 5h10M8 3v2" />
      <path d="M11 5c0 4-3.5 7-8 8" />
      <path d="M5 9c0 2 2 4 6 5" />
      <path d="m12 20 4-9 4 9M13.4 17h5.2" />
    </>
  ),
  "volume-on": (
    <>
      <path d="M11 5 6.5 9H3v6h3.5L11 19V5Z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 5.5a9 9 0 0 1 0 13" />
    </>
  ),
  "volume-off": (
    <>
      <path d="M11 5 6.5 9H3v6h3.5L11 19V5Z" />
      <path d="m16 9.5 5 5M21 9.5l-5 5" />
    </>
  ),
} satisfies Record<string, React.ReactNode>;

export type IconName = keyof typeof P;

type IconProps = SVGProps<SVGSVGElement> & {
  name: IconName;
  size?: number;
};

export function Icon({ name, size = 20, className, ...rest }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.7}
      viewBox="0 0 24 24"
      width={size}
      {...rest}
    >
      {P[name]}
    </svg>
  );
}
