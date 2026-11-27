'use client'
import { useState, useEffect } from 'react'

export function useGoldPrice() {
  const [xauUsd, setXauUsd]     = useState<number | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/gold-price')
      .then(r => r.json())
      .then(d => { setXauUsd(d.xau_usd); setLoading(false) })
      .catch(() => { setError('Failed to load gold price'); setLoading(false) })
  }, [])

  return { xauUsd, loading, error }
}
