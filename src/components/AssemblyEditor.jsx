import { useState } from 'react'
import { useAssemblyStages } from '../hooks/useAssemblyStages'

function EditableDuration({ value, onSave }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  const commit = () => {
    setEditing(false)
    const n = Math.max(0, Number(draft))
    if (n !== Number(value)) onSave(n)
  }

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        min="0"
        step="0.5"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        className="w-16 border border-sky-400 rounded px-2 py-0.5 text-sm outline-none text-right"
      />
    )
  }

  return (
    <span
      onClick={() => { setDraft(value); setEditing(true) }}
      className="cursor-pointer hover:bg-sky-50 rounded px-2 py-0.5 -mx-2 text-right block w-16 font-medium tabular-nums"
      title="Click to edit"
    >
      {Number(value).toFixed(1)}d
    </span>
  )
}

function StageGroup({ title, stages, color, onUpdateDuration }) {
  const subtotal = stages.reduce((sum, s) => sum + Number(s.duration_days), 0)

  return (
    <div className="flex-1 min-w-0">
      <div className={`px-4 py-2 rounded-t-lg font-semibold text-sm ${color}`}>
        {title}
      </div>
      <div className="border border-t-0 border-gray-200 rounded-b-lg overflow-hidden">
        {stages.map((stage, idx) => (
          <div
            key={stage.id}
            className={`flex items-center justify-between px-4 py-2.5 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
          >
            <span className="text-sm text-gray-700 flex-1 mr-4">
              <span className="text-gray-400 text-xs mr-2">{idx + 1}.</span>
              {stage.name}
            </span>
            <EditableDuration
              value={stage.duration_days}
              onSave={v => onUpdateDuration(stage.id, v)}
            />
          </div>
        ))}
        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-100 border-t border-gray-200">
          <span className="text-sm font-semibold text-gray-600">Subtotal</span>
          <span className="text-sm font-bold tabular-nums">{subtotal.toFixed(1)}d</span>
        </div>
      </div>
    </div>
  )
}

export default function AssemblyEditor({ model }) {
  const {
    mechanicalStages,
    electricalStages,
    mechanicalTotal,
    electricalTotal,
    totalAssemblyDays,
    loading,
    updateDuration,
  } = useAssemblyStages(model?.id)

  if (!model) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
        Select a robot model to configure its assembly timeline
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
        Loading assembly stages…
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold">Assembly Timeline — {model.name}</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Click any duration to edit. Mechanical runs first, then Electrical (sequential).
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Two-column layout for mechanical + electrical */}
        <div className="flex gap-6">
          <StageGroup
            title="⚙️ Mechanical Assembly"
            stages={mechanicalStages}
            color="bg-blue-50 text-blue-800"
            onUpdateDuration={updateDuration}
          />
          <StageGroup
            title="⚡ Electrical Assembly"
            stages={electricalStages}
            color="bg-yellow-50 text-yellow-800"
            onUpdateDuration={updateDuration}
          />
        </div>

        {/* Total summary */}
        <div className="rounded-lg bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="space-y-1 text-sm text-gray-300">
            <div className="flex gap-6">
              <span>⚙️ Mechanical: <strong className="text-white">{mechanicalTotal.toFixed(1)}d</strong></span>
              <span>→</span>
              <span>⚡ Electrical: <strong className="text-white">{electricalTotal.toFixed(1)}d</strong></span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Total Assembly Lead Time</p>
            <p className="text-2xl font-bold">{totalAssemblyDays.toFixed(1)} days</p>
          </div>
        </div>
      </div>
    </div>
  )
}
