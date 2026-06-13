import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export function useProductionPlans() {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('production_plans')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) toast.error('Failed to load saved plans')
    else setPlans(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const savePlan = async ({ name, targetDate, batch, feasible }) => {
    const { data, error } = await supabase
      .from('production_plans')
      .insert({ name, target_date: targetDate, batch, feasible })
      .select()
      .single()
    if (error) { toast.error(error.message); return null }
    setPlans(prev => [data, ...prev])
    toast.success('Plan saved')
    return data
  }

  const updatePlan = async (id, { name, targetDate, batch, feasible }) => {
    const payload = { updated_at: new Date().toISOString() }
    if (name !== undefined) payload.name = name
    if (targetDate !== undefined) payload.target_date = targetDate
    if (batch !== undefined) payload.batch = batch
    if (feasible !== undefined) payload.feasible = feasible

    const { error } = await supabase.from('production_plans').update(payload).eq('id', id)
    if (error) { toast.error(error.message); return false }
    setPlans(prev => prev.map(p => p.id === id ? { ...p, ...payload } : p))
    toast.success('Plan updated')
    return true
  }

  const deletePlan = async (id) => {
    const { error } = await supabase.from('production_plans').delete().eq('id', id)
    if (error) { toast.error(error.message); return false }
    setPlans(prev => prev.filter(p => p.id !== id))
    toast.success('Plan deleted')
    return true
  }

  return { plans, loading, savePlan, updatePlan, deletePlan, refresh: fetch }
}
