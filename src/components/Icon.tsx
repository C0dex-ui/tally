import type { ComponentType, SVGProps } from 'react'
import {
  ArrowsClockwise,
  Bank,
  CalendarBlank,
  Car,
  CaretLeft,
  CaretRight,
  ChartPie,
  Check,
  CreditCard,
  DeviceMobile,
  DotsThree,
  DownloadSimple,
  Flag,
  ForkKnife,
  GasPump,
  Gear,
  Handbag,
  Heart,
  House,
  Info,
  Lightning,
  List,
  MagnifyingGlass,
  PiggyBank,
  Plus,
  Receipt,
  ShieldCheck,
  ShoppingCart,
  Smiley,
  Target,
  Trash,
  UploadSimple,
  Wallet,
  WifiHigh,
  X,
} from '@phosphor-icons/react'

const icons = {
  home: House,
  cart: ShoppingCart,
  utensils: ForkKnife,
  car: Car,
  zap: Lightning,
  heart: Heart,
  smile: Smiley,
  bag: Handbag,
  repeat: ArrowsClockwise,
  more: DotsThree,
  bank: Bank,
  plus: Plus,
  list: List,
  pie: ChartPie,
  flag: Flag,
  settings: Gear,
  search: MagnifyingGlass,
  chevronLeft: CaretLeft,
  chevronRight: CaretRight,
  x: X,
  check: Check,
  download: DownloadSimple,
  upload: UploadSimple,
  trash: Trash,
  calendar: CalendarBlank,
  target: Target,
  wallet: Wallet,
  bill: Receipt,
  info: Info,
  phone: DeviceMobile,
  creditCard: CreditCard,
  wifi: WifiHigh,
  shield: ShieldCheck,
  piggy: PiggyBank,
  device: DeviceMobile,
  gas: GasPump,
} as const

export type IconName = keyof typeof icons

type PhosphorIcon = ComponentType<
  SVGProps<SVGSVGElement> & { size?: number | string; weight?: string }
>

export function isIconName(name: string): name is IconName {
  return name in icons
}

export function Icon({
  name,
  size = 22,
  ...rest
}: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  const Cmp = icons[name] as PhosphorIcon
  return (
    <Cmp
      size={size}
      weight="regular"
      color="currentColor"
      aria-hidden="true"
      {...rest}
    />
  )
}
