import { useState } from 'react'

const COLUMNS = [
  { key: 'name', label: 'Part Name', type: 'text' },
  { key: 'description', label: 'Description', type: 'text' },
  { key: 'stock_level', label: 'Stock', type: 'number' },
  { key: 'reorder_threshold', label: 'Reorder At', type: 'number' },
  { key: 'lead_time_days', label: 'Lead Time (days)', type: 'number' },
  { key: 'unit', label: 'Unit', type: 'text' },
]

function StockCell({ stock, threshold }) {
  const color =
    stock === 0 ? 'text-red-700 font-bold' :
    stock <= threshold ? 'text-orange-600 font-semibold' :
    'text-green-700 font-semibold'
  return <span className={color}>{stock}</span>
}

function EditableCell({ value, type, onSave }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')

  const commit = () => {
    setEditing(false)
    const newVal = type === 'number' ? Number(draft) : draft
    if (newVal !== value) onSave(newVal)
  }

  if (editing) {
    return (
      <input
        autoFocus
        type={type}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        className="w-full border border-sky-400 rounded px-2 py-1 text-sm outline-none"
      />
    )
  }

  return (
    <span
      onClick={() => { setDraft(value ?? ''); setEditing(true) }}
      className="cursor-pointer hover:bg-sky-50 rounded px-1 -mx-1 transition-colors block min-w-8"
    >
      {value ?? <span className="text-gray-400 italic">—</span>}
    </span>
  )
}

export default function PartsTable({ parts, onUpdate, onDelete, onAdd }) {
  const [adding, setAdding] = useState(false)
  const [newPart, setNewPart] = useState({ name: '', description: '', stock_level: 0, reorder_threshold: 0, lead_time_days: 0, unit: 'pcs' })
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const handleAdd = async () => {
    if (!newPart.name.trim()) return
    const ok = await onAdd(newPart)
    if (ok) {
      setAdding(false)
      setNewPart({ name: '', description: '', stock_level: 0, reorder_threshold: 0, lead_time_days: 0, unit: 'pcs' })
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold">Parts & Inventory</h2>
        <button
          onClick={() => setAdding(true)}
          className="px-3 py-1.5 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-700 transition-colors"
        >
          + Add Part
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
            <tr>
              {COLUMNS.map(c => (
                <th key={c.key} className="px-4 py-3 text-left font-medium">{c.label}</th>
              ))}
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {adding && (
              <tr className="bg-sky-50">
                {COLUMNS.map(col => (
                  <td key={col.key} className="px-4 py-2">
                    <input
                      type={col.type}
                      value={newPart[col.key]}
                      onChange={e => setNewPart(p => ({ ...p, [col.key]: col.type === 'number' ? Number(e.target.value) : e.target.value }))}
                      placeholder={col.label}
                      className="w-full border border-sky-300 rounded px-2 py-1 text-sm outline-none"
                    />
                  </td>
                ))}
                <td className="px-4 py-2 text-right space-x-2">
                  <button onClick={handleAdd} className="text-green-600 hover:text-green-800 font-medium">Save</button>
                  <button onClick={() => setAdding(false)} className="text-gray-400 hover:text-gray-600">Cancel</button>
                </td>
              </tr>
            )}
            {parts.map(part => (
              <tr key={part.id} className="hover:bg-gray-50 transition-colors">
                {COLUMNS.map(col => (
                  <td key={col.key} className="px-4 py-2.5">
                    {col.key === 'stock_level' ? (
                      <div className="flex items-center gap-2">
                        <StockCell stock={part.stock_level} threshold={part.reorder_threshold} />
                        <EditableCell
                          value={part.stock_level}
                          type="number"
                          onSave={v => onUpdate(part.id, { stock_level: v })}
                        />
                      </div>
                    ) : (
                      <EditableCell
                        value={part[col.key]}
                        type={col.type}
                        onSave={v => onUpdate(part.id, { [col.key]: v })}
                      />
                    )}
                  </td>
                ))}
                <td className="px-4 py-2.5 text-right">
                  {deleteConfirm === part.id ? (
                    <span className="space-x-2">
                      <button onClick={() => { onDelete(part.id); setDeleteConfirm(null) }} className="text-red-600 hover:text-red-800 font-medium text-xs">Confirm</button>
                      <button onClick={() => setDeleteConfirm(null)} className="text-gray-400 hover:text-gray-600 text-xs">Cancel</button>
                    </span>
                  ) : (
                    <button onClick={() => setDeleteConfirm(part.id)} className="text-gray-300 hover:text-red-500 transition-colors">✕</button>
                  )}
                </td>
              </tr>
            ))}
            {!adding && parts.length === 0 && (
              <tr><td colSpan={COLUMNS.length + 1} className="px-4 py-8 text-center text-gray-400">No parts yet. Click &quot;Add Part&quot; to get started.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
