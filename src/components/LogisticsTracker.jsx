import { useState } from 'react'
import { useColumnWidths } from '../hooks/useColumnWidths'
import ResizeHandle from './ResizeHandle'

const STATUS_OPTIONS = [
  'Awaiting Dispatch',
  'In Transit',
  'In Customs',
  'Out for Delivery',
  'Delivered',
  'Exception',
]

const STATUS_COLORS = {
  'Awaiting Dispatch': 'bg-gray-100 text-gray-700',
  'In Transit':        'bg-blue-100 text-blue-800',
  'In Customs':        'bg-yellow-100 text-yellow-800',
  'Out for Delivery':  'bg-sky-100 text-sky-800',
  'Delivered':         'bg-green-100 text-green-800',
  'Exception':         'bg-red-100 text-red-800',
}

const DEFAULT_WIDTHS = {
  part:        180,
  supplier:    150,
  carrier:     120,
  tracking:    180,
  qty:          90,
  eta:         120,
  status:      150,
  notes:       220,
  remove:       80,
}

function EditableCell({ value, type = 'text', placeholder = '', onSave }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')

  const commit = () => {
    setEditing(false)
    const val = type === 'number' ? Number(draft) : draft.trim()
    if (val !== (value ?? '')) onSave(val || null)
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
      className="cursor-pointer hover:bg-sky-50 rounded px-1 -mx-1 block min-h-6 truncate"
      title={value ?? ''}
    >
      {value || <span className="text-gray-300 italic">{placeholder || '+ add'}</span>}
    </span>
  )
}

