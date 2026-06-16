import { useState, useRef } from 'react'
import { useColumnWidths } from '../hooks/useColumnWidths'
import ResizeHandle from './ResizeHandle'

const ALL_COLUMNS = [
  { key: 'name', label: 'Part Name', type: 'text' },
  { key: 'description', label: 'Description', type: 'text' },
  { key: 'stock_level', label: 'Stock', type: 'number' },
  { key: 'reorder_threshold', label: 'Reorder At', type: 'number' },
  { key: 'lead_time_days', label: 'Lead Time (days)', type: 'number' },
  { key: 'link', label: 'Model / Link', type: 'url' },
]

const DEFAULT_WIDTHS = {
  name: 200,
  description: 240,
  stock_level: 110,
  reorder_threshold: 120,
  lead_time_days: 140,
  link: 200,
  actions: 90,
}

const WIDTHS_STORAGE_KEY = 'parts-column-widths'
const STORAGE_KEY = 'parts-column-order'

function loadColumnOrder() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const keys = JSON.parse(saved)
      const allKeys = ALL_COLUMNS.map(c => c.key)
      // Merge: keep saved order, append any new columns not yet saved
      const ordered = keys.filter(k => allKeys.includes(k))
      const missing = allKeys.filter(k => !ordered.includes(k))
      return [...ordered, ...missing]
    }
  } catch {}
  return ALL_COLUMNS.map(c => c.key)
}

function saveColumnOrder(keys) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys))
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
      className="cursor-pointer hover:bg-sky-50 rounded px-1 -mx-1 transition-colors block min-w-16 min-h-6"
    >
      {value || <span className="text-gray-300 italic">+ add</span>}
    </span>
  )
}

function renderCell(col, part, onUpdate) {
  if (col.key === 'stock_level') {
    return (
      <div className="flex items-center justify-center gap-2">
        <StockCell stock={part.stock_level} threshold={part.reorder_threshold} />
        <EditableCell value={part.stock_level} type="number" onSave={v => onUpdate(part.id, { stock_level: v })} />
      </div>
    )
  }
  if (col.key === 'link') {
    return <EditableLink value={part.link} onSave={v => onUpdate(part.id, { link: v })} />
  }
  return (
    <EditableCell
      value={part[col.key]}
      type={col.type}
      onSave={v => onUpdate(part.id, { [col.key]: v })}
    />
  )
}

export default function PartsTable({ parts, onUpdate, onDelete, onAdd }) {
  const [adding, setAdding] = useState(false)
  const [newPart, setNewPart] = useState({ name: '', description: '', stock_level: 0, reorder_threshold: 0, lead_time_days: 0, unit: 'pcs' })
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [columnOrder, setColumnOrder] = useState(loadColumnOrder)
  const [dragOver, setDragOver] = useState(null)
  const dragKey = useRef(null)
  const [widths, setWidth] = useColumnWidths(WIDTHS_STORAGE_KEY, DEFAULT_WIDTHS)
  const [resizingCol, setResizingCol] = useState(null)

  const columns = columnOrder.map(k => ALL_COLUMNS.find(c => c.key === k)).filter(Boolean)

  const handleDragStart = (key) => { dragKey.current = key }
  const handleDragOver = (e, key) => { e.preventDefault(); setDragOver(key) }
  const handleDrop = (targetKey) => {
    if (!dragKey.current || dragKey.current === targetKey) { setDragOver(null); return }
    const order = [...columnOrder]
    const from = order.indexOf(dragKey.current)
    const to = order.indexOf(targetKey)
    order.splice(from, 1)
    order.splice(to, 0, dragKey.current)
    setColumnOrder(order)
    saveColumnOrder(order)
    dragKey.current = null
    setDragOver(null)
  }

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
        <div>
          <h2 className="text-lg font-semibold">
            Parts & Inventory
            <span className="ml-2 text-xs font-medium text-sky-700 bg-sky-50 rounded-full px-2 py-0.5 align-middle">
              {parts.length} {parts.length === 1 ? 'part type' : 'part types'}
            </span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Drag column headers to reorder</p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="px-3 py-1.5 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-700 transition-colors"
        >
          + Add Part
        </button>
      </div>

      <div className="overflow-auto max-h-[65vh]">
        <table className="text-sm" style={{ tableLayout: 'fixed', width: '100%' }}>
          <colgroup>
            {columns.map(col => (
              <col key={col.key} style={{ width: widths[col.key] ?? DEFAULT_WIDTHS[col.key] }} />
            ))}
            <col style={{ width: widths.actions ?? DEFAULT_WIDTHS.actions }} />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  draggable={!resizingCol}
                  onDragStart={() => handleDragStart(col.key)}
                  onDragOver={e => handleDragOver(e, col.key)}
                  onDrop={() => handleDrop(col.key)}
                  onDragLeave={() => setDragOver(null)}
                  className={`relative px-4 py-3 font-medium cursor-grab select-none transition-colors ${
                    col.type === 'number' ? 'text-center' : 'text-left'
                  } ${dragOver === col.key ? 'bg-sky-100 text-sky-700' : 'hover:bg-gray-100'}`}
                >
                  <span className={`flex items-center gap-1.5 overflow-hidden ${col.type === 'number' ? 'justify-center' : ''}`}>
                    <span className="text-gray-300 shrink-0">⠿</span>
                    <span className="truncate">{col.label}</span>
                  </span>
                  <ResizeHandle
                    width={widths[col.key] ?? DEFAULT_WIDTHS[col.key]}
                    onResize={w => setWidth(col.key, w)}
                    onStart={() => setResizingCol(col.key)}
                    onEnd={() => setResizingCol(null)}
                  />
                </th>
              ))}
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {adding && (
              <tr className="bg-sky-50">
                {columns.map(col => (
                  <td key={col.key} className="px-4 py-2">
                    {col.key === 'link' ? (
                      <input
                        type="url"
                        value={newPart.link ?? ''}
                        onChange={e => setNewPart(p => ({ ...p, link: e.target.value }))}
                        placeholder="https://…"
                        className="w-full border border-sky-300 rounded px-2 py-1 text-sm outline-none"
                      />
                    ) : (
                      <input
                        type={col.type}
                        value={newPart[col.key] ?? ''}
                        onChange={e => setNewPart(p => ({ ...p, [col.key]: col.type === 'number' ? Number(e.target.value) : e.target.value }))}
                        placeholder={col.label}
                        className="w-full border border-sky-300 rounded px-2 py-1 text-sm outline-none"
                      />
                    )}
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
                {columns.map(col => (
                  <td key={col.key} className={`px-4 py-2.5 overflow-hidden ${col.type === 'number' ? 'text-center' : ''}`}>
                    {renderCell(col, part, onUpdate)}
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
              <tr><td colSpan={columns.length + 1} className="px-4 py-8 text-center text-gray-400">No parts yet. Click &quot;Add Part&quot; to get started.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
