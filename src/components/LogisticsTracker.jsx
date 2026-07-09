import { useState, useEffect } from 'react'
import { useColumnWidths } from '../hooks/useColumnWidths'
import ResizeHandle from './ResizeHandle'
import LogisticsHistoryModal from './LogisticsHistoryModal'
import LogisticsAttachmentsModal from './LogisticsAttachmentsModal'
import { supabase } from '../lib/supabase'

const STATUS_OPTIONS = [
  'Order Received',
  'Source Chosen',
  'Invoice Issued',
  'Invoice Passed to Finance Dep',
  'Invoice Paid',
  'In Lead Time',
  'Ready To Pickup',
  'Picked Up / On The Way',
  'Arrived to Armenia',
  'In Custom Clearance',
  'Delivered / Received',
]

const STATUS_COLORS = {
  'Order Received':                'bg-gray-100 text-gray-700',
  'Source Chosen':                 'bg-purple-100 text-purple-800',
  'Invoice Issued':                'bg-yellow-100 text-yellow-800',
  'Invoice Passed to Finance Dep': 'bg-orange-100 text-orange-800',
  'Invoice Paid':                  'bg-amber-100 text-amber-800',
  'In Lead Time':                  'bg-blue-100 text-blue-800',
  'Ready To Pickup':               'bg-sky-100 text-sky-800',
  'Picked Up / On The Way':        'bg-indigo-100 text-indigo-800',
  'Arrived to Armenia':            'bg-teal-100 text-teal-800',
  'In Custom Clearance':           'bg-rose-100 text-rose-800',
  'Delivered / Received':          'bg-green-100 text-green-800',
}

const CURRENCIES = ['USD', 'EUR', 'AMD']

const COLS = [
  { key: 'product_name',               label: 'Product Name',                  type: 'text',    w: 200 },
  { key: 'status',                      label: 'Status',                        type: 'status',  w: 160 },
  { key: 'eta',                         label: 'ETA',                           type: 'date',    w: 130 },
  { key: 'quantity',                    label: 'Quantity',                      type: 'number',  w: 90  },
  { key: 'supplier',                    label: 'Supplier',                      type: 'text',    w: 150 },
  { key: 'unit_price',                  label: 'Unit Price',                    type: 'number',  w: 110 },
  { key: 'invoice_amount',              label: 'Invoice Amount',                type: 'number',  w: 130 },
  { key: 'currency',                    label: 'Currency',                      type: 'select',  w: 100, options: CURRENCIES },
  { key: 'order_date',                  label: 'Order Date',                    type: 'date',    w: 130 },
  { key: 'responsible_person',          label: 'Responsible Person',            type: 'text',    w: 160 },
  { key: 'department',                  label: 'Department',                    type: 'text',    w: 140 },
  { key: 'lead_time_days',              label: 'Lead Time (days)',              type: 'number',  w: 130 },
  { key: 'payment_method',              label: 'Payment Method',                type: 'select',  w: 150, options: ['Invoice', 'PayPal'] },
  { key: 'invoice_status',              label: 'Invoice Status',                type: 'select',  w: 220, options: ['Issued', 'Transfered to Finance Department', 'Paid'] },
  { key: 'invoice_status_date',         label: 'Invoice Status Date',           type: 'date',    w: 150 },
  { key: 'source_of_procurement',       label: 'Source of Procurement',         type: 'select',  w: 190, options: ['Directly from Supplier', 'Supplier Webpage', 'External Marketplace'] },
  { key: 'delivery_term',               label: 'Delivery Term',                 type: 'select',  w: 160, options: ['Container', 'Air', 'Fedex/DHL/UPS', 'Globbing/Onex'] },
  { key: 'actual_arrival_date',         label: 'Actual Arrival',               type: 'date',    w: 130 },
  { key: 'transportation_cost',         label: 'Transportation Cost',           type: 'number',  w: 160 },
  { key: 'transportation_payment',      label: 'Transportation Payment',        type: 'select',  w: 200, options: ['Invoice Issued', 'Invoice shared with Finance Department', 'Invoice Paid'] },
  { key: 'custom_clearance_cost',       label: 'Custom Clearance Cost',         type: 'number',  w: 170 },
  { key: 'custom_clearance_status',     label: 'Custom Clearance Status',       type: 'select',  w: 210, options: ['Arrived at custom serivce', 'Info Passed to Finance Department', 'Tax paid', 'Custom Clearance Completed'] },
  { key: 'expertise_service_fee',       label: 'Expertise Service Fee',         type: 'number',  w: 170 },
  { key: 'expertise_fee_payment_status',label: 'Expertise Fee Payment Status',  type: 'select',  w: 210, options: ['Info Passed to Finance Department', 'Tax paid'] },
]

