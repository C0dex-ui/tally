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
import { processAutoLog, syncDailyOverForDate, type AutoLogResult } from '../db/ops.ts'
import type {
  Category,
  DailyOver,
  FundBorrow,
  Goal,
  GoalEvent,
  Recurring,
  RecurringSkip,
  Settings,
  Transaction,
  Utang,
} from '../db/types.ts'
import { dueDayFromIso, monthlyExpenseTotal, paycheckBillShare } from '../lib/responsibilities.ts'
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
import { clampSavePercent, dailyBudget, livingSpendOnDate, livingSpendOnOrAfter } from '../lib/daily.ts'
import { goalAllotmentCents, goalCatchUpThisPeriod } from '../lib/goals.ts'
import { hasPeriodCapital, whatsLeftFromCapital } from '../lib/leftover.ts'

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
  utangs: Utang[]
  dailyOvers: DailyOver[]
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
  hasCapital: boolean
  capitalCents: number
  billAllotmentCents: number
  monthlyBillsCents: number
  goalAllotmentCents: number
  catchUpCents: number
  livingAfterCountCents: number
  whatsLeftCents: number | null
  dailyMaxCents: number
  todayLivingCents: number
  todayOver: boolean
  savePercent: 0 | 5 | 8 | 10
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
        monthlyContributionCents: g.monthlyContributionCents ?? 0,
        startedOn: g.startedOn ?? '',
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
  const utangs = useLiveQuery(() => db.utangs.toArray(), []) ?? []
  const dailyOvers = useLiveQuery(() => db.dailyOvers.toArray(), []) ?? []

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

  const leftover = useMemo(() => {
    const activeBills = recurring.filter((r) => r.active)
    const monthlyBillsCents = monthlyExpenseTotal(activeBills)
    const billAllotmentCents =
      periodMode === 'pay' ? paycheckBillShare(monthlyBillsCents) : 0
    const goalReserveCents = periodMode === 'pay' ? goalAllotmentCents(goals) : 0
    const catchUpCents =
      periodMode === 'pay' ? goalCatchUpThisPeriod(goals, goalEvents, range) : 0
    const hasCapital = hasPeriodCapital(settings, range.start)
    const capitalCents = hasCapital ? (settings.capitalCents ?? 0) : 0
    const livingAfterCountCents = hasCapital
      ? livingSpendOnOrAfter(
          transactions,
          settings.capitalDate || range.start,
          range,
        )
      : 0
    const whatsLeftCents = hasCapital
      ? whatsLeftFromCapital({
          capitalCents,
          billAllotmentCents,
          goalAllotmentCents: goalReserveCents,
          catchUpCents,
          livingAfterCountCents,
        })
      : null
    const todayLivingCents = livingSpendOnDate(transactions, today)
    const savePercent = clampSavePercent(settings.savePercent ?? 10)
    const leftoverBeforeToday =
      whatsLeftCents == null
        ? 0
        : whatsLeftCents +
          (settings.capitalDate && today >= settings.capitalDate ? todayLivingCents : 0)
    const daily = hasCapital
      ? dailyBudget({
          leftoverBeforeTodayCents: leftoverBeforeToday,
          savePercent,
          daysUntilPayday,
        })
      : { dailyMaxCents: 0, floorCents: 0, spendableCents: 0, days: daysUntilPayday }
    const todayOver =
      hasCapital && todayLivingCents > daily.dailyMaxCents && daily.dailyMaxCents >= 0
    return {
      hasCapital,
      capitalCents,
      billAllotmentCents,
      monthlyBillsCents,
      goalAllotmentCents: goalReserveCents,
      catchUpCents,
      livingAfterCountCents,
      whatsLeftCents,
      dailyMaxCents: daily.dailyMaxCents,
      todayLivingCents,
      todayOver,
      savePercent,
    }
  }, [
    recurring,
    periodMode,
    settings,
    range,
    transactions,
    goals,
    goalEvents,
    today,
    daysUntilPayday,
  ])

  useEffect(() => {
    if (!seeded) return
    void syncDailyOverForDate(today)
  }, [seeded, today, leftover.hasCapital, leftover.dailyMaxCents, leftover.todayLivingCents])

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
    utangs,
    dailyOvers,
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
    ...leftover,
  }

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState(): AppStateValue {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider')
  return ctx
}
