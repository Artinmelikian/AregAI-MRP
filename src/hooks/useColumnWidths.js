import { useState, useCallback } from 'react'

export function useColumnWidths(storageKey, defaults) {
  const [widths, setWidths] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '{}')
      return { ...defaults, ...saved }
    } catch {
      return { ...defaults }
    }
  })

  const setWidth = useCallback((key, value) => {
    setWidths(prev => {
      const next = { ...prev, [key]: value }
      localStorage.setItem(storageKey, JSON.stringify(next))
      return next
    })
  }, [storageKey])

  return [widths, setWidth]
}
