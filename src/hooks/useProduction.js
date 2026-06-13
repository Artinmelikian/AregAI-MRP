import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { subDays, isBefore, startOfDay } from 'date-fns'
import toast from 'react-hot-toast'

export function useProduction() {
  const [results, setResults] = useState(null)
  const [calculating, setCalculating] = useState(false)

  const calculate = async (batch, targetDate) => {
    // batch: [{ modelId, modelName, qty }]
    const activeBatch = batch.filter(b => b.qty > 0)
    if (!activeBatch.length) { toast.error('Enter at least one robot quantity'); return }
    if (!targetDate) { toast.error('Select a target completion date'); return }

    setCalculating(true)
    try {
      const modelIds = activeBatch.map(b => b.modelId)

      // Fetch BOM items and assembly stages in parallel
      const [bomResult, assemblyResult] = await Promise.all([
        supabase
          .from('bom_items')
          .select('robot_model_id, quantity_per_unit, parts(id, name, unit, stock_level, lead_time_days, reorder_threshold)')
          .in('robot_model_id', modelIds),
        supabase
          .from('assembly_stages')
          .select('robot_model_id, category, duration_days')
          .in('robot_model_id', modelIds),
      ])

      if (bomResult.error) throw bomResult.error
      if (assemblyResult.error) throw assemblyResult.error

      const bomItems = bomResult.data
      const assemblyStages = assemblyResult.data

      // Calculate total assembly days per model
      const assemblyByModel = {}
      for (const { modelId, modelName, qty } of activeBatch) {
        const stages = assemblyStages.filter(s => s.robot_model_id === modelId)
        const totalDays = stages.reduce((sum, s) => sum + Number(s.duration_days), 0)
        const mechDays = stages.filter(s => s.category === 'mechanical').reduce((sum, s) => sum + Number(s.duration_days), 0)
        const elecDays = stages.filter(s => s.category === 'electrical').reduce((sum, s) => sum + Number(s.duration_days), 0)
        assemblyByModel[modelId] = { modelName, qty, mechDays, elecDays, totalDays }
      }

      // Use the longest assembly window across all models (conservative)
      const maxAssemblyDays = Math.max(...Object.values(assemblyByModel).map(m => m.totalDays), 0)

      const today = startOfDay(new Date())
      const target = startOfDay(new Date(targetDate))

      // Parts must be on hand BEFORE assembly starts
      const partsNeededBy = subDays(target, Math.ceil(maxAssemblyDays))

      // Aggregate total required parts across all models
      const required = {}
      for (const { modelId, qty } of activeBatch) {
        const modelBom = bomItems.filter(b => b.robot_model_id === modelId)
        for (const item of modelBom) {
          const pid = item.parts.id
          if (!required[pid]) required[pid] = { part: item.parts, total: 0 }
          required[pid].total += item.quantity_per_unit * qty
        }
      }

      // Build result rows
      const rows = Object.values(required).map(({ part, total }) => {
        const inStock = part.stock_level
        const shortage = Math.max(0, total - inStock)
        const orderByDate = subDays(partsNeededBy, part.lead_time_days)
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

      setResults({
        rows,
        feasible,
        targetDate: target,
        targetDateStr: targetDate,
        batch: activeBatch,
        partsNeededBy,
        maxAssemblyDays,
        assemblyByModel,
      })
    } catch (err) {
      toast.error('Calculation failed: ' + err.message)
    }
    setCalculating(false)
  }

  return { results, calculating, calculate, reset: () => setResults(null) }
}
