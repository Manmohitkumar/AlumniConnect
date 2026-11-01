import { useCallback, useEffect, useState } from 'react'
import { apiGet } from './apiClient'

export function useApi<T>(path: string | null, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(Boolean(path))
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!path) {
      setLoading(false)
      return
    }
    let active = true
    let lastRefresh = Date.now()

    // Silent reloads keep cross-portal updates fresh without a loading flash.
    const load = (silent: boolean) => {
      if (!silent) {
        setLoading(true)
        setError(null)
      }
      apiGet<T>(path)
        .then((result) => {
          if (!active) return
          setData(result)
          setError(null)
        })
        .catch((cause: unknown) => {
          if (active && !silent) setError(cause instanceof Error ? cause.message : 'Request failed')
        })
        .finally(() => {
          if (active && !silent) setLoading(false)
        })
    }

    const refresh = (force = false) => {
      if (document.visibilityState !== 'visible') return
      const now = Date.now()
      if (!force && now - lastRefresh < 3000) return
      lastRefresh = now
      load(true)
    }
    const onFocus = () => refresh()
    const onVisibility = () => refresh()
    // The shell dispatches this after its poll finds a notification for this user.
    const onAppRefresh = () => refresh(true)

    load(false)
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('app:refresh', onAppRefresh)
    return () => {
      active = false
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('app:refresh', onAppRefresh)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, version, ...deps])

  const reload = useCallback(() => setVersion((value) => value + 1), [])
  return { data, error, loading, reload, setData }
}

export function useAction() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const run = useCallback(async <T,>(fn: () => Promise<T>, message?: string): Promise<T | null> => {
    setPending(true)
    setError(null)
    setSuccess(null)
    try {
      const result = await fn()
      if (message) setSuccess(message)
      return result
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Action failed')
      return null
    } finally {
      setPending(false)
    }
  }, [])

  const clear = useCallback(() => {
    setError(null)
    setSuccess(null)
  }, [])

  return { run, pending, error, success, clear }
}