const DEFAULT_WIDTHS = Object.fromEntries(COLS.map(c => [c.key, c.w]))

function EditableCell({ value, type = 'text', placeholder = '', onSave }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')

  const commit = () => {
    setEditing(false)
    const val = type === 'number' ? (draft === '' ? null : Number(draft)) : (draft.trim() || null)
    if (val !== (value ?? null)) onSave(val)
  }

  if (editing) {
    return (
      <input
        autoFocus
        type={type === 'number' ? 'number' : 'text'}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        className="w-full border border-sky-400 rounded px-2 py-1 text-sm outline-none"
      />
    )
  }

  const display = value !== null && value !== undefined && value !== '' ? String(value) : null

  return (
    <span
      onClick={() => { setDraft(value ?? ''); setEditing(true) }}
      className="cursor-pointer hover:bg-sky-50 rounded px-1 -mx-1 block min-h-6 truncate text-sm"
      title={display ?? ''}
    >
      {display ?? <span className="text-gray-300 italic text-xs">{placeholder || '+ add'}</span>}
    </span>
  )
}

function DateCell({ value, onSave, highlight }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')

  const commit = () => {
    setEditing(false)
    if (draft !== (value ?? '')) onSave(draft || null)
  }

  const today = new Date().toISOString().split('T')[0]
  const isOverdue = highlight && value && value < today

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

  return (
    <span
      onClick={() => { setDraft(value ?? ''); setEditing(true) }}
      className={`cursor-pointer hover:bg-sky-50 rounded px-1 -mx-1 block min-h-6 truncate text-sm ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-700'}`}
    >
      {value ? (isOverdue ? `⚠ ${value}` : value) : <span className="text-gray-300 italic text-xs">+ date</span>}
    </span>
  )
}

function SelectCell({ value, options, onSave }) {
  const [editing, setEditing] = useState(false)
  if (editing) {
    return (
      <select autoFocus value={value ?? ''}
        onChange={e => { onSave(e.target.value || null); setEditing(false) }}
        onBlur={() => setEditing(false)}
        className="w-full border border-sky-400 rounded px-2 py-1 text-sm outline-none">
        <option value="">—</option>
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
    )
  }
  return (
    <span onClick={() => setEditing(true)}
      className="cursor-pointer hover:bg-sky-50 rounded px-1 -mx-1 block min-h-6 truncate text-sm">
      {value ?? <span className="text-gray-300 italic text-xs">+ select</span>}
    </span>
  )
}