function TrackingCell({ value, onSave }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')

  const commit = () => {
    setEditing(false)
    if (draft.trim() !== (value ?? '')) onSave(draft.trim() || null)
  }

  if (editing) {
    return (
      <input
        autoFocus
        type="text"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        className="w-full border border-sky-400 rounded px-2 py-1 text-sm outline-none font-mono"
      />
    )
  }

  const isUrl = value && /^https?:\/\//i.test(value)
  if (value) {
    return (
      <span className="flex items-center gap-1 group">
        {isUrl ? (
          <a href={value} target="_blank" rel="noopener noreferrer"
            className="text-sky-600 hover:underline text-sm truncate font-mono" title={value}>
            🔗 {value.replace(/^https?:\/\//, '')}
          </a>
        ) : (
          <span className="text-sm font-mono text-gray-700 truncate" title={value}>{value}</span>
        )}
        <button onClick={() => { setDraft(value); setEditing(true) }}
          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 text-xs transition-opacity shrink-0">
          ✏️
        </button>
      </span>
    )
  }
  return (
    <span onClick={() => { setDraft(''); setEditing(true) }}
      className="cursor-pointer text-gray-300 hover:text-sky-500 text-sm italic transition-colors">
      + add tracking
    </span>
  )
}

function StatusSelect({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const color = STATUS_COLORS[value] ?? 'bg-gray-100 text-gray-700'

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-opacity hover:opacity-80 ${color}`}
      >
        {value}
        <span className="text-xs opacity-60">▾</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-44">
            {STATUS_OPTIONS.map(s => (
              <button
                key={s}
                onClick={() => { onChange(s); setOpen(false) }}
                className={`w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-gray-50 transition-colors ${s === value ? 'opacity-50' : ''}`}
              >
                <span className={`inline-block px-2 py-0.5 rounded-full ${STATUS_COLORS[s]}`}>{s}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function LogisticsTracker({ shipments, parts, onAdd, onUpdate, onDelete }) {
  const [widths, setWidth] = useColumnWidths('logistics-column-widths', DEFAULT_WIDTHS)
  const [search, setSearch] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [adding, setAdding] = useState(false)
  const [newRow, setNewRow] = useState({ part_id: '', supplier: '', carrier: '', tracking_number: '', qty: 1, eta: '', status: 'Awaiting Dispatch', notes: '' })

  const normalize = s => (s ?? '').toLowerCase().replace(/\s+/g, '')
  const filtered = search.trim()
    ? shipments.filter(s =>
        normalize(s.parts?.name).includes(normalize(search)) ||
        normalize(s.supplier).includes(normalize(search)) ||
        normalize(s.carrier).includes(normalize(search)) ||
        normalize(s.tracking_number).includes(normalize(search))
      )
    : shipments

  const handleAdd = async () => {
    if (!newRow.part_id) return
    const ok = await onAdd({
      part_id: newRow.part_id,
      supplier: newRow.supplier || null,
      carrier: newRow.carrier || null,
      tracking_number: newRow.tracking_number || null,
      qty: Number(newRow.qty) || 1,
      eta: newRow.eta || null,
      status: newRow.status,
      notes: newRow.notes || null,
    })
    if (ok) {
      setAdding(false)
      setNewRow({ part_id: '', supplier: '', carrier: '', tracking_number: '', qty: 1, eta: '', status: 'Awaiting Dispatch', notes: '' })
    }
  }

  const cols = [
    { key: 'part',     label: 'Part',            w: widths.part },
    { key: 'supplier', label: 'Supplier',         w: widths.supplier },
    { key: 'carrier',  label: 'Carrier',          w: widths.carrier },
    { key: 'tracking', label: 'Tracking No.',     w: widths.tracking },
    { key: 'qty',      label: 'Qty',              w: widths.qty },
    { key: 'eta',      label: 'Est. Arrival',     w: widths.eta },
    { key: 'status',   label: 'Status',           w: widths.status },
    { key: 'notes',    label: 'Notes',            w: widths.notes },
    { key: 'remove',   label: '',                 w: widths.remove },
  ]

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">
            Shipments
            <span className="ml-2 text-xs font-medium text-sky-700 bg-sky-50 rounded-full px-2 py-0.5 align-middle">
              {filtered.length}{search ? ` of ${shipments.length}` : ''}
            </span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Track in-transit goods from order to delivery</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search part, supplier, carrier…"
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-sky-400 w-64"
          />
          <button
            onClick={() => setAdding(true)}
            className="px-3 py-1.5 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-700 transition-colors whitespace-nowrap"
          >
            + Add Shipment
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto max-h-[65vh]">
        <table className="text-sm" style={{ tableLayout: 'fixed', width: '100%' }}>
          <colgroup>
            {cols.map(c => <col key={c.key} style={{ width: c.w }} />)}
            <col />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
            <tr>
              {cols.map(c => (
                <th key={c.key} className="relative px-4 py-3 font-medium text-left">
                  {c.label}
                  {c.key !== 'remove' && (
                    <ResizeHandle
                      width={c.w}
                      onResize={w => setWidth(c.key, w)}
                    />
                  )}
                </th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {/* Add row */}
            {adding && (
              <tr className="bg-sky-50">
                <td className="px-4 py-2">
                  <select
                    autoFocus
                    value={newRow.part_id}
                    onChange={e => setNewRow(r => ({ ...r, part_id: e.target.value }))}
                    className="w-full border border-sky-300 rounded px-2 py-1 text-sm outline-none"
                  >
                    <option value="">— Select part —</option>
                    {parts.map(p => (
                      <option key={p.id} value={p.id}>{p.name}{p.description ? ` — ${p.description}` : ''}</option>
                    ))}
                  </select>
                </td>
                {['supplier', 'carrier', 'tracking_number'].map(f => (
                  <td key={f} className="px-4 py-2">
                    <input
                      type="text"
                      value={newRow[f]}
                      onChange={e => setNewRow(r => ({ ...r, [f]: e.target.value }))}
                      placeholder={f === 'tracking_number' ? 'Tracking no. or URL' : f.charAt(0).toUpperCase() + f.slice(1)}
                      className="w-full border border-sky-300 rounded px-2 py-1 text-sm outline-none"
                    />
                  </td>
                ))}
                <td className="px-4 py-2">
                  <input type="number" min="1" value={newRow.qty}
                    onChange={e => setNewRow(r => ({ ...r, qty: e.target.value }))}
                    className="w-full border border-sky-300 rounded px-2 py-1 text-sm outline-none" />
                </td>
                <td className="px-4 py-2">
                  <input type="date" value={newRow.eta}
                    onChange={e => setNewRow(r => ({ ...r, eta: e.target.value }))}
                    className="w-full border border-sky-300 rounded px-2 py-1 text-sm outline-none" />
                </td>
                <td className="px-4 py-2">
                  <select value={newRow.status}
                    onChange={e => setNewRow(r => ({ ...r, status: e.target.value }))}
                    className="w-full border border-sky-300 rounded px-2 py-1 text-sm outline-none">
                    {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </td>
                <td className="px-4 py-2">
                  <input type="text" value={newRow.notes}
                    onChange={e => setNewRow(r => ({ ...r, notes: e.target.value }))}
                    placeholder="Notes…"
                    className="w-full border border-sky-300 rounded px-2 py-1 text-sm outline-none" />
                </td>
                <td className="px-4 py-2 text-right space-x-2 whitespace-nowrap">
                  <button onClick={handleAdd} className="text-green-600 hover:text-green-800 font-medium text-xs">Save</button>
                  <button onClick={() => setAdding(false)} className="text-gray-400 hover:text-gray-600 text-xs">Cancel</button>
                </td>
                <td />
              </tr>
            )}

            {/* Data rows */}
            {filtered.map(s => (
              <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                {/* Part */}
                <td className="px-4 py-2.5 overflow-hidden">
                  <div className="font-medium text-gray-800 truncate" title={s.parts?.name}>{s.parts?.name ?? '—'}</div>
                  {s.parts?.description && (
                    <div className="text-xs text-gray-400 truncate" title={s.parts.description}>{s.parts.description}</div>
                  )}
                </td>
                {/* Supplier */}
                <td className="px-4 py-2.5 overflow-hidden">
                  <EditableCell value={s.supplier} placeholder="+ supplier" onSave={v => onUpdate(s.id, { supplier: v })} />
                </td>
                {/* Carrier */}
                <td className="px-4 py-2.5 overflow-hidden">
                  <EditableCell value={s.carrier} placeholder="+ carrier" onSave={v => onUpdate(s.id, { carrier: v })} />
                </td>
                {/* Tracking */}
                <td className="px-4 py-2.5 overflow-hidden">
                  <TrackingCell value={s.tracking_number} onSave={v => onUpdate(s.id, { tracking_number: v })} />
                </td>
                {/* Qty */}
                <td className="px-4 py-2.5 text-center">
                  <EditableCell value={s.qty} type="number" onSave={v => onUpdate(s.id, { qty: v })} />
                </td>
                {/* ETA */}
                <td className="px-4 py-2.5 overflow-hidden">
                  <ETACell value={s.eta} onSave={v => onUpdate(s.id, { eta: v })} />
                </td>
                {/* Status */}
                <td className="px-4 py-2.5">
                  <StatusSelect value={s.status} onChange={v => onUpdate(s.id, { status: v })} />
                </td>
                {/* Notes */}
                <td className="px-4 py-2.5 overflow-hidden">
                  <EditableCell value={s.notes} placeholder="+ notes" onSave={v => onUpdate(s.id, { notes: v })} />
                </td>
                {/* Remove */}
                <td className="px-4 py-2.5 text-right">
                  {deleteConfirm === s.id ? (
                    <span className="space-x-2 whitespace-nowrap">
                      <button onClick={() => { onDelete(s.id); setDeleteConfirm(null) }} className="text-red-600 hover:text-red-800 font-medium text-xs">Confirm</button>
                      <button onClick={() => setDeleteConfirm(null)} className="text-gray-400 hover:text-gray-600 text-xs">Cancel</button>
                    </span>
                  ) : (
                    <button onClick={() => setDeleteConfirm(s.id)} className="text-gray-300 hover:text-red-500 transition-colors">✕</button>
                  )}
                </td>
                <td />
              </tr>
            ))}

            {!adding && filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-gray-400">
                  {search ? `No shipments match "${search}".` : 'No shipments yet. Click "+ Add Shipment" to get started.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ETACell({ value, onSave }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')

  const commit = () => {
    setEditing(false)
    if (draft !== (value ?? '')) onSave(draft || null)
  }

  const today = new Date().toISOString().split('T')[0]
  const isOverdue = value && value < today

  if (editing) {
    return (
      <input autoFocus type="date" value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        className="w-full border border-sky-400 rounded px-2 py-1 text-sm outline-none"
      />
    )
  }

  if (value) {
    return (
      <span onClick={() => { setDraft(value); setEditing(true) }}
        className={`cursor-pointer block truncate text-sm ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-700'}`}
        title={isOverdue ? 'Overdue' : ''}>
        {isOverdue ? '⚠ ' : ''}{value}
      </span>
    )
  }

  return (
    <span onClick={() => { setDraft(''); setEditing(true) }}
      className="cursor-pointer text-gray-300 hover:text-sky-500 text-sm italic">
      + add date
    </span>
  )
}
