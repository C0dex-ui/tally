import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function useInstall() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [standalone, setStandalone] = useState(false)
  const ios =
    typeof navigator !== 'undefined' &&
    /iphone|ipad|ipod/i.test(navigator.userAgent)

  useEffect(() => {
    const media = window.matchMedia('(display-mode: standalone)')
    const nav = navigator as Navigator & { standalone?: boolean }
    const check = () => setStandalone(media.matches || nav.standalone === true)
    check()
    media.addEventListener('change', check)
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => {
      media.removeEventListener('change', check)
      window.removeEventListener('beforeinstallprompt', onPrompt)
    }
  }, [])

  return {
    ios,
    standalone,
    canPrompt: Boolean(deferred),
    prompt: async () => {
      if (!deferred) return
      await deferred.prompt()
      await deferred.userChoice
      setDeferred(null)
    },
  }
}
