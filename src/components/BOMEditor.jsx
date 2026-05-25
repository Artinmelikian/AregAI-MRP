import { useState } from 'react'
import { useBOM } from '../hooks/useBOM'

function EditableQty({ value, onSave }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  const commit = () => {
    setEditing(false)
    const n = Math.max(1, Number(draft))
    if (n !== value) onSave(n)
  }

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        min="1"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        className="w-20 border border-sky-400 rounded px-2 py-1 text-sm outline-none"
      />
    )
  }

  return (
    <span
      onClick={() => { setDraft(value); setEditing(true) }}
      className="cursor-pointer hover:bg-sky-50 rounded px-2 py-1 -mx-2 font-medium"
    >
      {value}
    </span>
  )
}

export default function BOMEditor({ model, allParts }) {
  const { items, loading, addItem, updateItem, removeItem } = useBOM(model?.id)
  const [selectedPartId, setSelectedPartId] = useState('')
  const [qty, setQty] = useState(1)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const existingPartIds = new Set(items.map(i => i.parts.id))
  const availableParts = allParts.filter(p => !existingPartIds.has(p.id))

  const handleAdd = async () => {
    if (!selectedPartId) return
    const ok = await addItem(selectedPartId, qty)
    if (ok) { setSelectedPartId(''); setQty(1) }
  }

  if (!model) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
        Select a robot model to view and edit its BOM
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold">BOM — {model.name}</h2>
        {model.description && <p className="text-sm text-gray-500 mt-0.5">{model.description}</p>}
      </div>

      {/* Add part row */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-100 bg-gray-50">
        <select
          value={selectedPartId}
          onChange={e => setSelectedPartId(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-sky-400"
        >
          <option value="">Select a part to add…</option>
          {availableParts.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <input
          type="number"
          min="1"
          value={qty}
          onChange={e => setQty(Number(e.target.value))}
          className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-sky-400"
          placeholder="Qty"
        />
        <button
          onClick={handleAdd}
          disabled={!selectedPartId}
          className="px-4 py-2 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-700 disabled:opacity-40 transition-colors"
        >
          Add
        </button>
      </div>

      {/* BOM table */}
      {loading ? (
        <div className="p-8 text-center text-gray-400">Loading…</div>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-6 py-3 text-left font-medium">Part</th>
              <th className="px-6 py-3 text-left font-medium">Unit</th>
              <th className="px-6 py-3 text-left font-medium">Qty / Unit</th>
              <th className="px-6 py-3 text-left font-medium">Lead Time</th>
              <th className="px-6 py-3 text-right font-medium">Remove</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map(item => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-3 font-medium">{item.parts.name}</td>
                <td className="px-6 py-3 text-gray-500">{item.parts.unit}</td>
                <td className="px-6 py-3">
                  <EditableQty
                    value={item.quantity_per_unit}
                    onSave={v => updateItem(item.id, v)}
                  />
                </td>
                <td className="px-6 py-3 text-gray-500">{item.parts.lead_time_days}d</td>
                <td className="px-6 py-3 text-right">
                  {deleteConfirm === item.id ? (
                    <span className="space-x-2">
                      <button onClick={() => { removeItem(item.id); setDeleteConfirm(null) }} className="text-red-600 hover:text-red-800 text-xs font-medium">Confirm</button>
                      <button onClick={() => setDeleteConfirm(null)} className="text-gray-400 text-xs">Cancel</button>
                    </span>
                  ) : (
                    <button onClick={() => setDeleteConfirm(item.id)} className="text-gray-300 hover:text-red-500 transition-colors">✕</button>
                  )}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">No parts in BOM yet.</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}
