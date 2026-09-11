import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, ensureSeeded } from '../db/index.ts'
import { processAutoLog, type AutoLogResult } from '../db/ops.ts'
import type {
  Category,
  FundBorrow,
  Goal,
  GoalEvent,
  Recurring,
  RecurringSkip,
  Settings,
  Transaction,
} from '../db/types.ts'
import { dueDayFromIso } from '../lib/responsibilities.ts'
import { DEFAULT_SETTINGS } from '../db/seed.ts'
import {
  addDays,
  formatMonthLabel,
  monthRangeForDate,
  todayISO,
} from '../lib/dates.ts'
import {
  daysUntil,
  formatPeriodLabel,
  payPeriodRangeForDate,
} from '../lib/payPeriod.ts'

interface AppStateValue {
  ready: boolean
  settings: Settings
  categories: Category[]
  transactions: Transaction[]
  recurring: Recurring[]
  recurringSkips: RecurringSkip[]
  goals: Goal[]
  goalEvents: GoalEvent[]
  fundBorrows: FundBorrow[]
  categoryMap: Map<string, Category>
  currency: string
  monthStartDay: number
  periodMode: 'pay' | 'month'
  payday1: number
  payday2: number
  today: string
  anchorISO: string
  range: { start: string; end: string }
  monthLabel: string
  nextPayday: string
  daysUntilPayday: number
  goPrevMonth: () => void
  goNextMonth: () => void
  goThisMonth: () => void
  justLogged: AutoLogResult['logged']
  dismissLogged: () => void
}

const AppStateContext = createContext<AppStateValue | null>(null)

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [seeded, setSeeded] = useState(false)
  const [anchorISO, setAnchorISO] = useState(todayISO)
  const [justLogged, setJustLogged] = useState<AutoLogResult['logged']>([])
  const today = todayISO()

  useEffect(() => {
    void ensureSeeded().then(() => setSeeded(true))
  }, [])

  useEffect(() => {
    if (!seeded) return
    let cancelled = false
    const run = () => {
      void processAutoLog(todayISO()).then((result) => {
        if (!cancelled && result.logged.length) {
          setJustLogged((prev) => [...result.logged, ...prev])
        }
      })
    }
    run()
    const onVis = () => {
      if (document.visibilityState === 'visible') run()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [seeded])

  const settingsRaw = useLiveQuery(() => db.settings.get(1), [])
  const settings = { ...DEFAULT_SETTINGS, ...settingsRaw }
  const categories = useLiveQuery(() => db.categories.orderBy('sortOrder').toArray(), []) ?? []
  const transactions =
    useLiveQuery(() => db.transactions.orderBy('date').reverse().toArray(), []) ?? []
  const recurringRaw = useLiveQuery(() => db.recurring.toArray(), []) ?? []
  const recurring = useMemo(
    () =>
      recurringRaw.map((r) => ({
        ...r,
        dueDay: r.dueDay ?? dueDayFromIso(r.nextDate),
      })),
    [recurringRaw],
  )
  const recurringSkips = useLiveQuery(() => db.recurringSkips.toArray(), []) ?? []
  const goalsRaw = useLiveQuery(() => db.goals.toArray(), []) ?? []
  const goals = useMemo(
    () =>
      goalsRaw.map((g) => ({
        ...g,
        allowedUses: Array.isArray(g.allowedUses) ? g.allowedUses : [],
      })),
    [goalsRaw],
  )
  const goalEventsRaw = useLiveQuery(() => db.goalEvents.toArray(), []) ?? []
  const goalEvents = useMemo(
    () =>
      goalEventsRaw.map((e) => ({
        ...e,
        purpose: e.purpose ?? e.notes ?? '',
      })),
    [goalEventsRaw],
  )
  const fundBorrows = useLiveQuery(() => db.fundBorrows.toArray(), []) ?? []

  useEffect(() => {
    const root = document.documentElement
    const apply = () => {
      if (settings.theme === 'system') {
        root.dataset.theme = window.matchMedia('(prefers-color-scheme: dark)')
          .matches
          ? 'dark'
          : 'light'
      } else {
        root.dataset.theme = settings.theme
      }
    }
    apply()
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [settings.theme])

  const monthStartDay = settings.monthStartDay
  const periodMode = settings.periodMode ?? 'pay'
  const payday1 = settings.payday1 ?? 1
  const payday2 = settings.payday2 ?? 16
  const range = useMemo(
    () =>
      periodMode === 'pay'
        ? payPeriodRangeForDate(anchorISO, payday1, payday2)
        : monthRangeForDate(anchorISO, monthStartDay),
    [anchorISO, periodMode, payday1, payday2, monthStartDay],
  )
  const monthLabel =
    periodMode === 'pay'
      ? formatPeriodLabel(range)
      : formatMonthLabel(range, monthStartDay)
  const nextPayday = addDays(range.end, 1)
  const daysUntilPayday = daysUntil(today, nextPayday)
  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  )

  const value: AppStateValue = {
    ready: seeded,
    settings,
    categories,
    transactions,
    recurring,
    recurringSkips,
    goals,
    goalEvents,
    fundBorrows,
    categoryMap,
    currency: settings.currency,
    monthStartDay,
    periodMode,
    payday1,
    payday2,
    today,
    anchorISO,
    range,
    monthLabel,
    nextPayday,
    daysUntilPayday,
    goPrevMonth: () => setAnchorISO(addDays(range.start, -1)),
    goNextMonth: () => setAnchorISO(addDays(range.end, 1)),
    goThisMonth: () => setAnchorISO(todayISO()),
    justLogged,
    dismissLogged: () => setJustLogged([]),
  }

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState(): AppStateValue {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider')
  return ctx
}
