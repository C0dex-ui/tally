import type { ReactNode, SVGProps } from 'react'

const icons = {
  home: (
    <>
      <path d="M4 10.5 12 4l8 6.5" />
      <path d="M6.5 9.8V20h11V9.8" />
    </>
  ),
  cart: (
    <>
      <path d="M5 7h14l-1.2 9.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 7Z" />
      <path d="M8 7V5.5A2.5 2.5 0 0 1 10.5 3h3A2.5 2.5 0 0 1 16 5.5V7" />
    </>
  ),
  utensils: (
    <>
      <path d="M7 3v8" />
      <path d="M5 3v5a2 2 0 0 0 4 0V3" />
      <path d="M7 11v10" />
      <path d="M17 3v10" />
      <path d="M15 3h4v4a2 2 0 0 1-2 2" />
      <path d="M17 13v8" />
    </>
  ),
  car: (
    <>
      <path d="M4 14h16v4H4z" />
      <path d="M6 14 7.5 9.5h9L18 14" />
      <path d="M7 18.5v1.5" />
      <path d="M17 18.5v1.5" />
    </>
  ),
  zap: <path d="M13 3 6 13h6l-1 8 8-11h-6l1-7Z" />,
  heart: (
    <path d="M12 19s-7-4.4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.6-7 9-7 9Z" />
  ),
  smile: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M8.5 14.5s1.5 2 3.5 2 3.5-2 3.5-2" />
      <path d="M9 10h.01" />
      <path d="M15 10h.01" />
    </>
  ),
  bag: (
    <>
      <path d="M6 8h12l-1 12H7L6 8Z" />
      <path d="M9 8V7a3 3 0 0 1 6 0v1" />
    </>
  ),
  repeat: (
    <>
      <path d="M17 3v4h-4" />
      <path d="M7 21v-4h4" />
      <path d="M17 7A7 7 0 0 0 6 10" />
      <path d="M7 17a7 7 0 0 0 11-3" />
    </>
  ),
  more: (
    <>
      <circle cx="6" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="18" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  bank: (
    <>
      <path d="M4 10h16" />
      <path d="M12 4 4 10h16L12 4Z" />
      <path d="M6 10v7" />
      <path d="M10 10v7" />
      <path d="M14 10v7" />
      <path d="M18 10v7" />
      <path d="M4 17h16" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  list: (
    <>
      <path d="M8 7h12" />
      <path d="M8 12h12" />
      <path d="M8 17h12" />
      <path d="M4 7h.01" />
      <path d="M4 12h.01" />
      <path d="M4 17h.01" />
    </>
  ),
  pie: (
    <>
      <path d="M12 4a8 8 0 1 0 8 8h-8V4Z" />
      <path d="M12 4a8 8 0 0 1 8 8" />
    </>
  ),
  flag: <path d="M6 4v16M6 5h11l-2 4 2 4H6" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 4v2M12 18v2M4 12h2M18 12h2M6.2 6.2l1.4 1.4M16.4 16.4l1.4 1.4M17.8 6.2l-1.4 1.4M7.6 16.4l-1.4 1.4" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="m16 16 4 4" />
    </>
  ),
  chevronLeft: <path d="M14.5 6 9 12l5.5 6" />,
  chevronRight: <path d="M9.5 6 15 12l-5.5 6" />,
  x: (
    <>
      <path d="M7 7l10 10" />
      <path d="M17 7 7 17" />
    </>
  ),
  check: <path d="M5 12.5 9.5 17 19 7" />,
  download: (
    <>
      <path d="M12 5v10" />
      <path d="m8 11 4 4 4-4" />
      <path d="M5 19h14" />
    </>
  ),
  upload: (
    <>
      <path d="M12 19V9" />
      <path d="m8 13 4-4 4 4" />
      <path d="M5 19h14" />
    </>
  ),
  trash: (
    <>
      <path d="M5 8h14" />
      <path d="M9 8V6h6v2" />
      <path d="M7 8l1 12h8l1-12" />
    </>
  ),
  calendar: (
    <>
      <path d="M6 6h12v13H6z" />
      <path d="M6 10h12" />
      <path d="M9 4v4" />
      <path d="M15 4v4" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  wallet: (
    <>
      <path d="M4 8h16v11H4z" />
      <path d="M4 8V6.5A1.5 1.5 0 0 1 5.5 5H16" />
      <path d="M16 13h4v3h-4a1.5 1.5 0 0 1 0-3Z" />
    </>
  ),
  bill: (
    <>
      <path d="M6 5h12v14H6z" />
      <path d="M9 9h6" />
      <path d="M9 13h6" />
      <path d="M9 17h4" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </>
  ),
  phone: (
    <>
      <path d="M8 3h8v18H8z" />
      <path d="M11 18h2" />
    </>
  ),
} as const

export type IconName = keyof typeof icons

export function isIconName(name: string): name is IconName {
  return name in icons
}

export function Icon({
  name,
  size = 22,
  ...rest
}: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {icons[name] as ReactNode}
    </svg>
  )
}
