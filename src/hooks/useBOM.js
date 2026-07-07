import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export function useBOM(robotModelId) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!robotModelId) { setItems([]); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('bom_items')
      .select('*, parts(id, name, description, unit, lead_time_days, link)')
      .eq('robot_model_id', robotModelId)
      .order('parts(name)')
    if (error) toast.error('Failed to load BOM')
    else setItems(data)
    setLoading(false)
  }, [robotModelId])

  useEffect(() => { fetch() }, [fetch])

  const addItem = async (partId, quantityPerUnit) => {
    const { data, error } = await supabase
      .from('bom_items')
      .insert({ robot_model_id: robotModelId, part_id: partId, quantity_per_unit: quantityPerUnit })
      .select('*, parts(id, name, description, unit, lead_time_days, link)')
      .single()
    if (error) { toast.error(error.message); return false }
    setItems(prev => [...prev, data])
    toast.success('Part added to BOM')
    return true
  }

  const updateItem = async (id, updates) => {
    // Accept either a plain qty number (legacy) or an updates object
    const payload = typeof updates === 'object'
      ? { ...updates, updated_at: new Date().toISOString() }
      : { quantity_per_unit: updates, updated_at: new Date().toISOString() }
    const { error } = await supabase
      .from('bom_items')
      .update(payload)
      .eq('id', id)
    if (error) { toast.error(error.message); return false }
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...payload } : i))
    return true
  }

  const removeItem = async (id) => {
    const { error } = await supabase.from('bom_items').delete().eq('id', id)
    if (error) { toast.error(error.message); return false }
    setItems(prev => prev.filter(i => i.id !== id))
    toast.success('Part removed from BOM')
    return true
  }

  return { items, loading, addItem, updateItem, removeItem, refresh: fetch }
}
