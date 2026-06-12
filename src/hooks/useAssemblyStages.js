import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const DEFAULT_STAGES = [
  { category: 'mechanical', name: 'Chassis welding and assembling', order_index: 0 },
  { category: 'mechanical', name: 'Body welding and assembling', order_index: 1 },
  { category: 'mechanical', name: 'Power transmission assembling', order_index: 2 },
  { category: 'mechanical', name: 'Body ↔ Chassis marriage', order_index: 3 },
  { category: 'electrical', name: 'Electrical and power connection', order_index: 0 },
  { category: 'electrical', name: 'Control units assembling and wirings', order_index: 1 },
  { category: 'electrical', name: 'Sensors assembly and wiring', order_index: 2 },
  { category: 'electrical', name: 'Electrical test', order_index: 3 },
]

export function useAssemblyStages(robotModelId) {
  const [stages, setStages] = useState([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!robotModelId) { setStages([]); return }
    setLoading(true)

    const { data, error } = await supabase
      .from('assembly_stages')
      .select('*')
      .eq('robot_model_id', robotModelId)
      .order('category')
      .order('order_index')

    if (error) {
      toast.error('Failed to load assembly stages')
      setLoading(false)
      return
    }

    // Auto-seed default stages if none exist for this model
    if (data.length === 0) {
      const toInsert = DEFAULT_STAGES.map(s => ({ ...s, robot_model_id: robotModelId, duration_days: 0 }))
      const { data: inserted, error: insertError } = await supabase
        .from('assembly_stages')
        .upsert(toInsert, { onConflict: 'robot_model_id,category,order_index', ignoreDuplicates: true })
        .select()
      if (insertError) {
        toast.error('Failed to initialise assembly stages')
      } else {
        // Re-fetch to get clean data after upsert
        const { data: fresh } = await supabase
          .from('assembly_stages')
          .select('*')
          .eq('robot_model_id', robotModelId)
          .order('category')
          .order('order_index')
        setStages(fresh ?? [])
      }
    } else {
      setStages(data)
    }

    setLoading(false)
  }, [robotModelId])

  useEffect(() => { fetch() }, [fetch])

  const updateDuration = async (id, duration_days) => {
    const value = Math.max(0, Number(duration_days))
    const { error } = await supabase
      .from('assembly_stages')
      .update({ duration_days: value, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) { toast.error(error.message); return false }
    setStages(prev => prev.map(s => s.id === id ? { ...s, duration_days: value } : s))
    return true
  }

  const mechanicalStages = stages.filter(s => s.category === 'mechanical')
  const electricalStages = stages.filter(s => s.category === 'electrical')
  const mechanicalTotal = mechanicalStages.reduce((sum, s) => sum + Number(s.duration_days), 0)
  const electricalTotal = electricalStages.reduce((sum, s) => sum + Number(s.duration_days), 0)
  const totalAssemblyDays = mechanicalTotal + electricalTotal

  return {
    stages,
    mechanicalStages,
    electricalStages,
    mechanicalTotal,
    electricalTotal,
    totalAssemblyDays,
    loading,
    updateDuration,
    refresh: fetch,
  }
}
