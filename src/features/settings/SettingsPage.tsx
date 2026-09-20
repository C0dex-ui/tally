import { useRef, useState } from 'react'
import { Icon } from '../../components/Icon.tsx'
import { ConfirmDialog } from '../../components/display.tsx'
import { useAppState } from '../../context/AppState.tsx'
import { updateSettings } from '../../db/ops.ts'
import { exportBackup, importBackup, parseBackup, resetAllData } from '../../db/backup.ts'
import { CURRENCIES } from '../../lib/money.ts'
import { THEMES, type PeriodMode, type ThemePref } from '../../db/types.ts'
import { SAVE_PERCENTS, clampSavePercent } from '../../lib/daily.ts'
import { PaydaySelect } from '../../components/fields.tsx'
import { useInstall } from '../../features/install/useInstall.ts'

export function SettingsPage() {
  const { settings } = useAppState()
  const fileRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState('')
  const [importMode, setImportMode] = useState<'replace' | 'merge' | null>(null)
  const [pendingFile, setPendingFile] = useState<BackupFileHolder | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetTyped, setResetTyped] = useState('')
  const install = useInstall()

  async function onExport() {
    const backup = await exportBackup()
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tally-backup-${backup.exportedAt.slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMessage('Backup downloaded. Keep it somewhere safe.')
  }

  function onPickFile(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = parseBackup(JSON.parse(String(reader.result)))
        setPendingFile({ data: parsed })
        setImportMode('replace')
      } catch (err) {
        setMessage(err instanceof Error ? err.message : 'Could not read that file.')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="stack-lg">
      <div>
        <p className="page-kicker">Device</p>
        <h1 className="page-title">Settings</h1>
      </div>

      <section className="card stack">
        <div className="field">
          <label htmlFor="display-name">Name</label>
          <input
            id="display-name"
            value={settings.displayName ?? ''}
            onChange={(e) => void updateSettings({ displayName: e.target.value })}
            placeholder="Leonel"
          />
        </div>
        <div className="field">
          <label htmlFor="currency">Currency</label>
          <select
            id="currency"
            value={settings.currency}
            onChange={(e) => void updateSettings({ currency: e.target.value })}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <span className="label">Track by</span>
          <div className="seg">
            <button
              type="button"
              className={settings.periodMode !== 'month' ? 'on' : ''}
              onClick={() => void updateSettings({ periodMode: 'pay' as PeriodMode })}
            >
              Paycheck
            </button>
            <button
              type="button"
              className={settings.periodMode === 'month' ? 'on' : ''}
              onClick={() => void updateSettings({ periodMode: 'month' as PeriodMode })}
            >
              Calendar month
            </button>
          </div>
          <p className="hint">Each paycheck is tracked separately.</p>
        </div>
        {settings.periodMode === 'month' ? (
          <div className="field">
            <label htmlFor="month-start">Month starts on day</label>
            <input
              id="month-start"
              type="number"
              min={1}
              max={28}
              value={settings.monthStartDay}
              onChange={(e) =>
                void updateSettings({
                  monthStartDay: Math.min(28, Math.max(1, Number(e.target.value) || 1)),
                })
              }
            />
          </div>
        ) : (
          <>
            <PaydaySelect
              id="payday-1"
              label="First payday"
              value={settings.payday1 ?? 1}
              onChange={(payday1) => void updateSettings({ payday1 })}
            />
            <PaydaySelect
              id="payday-2"
              label="Second payday"
              value={settings.payday2 ?? 16}
              onChange={(payday2) => void updateSettings({ payday2 })}
            />
          </>
        )}
        <div className="field">
          <span className="label">Save until payday</span>
          <div className="seg" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
            {SAVE_PERCENTS.map((p) => (
              <button
                key={p}
                type="button"
                className={clampSavePercent(settings.savePercent ?? 10) === p ? 'on' : ''}
                onClick={() => void updateSettings({ savePercent: p })}
              >
                {p}%
              </button>
            ))}
          </div>
          <p className="hint">This share is reserved. The remainder is your daily limit, split by days left.</p>
        </div>
        <div className="field">
          <span className="label">Theme</span>
          <div className="seg" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
            {THEMES.map((t) => (
              <button
                key={t}
                type="button"
                className={settings.theme === t ? 'on' : ''}
                onClick={() => void updateSettings({ theme: t as ThemePref })}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="card stack">
        <h2>Install on your phone</h2>
        {install.standalone ? (
          <p className="hint">Already installed.</p>
        ) : install.canPrompt ? (
          <button type="button" className="btn btn-primary" onClick={() => void install.prompt()}>
            Install Tally
          </button>
        ) : install.ios ? (
          <ol className="install-steps">
            <li>Open this page in Safari.</li>
            <li>Tap the Share button.</li>
            <li>Tap Add to Home Screen.</li>
          </ol>
        ) : (
          <ol className="install-steps">
            <li>Open the browser menu.</li>
            <li>Choose Install app or Add to Home screen.</li>
          </ol>
        )}
      </section>

      <section className="card stack">
        <h2>Backup</h2>
        <p className="hint">Data stays on this device. Export a backup to keep a copy.</p>
        <button type="button" className="btn btn-primary" onClick={() => void onExport()}>
          <Icon name="download" size={18} /> Export JSON
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => fileRef.current?.click()}>
          <Icon name="upload" size={18} /> Import JSON
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onPickFile(file)
            e.target.value = ''
          }}
        />
        {message ? <p className="hint">{message}</p> : null}
      </section>

      <section className="card stack">
        <h2>Danger</h2>
        <button type="button" className="btn btn-danger" onClick={() => setResetOpen(true)}>
          Reset all data
        </button>
      </section>

      <ConfirmDialog
        open={importMode !== null && pendingFile !== null}
        title={importMode === 'merge' ? 'Merge this backup?' : 'Replace everything?'}
        body={
          importMode === 'merge'
            ? 'Adds missing records. Existing ones stay.'
            : 'Replaces everything on this device.'
        }
        confirmLabel={importMode === 'merge' ? 'Merge' : 'Replace'}
        danger={importMode === 'replace'}
        onCancel={() => {
          if (importMode === 'replace' && pendingFile) {
            setImportMode('merge')
            return
          }
          setImportMode(null)
          setPendingFile(null)
        }}
        onConfirm={() => {
          if (!pendingFile || !importMode) return
          void importBackup(pendingFile.data, importMode).then(() => {
            setMessage(importMode === 'replace' ? 'Backup restored.' : 'Backup merged.')
            setImportMode(null)
            setPendingFile(null)
          })
        }}
      />

      {resetOpen ? (
        <div className="overlay" role="dialog" aria-modal="true">
          <div className="sheet">
            <h2>Reset all data?</h2>
            <p className="hint">Type DELETE to confirm.</p>
            <div className="field" style={{ marginTop: 12 }}>
              <label htmlFor="reset-type">Confirmation</label>
              <input
                id="reset-type"
                value={resetTyped}
                onChange={(e) => setResetTyped(e.target.value)}
              />
            </div>
            <div className="btn-row" style={{ marginTop: 16 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setResetOpen(false)
                  setResetTyped('')
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={resetTyped !== 'DELETE'}
                onClick={() => {
                  void resetAllData().then(() => {
                    setResetOpen(false)
                    setResetTyped('')
                  })
                }}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

interface BackupFileHolder {
  data: ReturnType<typeof parseBackup>
}
