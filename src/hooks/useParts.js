import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export function useParts() {
  const [parts, setParts] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('parts')
      .select('*')
      .order('created_at', { ascending: true })
    if (error) toast.error('Failed to load parts')
    else setParts(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const addPart = async (part) => {
    const { data, error } = await supabase
      .from('parts')
      .insert(part)
      .select()
      .single()
    if (error) { toast.error(error.message); return null }
    setParts(prev => [...prev, data])
    toast.success(`${data.name} added`)
    return data
  }

  const updatePart = async (id, updates) => {
    const { error } = await supabase
      .from('parts')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) { toast.error(error.message); return false }
    setParts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
    return true
  }

  const deletePart = async (id) => {
    const { error } = await supabase.from('parts').delete().eq('id', id)
    if (error) { toast.error(error.message); return false }
    setParts(prev => prev.filter(p => p.id !== id))
    toast.success('Part deleted')
    return true
  }

  const lowStockParts = parts.filter(p => p.stock_level <= p.reorder_threshold)

  return { parts, loading, lowStockParts, addPart, updatePart, deletePart, refresh: fetch }
}
