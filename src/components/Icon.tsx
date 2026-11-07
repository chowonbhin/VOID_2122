import type { ReactNode } from 'react';

// One 24px, rounded-line family for navigation, maps and the photo notebook.
const shapes = {
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  notebook: <path d="M5 3h14v18H5zM9 3v18M3 7h4M3 12h4M3 17h4M12 8h4M12 12h4" />,
  settings: <path d="M4 7h16M4 17h16M9 4v6M15 14v6" />,
  arrowUpRight: <path d="M6 18 18 6M6 6h12v12" />,
  arrowLeft: <path d="M20 12H4m6-6-6 6 6 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
  chevronLeft: <path d="m15 5-7 7 7 7" />,
  chevronRight: <path d="m9 5 7 7-7 7" />,
  camera: <><path d="M3 7h4l2-3h6l2 3h4v13H3z" /><circle cx="12" cy="13" r="4" /><path d="M17 10h1" /></>,
  pin: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
  heart: <path d="M20.4 5.6a5 5 0 0 0-7.1 0L12 7l-1.3-1.4a5 5 0 0 0-7.1 7.1L12 21l8.4-8.3a5 5 0 0 0 0-7.1Z" />,
  home: <path d="m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9" />,
  alert: <><circle cx="12" cy="12" r="9" /><path d="M12 7v6m0 4h.01" /></>,
  check: <path d="m5 12 4 4L19 6" />,
} satisfies Record<string, ReactNode>;

export function Icon({ name, size = 22, className = '' }: { name: keyof typeof shapes; size?: number; className?: string }) {
  return <svg className={`ui-icon ${className}`.trim()} viewBox="0 0 24 24" width={size} height={size}
    fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {shapes[name]}
  </svg>;
}
