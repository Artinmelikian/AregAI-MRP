import { useState } from 'react'
import { useBOM } from '../hooks/useBOM'
import { useColumnWidths } from '../hooks/useColumnWidths'
import ResizeHandle from './ResizeHandle'

const DEFAULT_WIDTHS = {
  part: 220,
  unit: 90,
  qty: 120,
  leadtime: 110,
  link: 200,
  remove: 90,
}

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

function EditableLink({ value, onSave }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')

  const commit = () => {
    setEditing(false)
    if (draft !== (value ?? '')) onSave(draft.trim() || null)
  }

  const isUrl = value && /^https?:\/\//i.test(value)

  if (editing) {
    return (
      <input
        autoFocus
        type="text"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        placeholder="URL or any text…"
        className="w-full border border-sky-400 rounded px-2 py-1 text-sm outline-none"
      />
    )
  }

  if (value) {
    return (
      <span className="flex items-center gap-1 group">
        {isUrl ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-600 hover:underline text-sm truncate max-w-48"
            title={value}
          >
            🔗 {value.replace(/^https?:\/\//, '')}
          </a>
        ) : (
          <span className="text-sm text-gray-700 truncate max-w-48" title={value}>{value}</span>
        )}
        <button
          onClick={() => { setDraft(value); setEditing(true) }}
          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 text-xs transition-opacity"
        >
          ✏️
        </button>
      </span>
    )
  }

  return (
    <span
      onClick={() => { setDraft(''); setEditing(true) }}
      className="cursor-pointer text-gray-300 hover:text-sky-500 text-sm transition-colors"
    >
      + Add link
    </span>
  )
}

export default function BOMEditor({ model, allParts, onUpdatePart }) {
  const { items, loading, addItem, updateItem, removeItem, refresh } = useBOM(model?.id)
  const [selectedPartId, setSelectedPartId] = useState('')
  const [qty, setQty] = useState(1)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [widths, setWidth] = useColumnWidths('bom-column-widths', DEFAULT_WIDTHS)
  const [search, setSearch] = useState('')

  const filteredItems = search.trim()
    ? items.filter(i => i.parts.name.toLowerCase().includes(search.toLowerCase()))
    : items

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
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">BOM — {model.name}</h2>
          {model.description && <p className="text-sm text-gray-500 mt-0.5">{model.description}</p>}
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search parts…"
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-sky-400 w-52"
        />
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
        <div className="overflow-auto max-h-[65vh]">
        <table className="text-sm" style={{ tableLayout: 'fixed', width: '100%' }}>
          <colgroup>
            <col style={{ width: widths.part }} />
            <col style={{ width: widths.unit }} />
            <col style={{ width: widths.qty }} />
            <col style={{ width: widths.leadtime }} />
            <col style={{ width: widths.link }} />
            <col style={{ width: widths.remove }} />
            <col />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
            <tr>
              {[
                ['part', 'Part', 'text-left'],
                ['unit', 'Unit', 'text-left'],
                ['qty', 'Qty / Unit', 'text-center'],
                ['leadtime', 'Lead Time', 'text-center'],
                ['link', 'Model / Link', 'text-left'],
              ].map(([key, label, align]) => (
                <th key={key} className={`relative px-6 py-3 font-medium ${align}`}>
                  <span className="truncate block pr-2">{label}</span>
                  <ResizeHandle
                    width={widths[key]}
                    onResize={w => setWidth(key, w)}
                  />
                </th>
              ))}
              <th className="relative px-6 py-3 text-right font-medium">Remove</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredItems.map(item => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-3 font-medium overflow-hidden truncate">{item.parts.name}</td>
                <td className="px-6 py-3 text-gray-500 overflow-hidden truncate">{item.parts.unit}</td>
                <td className="px-6 py-3 text-center overflow-hidden">
                  <EditableQty
                    value={item.quantity_per_unit}
                    onSave={v => updateItem(item.id, v)}
                  />
                </td>
                <td className="px-6 py-3 text-center text-gray-500 overflow-hidden truncate">{item.parts.lead_time_days}d</td>
                <td className="px-6 py-3 overflow-hidden">
                  <EditableLink
                    value={item.parts.link}
                    onSave={async v => { await onUpdatePart(item.parts.id, { link: v }); refresh() }}
                  />
                </td>
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
                <td />
              </tr>
            ))}
            {filteredItems.length === 0 && (
              <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                {search ? `No parts match "${search}".` : 'No parts in BOM yet.'}
              </td></tr>
            )}
          </tbody>
        </table>
        </div>
      )}
    </div>
  )
}
