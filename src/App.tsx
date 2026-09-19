import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { AppStateProvider, useAppState } from './context/AppState.tsx'
import { FormShell, Shell } from './components/chrome.tsx'
import { Onboarding } from './features/onboarding/Onboarding.tsx'
import { HomePage } from './features/home/HomePage.tsx'
import { TransactionsPage } from './features/transactions/TransactionsPage.tsx'
import { TransactionForm } from './features/transactions/TransactionForm.tsx'
import { BudgetPage } from './features/budget/BudgetPage.tsx'
import { CategoryForm } from './features/budget/CategoryForm.tsx'
import { GoalsPage } from './features/goals/GoalsPage.tsx'
import { GoalForm } from './features/goals/GoalForm.tsx'
import { BorrowedPage } from './features/goals/BorrowedPage.tsx'
import { MissedPage } from './features/goals/MissedPage.tsx'
import { MorePage } from './features/more/MorePage.tsx'
import { ResponsibilitiesPage } from './features/responsibilities/ResponsibilitiesPage.tsx'
import { ResponsibilityForm } from './features/responsibilities/ResponsibilityForm.tsx'
import { ReportsPage } from './features/reports/ReportsPage.tsx'
import { SettingsPage } from './features/settings/SettingsPage.tsx'

function RecurringIdRedirect() {
  const { id } = useParams()
  return <Navigate to={`/responsibilities/${id}`} replace />
}

function Gate() {
  const { ready, settings } = useAppState()
  if (!ready) return <div className="loading">Loading Tally…</div>
  if (!settings.onboarded) return <Onboarding />
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<HomePage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="responsibilities" element={<ResponsibilitiesPage />} />
        <Route path="budget" element={<BudgetPage />} />
        <Route path="goals" element={<GoalsPage />} />
        <Route path="borrowed" element={<BorrowedPage />} />
        <Route path="missed" element={<MissedPage />} />
        <Route path="more" element={<MorePage />} />
        <Route path="more/recurring" element={<Navigate to="/responsibilities" replace />} />
        <Route path="more/reports" element={<ReportsPage />} />
        <Route path="more/settings" element={<SettingsPage />} />
      </Route>
      <Route element={<FormShell />}>
        <Route path="add" element={<TransactionForm />} />
        <Route path="transactions/:id" element={<TransactionForm />} />
        <Route path="budget/new" element={<CategoryForm />} />
        <Route path="budget/:id" element={<CategoryForm />} />
        <Route path="goals/new" element={<GoalForm />} />
        <Route path="goals/:id" element={<GoalForm />} />
        <Route path="responsibilities/new" element={<ResponsibilityForm />} />
        <Route path="responsibilities/:id" element={<ResponsibilityForm />} />
        <Route path="more/recurring/new" element={<Navigate to="/responsibilities/new" replace />} />
        <Route path="more/recurring/:id" element={<RecurringIdRedirect />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AppStateProvider>
      <BrowserRouter>
        <Gate />
      </BrowserRouter>
    </AppStateProvider>
  )
}
