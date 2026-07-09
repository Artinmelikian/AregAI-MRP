import { useState, useContext } from 'react'
import { RoleContext } from '../App'
import toast from 'react-hot-toast'
import { useRobotModels } from '../hooks/useRobotModels'
import { useProduction } from '../hooks/useProduction'
import { useProductionPlans } from '../hooks/useProductionPlans'
import { useParts } from '../hooks/useParts'
import PlannerForm from '../components/PlannerForm'
import PlannerResults from '../components/PlannerResults'
import SavedPlansPanel from '../components/SavedPlansPanel'

export default function Planner() {
  const { isViewer } = useContext(RoleContext)
  const { models, loading } = useRobotModels()
  const { results, calculating, calculate, reset, patchRowStatus } = useProduction()
  const { plans, loading: plansLoading, savePlan, updatePlan, deletePlan } = useProductionPlans()
  const { updatePart } = useParts()
  const [currentPlan, setCurrentPlan] = useState(null)
  const [formKey, setFormKey] = useState(0)
  const [editingPlan, setEditingPlan] = useState(null)

  const handleLoad = async (plan) => {
    setCurrentPlan(plan)
    setEditingPlan(null)
    await calculate(plan.batch, plan.target_date)
  }

  const handleNewPlan = () => {
    setCurrentPlan(null)
    setEditingPlan(null)
    setFormKey(k => k + 1)
    reset()
  }

  const handleEditInputs = () => {
    setEditingPlan({ batch: results.batch, targetDate: results.targetDateStr })
    setFormKey(k => k + 1)
    reset()
  }

  const planPayload = () => ({
    targetDate: results.targetDateStr,
    batch: results.batch,
    feasible: results.feasible,
  })

  const handleSave = async (name) => {
    const payload = { name, ...planPayload() }
    if (currentPlan) {
      const ok = await updatePlan(currentPlan.id, payload)
      if (ok) setCurrentPlan(prev => ({ ...prev, name, target_date: payload.targetDate, batch: payload.batch, feasible: payload.feasible }))
    } else {
      const saved = await savePlan(payload)
      if (saved) setCurrentPlan(saved)
    }
  }

  const handleSaveAsNew = async (name) => {
    const saved = await savePlan({ name, ...planPayload() })
    if (saved) setCurrentPlan(saved)
  }

  const handleDelete = async (id) => {
    const wasCurrent = currentPlan?.id === id
    await deletePlan(id)
    if (wasCurrent) handleNewPlan()
  }

  const handleRename = (id, name) => {
    updatePlan(id, { name })
    if (currentPlan?.id === id) setCurrentPlan(prev => ({ ...prev, name }))
  }

  const handleSendToPurchasing = async (singleRow) => {
    const shortages = singleRow ? [singleRow] : results.rows.filter(r => r.shortage > 0)
    if (!shortages.length) return
    await Promise.all(shortages.map(r =>
      updatePart(r.partId, { qty_on_order: r.shortage, purchasing_status: 'To be Ordered' })
    ))
    patchRowStatus(shortages.map(r => r.partId), 'To be Ordered')
    toast.success(`Sent ${shortages.length} part${shortages.length === 1 ? '' : 's'} to Purchasing Tracker`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Production Planner</h1>
        <p className="text-sm text-gray-500 mt-0.5">Enter a mixed batch to check feasibility and identify shortages.</p>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">Loading models…</div>
      ) : results ? (
        <PlannerResults
          results={results}
          onReset={handleNewPlan}
          currentPlan={currentPlan}
          onSave={isViewer ? null : handleSave}
          onSaveAsNew={isViewer ? null : handleSaveAsNew}
          onEdit={handleEditInputs}
          onSendToPurchasing={isViewer ? null : handleSendToPurchasing}
        />
      ) : (
        <>
          <PlannerForm
            key={formKey}
            models={models}
            onCalculate={calculate}
            calculating={calculating}
            initialBatch={editingPlan?.batch}
            initialTargetDate={editingPlan?.targetDate}
          />
          <SavedPlansPanel
            plans={plans}
            loading={plansLoading}
            onLoad={handleLoad}
            onDelete={isViewer ? null : handleDelete}
            onRename={isViewer ? null : handleRename}
          />
        </>
      )}
    </div>
  )
}
