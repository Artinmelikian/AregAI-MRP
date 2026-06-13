import { useState } from 'react'
import { format } from 'date-fns'

export default function SavedPlansPanel({ plans, loading, onLoad, onDelete, onRename }) {
  const [renamingId, setRenamingId] = useState(null)
  const [draftName, setDraftName] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
        Loading saved plans…
      </div>
    )
  }

  if (!plans.length) return null

  const startRename = (plan) => { setRenamingId(plan.id); setDraftName(plan.name) }
  const commitRename = (plan) => {
    setRenamingId(null)
    const trimmed = draftName.trim()
    if (trimmed && trimmed !== plan.name) onRename(plan.id, trimmed)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-700">📁 Saved Plans</h3>
      </div>
      <div className="divide-y divide-gray-100">
        {plans.map(plan => {
          const total = (plan.batch || []).reduce((sum, b) => sum + (b.qty || 0), 0)
          return (
            <div key={plan.id} className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors">
              <div className="flex-1 min-w-0">
                {renamingId === plan.id ? (
                  <input
                    autoFocus
                    value={draftName}
                    onChange={e => setDraftName(e.target.value)}
                    onBlur={() => commitRename(plan)}
                    onKeyDown={e => { if (e.key === 'Enter') commitRename(plan); if (e.key === 'Escape') setRenamingId(null) }}
                    className="border border-sky-400 rounded px-2 py-1 text-sm outline-none"
                  />
                ) : (
                  <p
                    onClick={() => startRename(plan)}
                    className="font-medium text-gray-800 truncate cursor-pointer hover:text-sky-600"
                    title="Click to rename"
                  >
                    {plan.name}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                  <span>Target {format(new Date(plan.target_date), 'MMM d, yyyy')}</span>
                  <span>· {total} robot{total === 1 ? '' : 's'}</span>
                  <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${plan.feasible ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {plan.feasible ? 'FEASIBLE' : 'INFEASIBLE'}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-3 ml-4 shrink-0">
                <button onClick={() => onLoad(plan)} className="text-sm font-medium text-sky-600 hover:text-sky-800">Open</button>
                {deleteConfirm === plan.id ? (
                  <span className="space-x-2">
                    <button onClick={() => { onDelete(plan.id); setDeleteConfirm(null) }} className="text-red-600 hover:text-red-800 text-xs font-medium">Confirm</button>
                    <button onClick={() => setDeleteConfirm(null)} className="text-gray-400 text-xs">Cancel</button>
                  </span>
                ) : (
                  <button onClick={() => setDeleteConfirm(plan.id)} className="text-gray-300 hover:text-red-500 transition-colors">✕</button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
