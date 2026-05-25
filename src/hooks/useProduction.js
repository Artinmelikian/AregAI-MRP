import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { subDays, isBefore, startOfDay } from 'date-fns'
import toast from 'react-hot-toast'

export function useProduction() {
  const [results, setResults] = useState(null)
  const [calculating, setCalculating] = useState(false)

  const calculate = async (batch, targetDate) => {
    // batch: [{ modelId, qty }]
    const activeBatch = batch.filter(b => b.qty > 0)
    if (!activeBatch.length) { toast.error('Enter at least one robot quantity'); return }
    if (!targetDate) { toast.error('Select a target completion date'); return }

    setCalculating(true)
    try {
      // Fetch all BOM items for involved models in one query
      const modelIds = activeBatch.map(b => b.modelId)
      const { data: bomItems, error: bomError } = await supabase
        .from('bom_items')
        .select('robot_model_id, quantity_per_unit, parts(id, name, unit, stock_level, lead_time_days, reorder_threshold)')
        .in('robot_model_id', modelIds)
      if (bomError) throw bomError

      // Aggregate total required per part
      const required = {}
      for (const { modelId, qty } of activeBatch) {
        const modelBom = bomItems.filter(b => b.robot_model_id === modelId)
        for (const item of modelBom) {
          const pid = item.parts.id
          if (!required[pid]) required[pid] = { part: item.parts, total: 0 }
          required[pid].total += item.quantity_per_unit * qty
        }
      }

      const today = startOfDay(new Date())
      const target = startOfDay(new Date(targetDate))

      const rows = Object.values(required).map(({ part, total }) => {
        const inStock = part.stock_level
        const shortage = Math.max(0, total - inStock)
        const orderByDate = subDays(target, part.lead_time_days)
        const isUrgent = isBefore(orderByDate, today)
        return {
          partId: part.id,
          partName: part.name,
          unit: part.unit,
          required: total,
          inStock,
          shortage,
          leadTimeDays: part.lead_time_days,
          orderByDate,
          isUrgent,
        }
      }).sort((a, b) => a.partName.localeCompare(b.partName))

      const feasible = rows.every(r => r.shortage === 0)
      setResults({ rows, feasible, targetDate: target })
    } catch (err) {
      toast.error('Calculation failed: ' + err.message)
    }
    setCalculating(false)
  }

  return { results, calculating, calculate, reset: () => setResults(null) }
}