function StatusCell({ value, onChange }) {
  const [editing, setEditing] = useState(false)
  const color = STATUS_COLORS[value] ?? 'bg-gray-100 text-gray-700'

  if (editing) {
    return (
      <select
        autoFocus
        value={value ?? ''}
        onChange={e => { onChange(e.target.value); setEditing(false) }}
        onBlur={() => setEditing(false)}
        className="w-full border border-sky-400 rounded px-2 py-1 text-sm outline-none"
      >
        {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
      </select>
    )
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity ${color}`}
    >
      {value}<span className="opacity-60">▾</span>
    </span>
  )
}

export default function LogisticsTracker({ shipments, onAdd, onUpdate, onDelete }) {
  const [widths, setWidth] = useColumnWidths('logistics-column-widths-v2', DEFAULT_WIDTHS)
  const [search, setSearch] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [historyShipment, setHistoryShipment] = useState(null)
  const [attachmentsShipment, setAttachmentsShipment] = useState(null)
  const [attachmentCounts, setAttachmentCounts] = useState({})

  useEffect(() => {
    if (!shipments.length) return
    supabase
      .from('logistics_attachments')
      .select('logistics_id')
      .in('logistics_id', shipments.map(s => s.id))
      .then(({ data }) => {
        if (!data) return
        const counts = {}
        data.forEach(r => { counts[r.logistics_id] = (counts[r.logistics_id] ?? 0) + 1 })
        setAttachmentCounts(counts)
      })
  }, [shipments])

  const handleAttachmentCountChange = (id, count) => {
    setAttachmentCounts(prev => ({ ...prev, [id]: count }))
  }

  const normalize = s => (s ?? '').toLowerCase().replace(/\s+/g, '')
  const filtered = search.trim()
    ? shipments.filter(s =>
        normalize(s.product_name).includes(normalize(search)) ||
        normalize(s.supplier).includes(normalize(search)) ||
        normalize(s.responsible_person).includes(normalize(search)) ||
        normalize(s.department).includes(normalize(search))
      )
    : shipments

  const handleAdd = () => onAdd({ product_name: 'New Shipment', status: 'Order Received' })

  const totalCols = COLS.length + 4 // + attachments + history + delete + spacer

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
          <p className="text-xs text-gray-400 mt-0.5">Track purchased goods from order to delivery</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search product, supplier, person…"
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-sky-400 w-64"
          />
          <button
            onClick={handleAdd}
            className="px-3 py-1.5 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-700 transition-colors whitespace-nowrap"
          >
            + Add Shipment
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto max-h-[70vh]">
        <table className="text-sm" style={{ tableLayout: 'fixed', width: 'max-content', minWidth: '100%' }}>
          <colgroup>
            {COLS.map(c => <col key={c.key} style={{ width: widths[c.key] ?? c.w }} />)}
            <col style={{ width: 90 }} />
            <col style={{ width: 80 }} />
            <col style={{ width: 80 }} />
            <col />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
            <tr>
              {COLS.map(c => (
                <th key={c.key} className="relative px-4 py-3 font-medium text-left whitespace-nowrap">
                  {c.label}
                  <ResizeHandle width={widths[c.key] ?? c.w} onResize={w => setWidth(c.key, w)} />
                </th>
              ))}
              <th className="px-4 py-3 font-medium text-center">Files</th>
              <th className="px-4 py-3 font-medium text-center">History</th>
              <th className="px-4 py-3 font-medium text-right">Delete</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {/* Data rows */}
            {filtered.map(s => (
              <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                {COLS.map(c => (
                  <td key={c.key} className="px-4 py-2.5 overflow-hidden">
                    {c.type === 'status' ? (
                      <StatusCell value={s.status} onChange={v => onUpdate(s.id, { status: v })} />
                    ) : c.type === 'date' ? (
                      <DateCell
                        value={s[c.key]}
                        highlight={c.key === 'eta'}
                        onSave={v => onUpdate(s.id, { [c.key]: v })}
                      />
                    ) : c.type === 'select' ? (
                      <SelectCell value={s[c.key]} options={c.options} onSave={v => onUpdate(s.id, { [c.key]: v })} />
                    ) : (
                      <EditableCell
                        value={s[c.key]}
                        type={c.type}
                        onSave={v => onUpdate(s.id, { [c.key]: v })}
                      />
                    )}
                  </td>
                ))}
                <td className="px-4 py-2.5 text-center">
                  <button
                    onClick={() => setAttachmentsShipment(s)}
                    className="relative inline-flex items-center gap-1 text-gray-400 hover:text-sky-600 transition-colors text-sm"
                    title="Attachments"
                  >
                    📎
                    {attachmentCounts[s.id] > 0 && (
                      <span className="absolute -top-1.5 -right-2 bg-sky-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                        {attachmentCounts[s.id]}
                      </span>
                    )}
                  </button>
                </td>
                <td className="px-4 py-2.5 text-center">
                  <button
                    onClick={() => setHistoryShipment(s)}
                    className="text-sky-500 hover:text-sky-700 text-sm transition-colors"
                    title="View change history"
                  >🕐</button>
                </td>
                <td className="px-4 py-2.5 text-right whitespace-nowrap">
                  {deleteConfirm === s.id ? (
                    <span className="space-x-2">
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

            {filtered.length === 0 && (
              <tr>
                <td colSpan={totalCols} className="px-4 py-10 text-center text-gray-400">
                  {search ? `No shipments match "${search}".` : 'No shipments yet. Click "+ Add Shipment" to get started.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {attachmentsShipment && (
        <LogisticsAttachmentsModal
          shipment={attachmentsShipment}
          onClose={() => setAttachmentsShipment(null)}
          onCountChange={handleAttachmentCountChange}
        />
      )}

      {historyShipment && (
        <LogisticsHistoryModal
          shipment={historyShipment}
          onClose={() => setHistoryShipment(null)}
        />
      )}
    </div>
  )
}
