import { useState } from 'react'
import { useColumnWidths } from '../hooks/useColumnWidths'
import ResizeHandle from './ResizeHandle'

export const STATUS_OPTIONS = [
  'In-house Build',
  'Local Store',
  'To be Sourced',
  'Negotiating w/Supplier',
  'To be Ordered',
  'Ordered',
  'Shipped',
  'Received',
]

const STATUS_COLORS = {
  'In-house Build': 'bg-purple-100 text-purple-700',
  'Local Store': 'bg-teal-100 text-teal-700',
  'To be Sourced': 'bg-gray-100 text-gray-600',
  'Negotiating w/Supplier': 'bg-yellow-100 text-yellow-700',
  'To be Ordered': 'bg-orange-100 text-orange-700',
  'Ordered': 'bg-blue-100 text-blue-700',
  'Shipped': 'bg-indigo-100 text-indigo-700',
  'Received': 'bg-green-100 text-green-700',
}

const DEFAULT_WIDTHS = {
  name: 200,
  description: 220,
  stock_level: 90,
  reorder_threshold: 110,
  lead_time_days: 110,
  link: 180,
  status: 210,
  qty_on_order: 120,
  actions: 100,
}

function EditableQty({ value, onSave }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? 0)

  const commit = () => {
    setEditing(false)
    const n = Math.max(0, Number(draft) || 0)
    if (n !== Number(value)) onSave(n)
  }

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        min="0"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        className="w-20 border border-sky-400 rounded px-2 py-1 text-sm outline-none text-right"
      />
    )
  }

  return (
    <span
      onClick={() => { setDraft(value ?? 0); setEditing(true) }}
      className="cursor-pointer hover:bg-sky-50 rounded px-2 py-1 -mx-2 font-medium tabular-nums block text-right"
    >
      {value || 0}
    </span>
  )
}

function StatusSelect({ value, onChange }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`w-full text-xs font-semibold rounded-full px-2.5 py-1 border-0 outline-none cursor-pointer ${STATUS_COLORS[value] || 'bg-gray-100 text-gray-600'}`}
    >
      {STATUS_OPTIONS.map(opt => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
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
            className="text-sky-600 hover:underline text-sm truncate max-w-40"
            title={value}
          >
            🔗 {value.replace(/^https?:\/\//, '')}
          </a>
        ) : (
          <span className="text-sm text-gray-700 truncate max-w-40" title={value}>{value}</span>
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

export default function PurchasingTracker({ parts, onUpdate }) {
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [widths, setWidth] = useColumnWidths('purchasing-column-widths', DEFAULT_WIDTHS)

  const getStatus = (part) => part.purchasing_status || 'To be Sourced'

  const counts = STATUS_OPTIONS.reduce((acc, s) => {
    acc[s] = parts.filter(p => getStatus(p) === s).length
    return acc
  }, {})

  const filtered = parts.filter(p => {
    if (statusFilter !== 'all' && getStatus(p) !== statusFilter) return false
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const handleReceive = (part) => {
    const qty = Number(part.qty_on_order) || 0
    if (qty <= 0) return
    onUpdate(part.id, {
      stock_level: part.stock_level + qty,
      qty_on_order: 0,
      purchasing_status: 'Received',
    })
  }

  return (
    <div className="space-y-4">
      {/* Status filter chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
            statusFilter === 'all' ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
          }`}
        >
          All ({parts.length})
        </button>
        {STATUS_OPTIONS.map(opt => (
          <button
            key={opt}
            onClick={() => setStatusFilter(opt)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              statusFilter === opt ? `border-sky-500 ${STATUS_COLORS[opt]}` : 'border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            {opt} ({counts[opt]})
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold">Purchasing Tracker</h2>
            <p className="text-xs text-gray-400 mt-0.5">Update each part's procurement status as it progresses</p>
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search parts…"
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-sky-400 w-56"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="text-sm" style={{ tableLayout: 'fixed', width: '100%' }}>
            <colgroup>
              <col style={{ width: widths.name }} />
              <col style={{ width: widths.description }} />
              <col style={{ width: widths.stock_level }} />
              <col style={{ width: widths.reorder_threshold }} />
              <col style={{ width: widths.lead_time_days }} />
              <col style={{ width: widths.link }} />
              <col style={{ width: widths.status }} />
              <col style={{ width: widths.qty_on_order }} />
              <col style={{ width: widths.actions }} />
            </colgroup>
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                {[
                  ['name', 'Part Name', 'text-left'],
                  ['description', 'Description', 'text-left'],
                  ['stock_level', 'Stock', 'text-right'],
                  ['reorder_threshold', 'Reorder At', 'text-right'],
                  ['lead_time_days', 'Lead Time', 'text-right'],
                  ['link', 'Model / Link', 'text-left'],
                  ['status', 'Purchasing Status', 'text-left'],
                  ['qty_on_order', 'Qty Ordered', 'text-right'],
                ].map(([key, label, align]) => (
                  <th key={key} className={`relative px-4 py-3 font-medium ${align}`}>
                    <span className="truncate block pr-2">{label}</span>
                    <ResizeHandle width={widths[key]} onResize={w => setWidth(key, w)} />
                  </th>
                ))}
                <th className="relative px-4 py-3 font-medium text-center">Receive</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(part => {
                const onOrder = Number(part.qty_on_order) || 0
                return (
                  <tr key={part.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 font-medium overflow-hidden truncate">{part.name}</td>
                    <td className="px-4 py-2.5 text-gray-500 overflow-hidden truncate">{part.description || '—'}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{part.stock_level}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-gray-500">{part.reorder_threshold}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-gray-500">{part.lead_time_days}d</td>
                    <td className="px-4 py-2.5 overflow-hidden">
                      <EditableLink value={part.link} onSave={v => onUpdate(part.id, { link: v })} />
                    </td>
                    <td className="px-4 py-2.5 overflow-hidden">
                      <StatusSelect value={getStatus(part)} onChange={v => onUpdate(part.id, { purchasing_status: v })} />
                    </td>
                    <td className="px-4 py-2.5 overflow-hidden">
                      <EditableQty value={part.qty_on_order} onSave={v => onUpdate(part.id, { qty_on_order: v })} />
                    </td>
                    <td className="px-4 py-2.5 text-center overflow-hidden">
                      <button
                        onClick={() => handleReceive(part)}
                        disabled={onOrder <= 0}
                        title={onOrder > 0 ? `Add ${onOrder} to stock and mark Received` : 'No quantity on order'}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        ✓ Receive
                      </button>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">No parts match this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
