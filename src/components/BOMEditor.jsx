import { useState } from 'react'
import { useBOM } from '../hooks/useBOM'
import { useColumnWidths } from '../hooks/useColumnWidths'
import ResizeHandle from './ResizeHandle'

const DEFAULT_WIDTHS = {
  part: 180,
  description: 200,
  unit: 80,
  qty: 110,
  leadtime: 100,
  link: 180,
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

export default function BOMEditor({ model, allParts, onUpdatePart, readOnly = false }) {
  const { items, loading, addItem, updateItem, removeItem, refresh } = useBOM(model?.id)
  const [selectedPartId, setSelectedPartId] = useState('')
  const [qty, setQty] = useState(1)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [widths, setWidth] = useColumnWidths('bom-column-widths', DEFAULT_WIDTHS)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)

  const normalize = s => (s ?? '').toLowerCase().replace(/\s+/g, '')
  const filteredItems = search.trim()
    ? items.filter(i => normalize(i.parts.name).includes(normalize(search)))
    : items

  const allFilteredSelected = filteredItems.length > 0 && filteredItems.every(i => selected.has(i.id))
  const toggleOne = (id) => setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  const toggleAll = () => {
    if (allFilteredSelected) {
      setSelected(prev => { const next = new Set(prev); filteredItems.forEach(i => next.delete(i.id)); return next })
    } else {
      setSelected(prev => new Set([...prev, ...filteredItems.map(i => i.id)]))
    }
  }

  const handleBulkDelete = async () => {
    await Promise.all([...selected].map(id => removeItem(id)))
    setSelected(new Set())
    setBulkDeleteConfirm(false)
  }

  const existingPartIds = new Set(items.map(i => i.parts.id))
  const availableParts = allParts.filter(p => !existingPartIds.has(p.id))

  const handleAdd = async () => {
    if (!selectedPartId) return
    const ok = await addItem(selectedPartId, qty)
    if (ok) { setSelectedPartId(''); setQty(1) }
  }

  // Bulk paste state
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkRaw, setBulkRaw] = useState('')
  const [bulkParsed, setBulkParsed] = useState(null)
  const [bulkImporting, setBulkImporting] = useState(false)
  const [bulkDone, setBulkDone] = useState(null)

  const parseBulk = (text) => {
    const rows = text
      .split('\n')
      .map(r => r.split('\t').map(c => c.trim()))
      .filter(r => r.some(c => c !== ''))
    if (!rows.length) return

    const inventoryByName = {}
    for (const p of allParts) {
      inventoryByName[normalize(p.name)] = p
    }
    const bomById = new Set(items.map(i => i.parts.id))
    const bomByPartId = Object.fromEntries(items.map(i => [i.parts.id, i]))

    setBulkParsed(rows.map(row => {
      const name = row[0] ?? ''
      const qty = Math.max(1, Number(row[1]) || 1)
      const part = inventoryByName[normalize(name)]
      if (!name) return null
      if (!part) return { name, qty, status: 'not_found' }
      if (bomById.has(part.id)) return { name, qty, part, existingItem: bomByPartId[part.id], status: 'update' }
      return { name, qty, part, status: 'add' }
    }).filter(Boolean))
    setBulkDone(null)
  }

  const handleBulkPaste = (e) => {
    setTimeout(() => { parseBulk(e.target.value) }, 0)
  }

  const handleBulkImport = async () => {
    if (!bulkParsed) return
    setBulkImporting(true)
    const importable = bulkParsed.filter(r => r.status !== 'not_found')
    let added = 0, updated = 0
    for (const row of importable) {
      if (row.status === 'add') {
        await addItem(row.part.id, row.qty)
        added++
      } else if (row.status === 'update') {
        await updateItem(row.existingItem.id, row.qty)
        updated++
      }
    }
    setBulkImporting(false)
    setBulkDone({ added, updated, rejected: bulkParsed.filter(r => r.status === 'not_found').length })
    setBulkRaw('')
    setBulkParsed(null)
  }

  const resetBulk = () => { setBulkRaw(''); setBulkParsed(null); setBulkDone(null) }

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
        <div className="flex items-center gap-2">
          {!readOnly && selected.size > 0 && (
            bulkDeleteConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-red-700 font-medium">Delete {selected.size} item{selected.size > 1 ? 's' : ''}?</span>
                <button onClick={handleBulkDelete} className="px-3 py-1.5 text-xs font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">Yes, Delete</button>
                <button onClick={() => setBulkDeleteConfirm(false)} className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
              </div>
            ) : (
              <button
                onClick={() => setBulkDeleteConfirm(true)}
                className="px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
              >
                Delete Selected ({selected.size})
              </button>
            )
          )}
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search parts…"
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-sky-400 w-52"
          />
        </div>
      </div>

      {/* Add part row */}
      {!readOnly && <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-100 bg-gray-50">
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
      </div>}

      {/* Bulk paste panel */}
      {!readOnly && <div className="border-b border-gray-100">
        <button
          onClick={() => { setBulkOpen(o => !o); resetBulk() }}
          className="w-full flex items-center justify-between px-6 py-3 text-left hover:bg-gray-50 transition-colors"
        >
          <span className="text-sm font-medium text-gray-600">📋 Paste from Google Sheets</span>
          <span className="text-gray-400 text-xs">{bulkOpen ? '▲' : '▼'}</span>
        </button>

        {bulkOpen && (
          <div className="px-6 pb-5 space-y-4 bg-gray-50">
            {!bulkParsed && !bulkDone && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500">Paste two columns from Google Sheets: <strong>Part Name</strong> (col A) and <strong>Qty</strong> (col B). Parts not in inventory will be rejected.</p>
                <textarea
                  value={bulkRaw}
                  onChange={e => setBulkRaw(e.target.value)}
                  onPaste={handleBulkPaste}
                  placeholder="Paste here…"
                  rows={5}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-sky-400 resize-y"
                />
              </div>
            )}

            {bulkParsed && !bulkDone && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-700">{bulkParsed.length} rows detected</p>
                  <button onClick={resetBulk} className="text-xs text-gray-400 hover:text-gray-600">← Paste again</button>
                </div>

                <div className="rounded-lg border border-gray-200 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-100 text-gray-500 uppercase tracking-wider">
                      <tr>
                        <th className="px-3 py-2 text-left">#</th>
                        <th className="px-3 py-2 text-left">Part Name</th>
                        <th className="px-3 py-2 text-center">Qty</th>
                        <th className="px-3 py-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {bulkParsed.map((row, i) => (
                        <tr key={i} className={row.status === 'not_found' ? 'bg-red-50' : row.status === 'update' ? 'bg-amber-50' : 'bg-green-50'}>
                          <td className="px-3 py-1.5 text-gray-400">{i + 1}</td>
                          <td className="px-3 py-1.5 font-medium text-gray-700">{row.name}</td>
                          <td className="px-3 py-1.5 text-center tabular-nums">{row.qty}</td>
                          <td className="px-3 py-1.5">
                            {row.status === 'not_found' && <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-red-200 text-red-800">Not in inventory — will be skipped</span>}
                            {row.status === 'add' && <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-green-200 text-green-800">Add to BOM</span>}
                            {row.status === 'update' && <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-amber-200 text-amber-800">Update qty (was {row.existingItem.quantity_per_unit})</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {bulkParsed.some(r => r.status === 'not_found') && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm">
                    <span className="text-red-500 mt-0.5">⚠</span>
                    <p className="text-red-700"><strong>{bulkParsed.filter(r => r.status === 'not_found').length} part(s) not found in inventory</strong> and will be skipped. Add them to inventory first, then re-import.</p>
                  </div>
                )}

                {bulkParsed.every(r => r.status === 'not_found') ? (
                  <p className="text-sm text-red-600 font-medium">No importable rows — all parts must exist in inventory first.</p>
                ) : (
                  <button
                    onClick={handleBulkImport}
                    disabled={bulkImporting}
                    className="px-5 py-2 bg-sky-600 text-white text-sm font-semibold rounded-lg hover:bg-sky-700 disabled:opacity-40 transition-colors"
                  >
                    {bulkImporting ? 'Importing…' : `Import ${bulkParsed.filter(r => r.status !== 'not_found').length} rows`}
                  </button>
                )}
              </div>
            )}

            {bulkDone && (
              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-5 py-4">
                <div>
                  <p className="font-semibold text-green-800">Import complete</p>
                  <p className="text-sm text-green-600 mt-0.5">
                    {bulkDone.added} added · {bulkDone.updated} updated{bulkDone.rejected > 0 ? ` · ${bulkDone.rejected} skipped (not in inventory)` : ''}
                  </p>
                </div>
                <button onClick={resetBulk} className="text-sm text-green-700 hover:text-green-900 font-medium">Paste more</button>
              </div>
            )}
          </div>
        )}
      </div>}

      {/* BOM table */}
      {loading ? (
        <div className="p-8 text-center text-gray-400">Loading…</div>
      ) : (
        <div className="overflow-auto max-h-[65vh]">
        <table className="text-sm" style={{ tableLayout: 'fixed', width: '100%' }}>
          <colgroup>
            <col style={{ width: 40 }} />
            <col style={{ width: widths.part }} />
            <col style={{ width: widths.description }} />
            <col style={{ width: widths.unit }} />
            <col style={{ width: widths.qty }} />
            <col style={{ width: widths.leadtime }} />
            <col style={{ width: widths.link }} />
            <col style={{ width: widths.remove }} />
            <col />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
            <tr>
              {!readOnly && <th className="px-3 py-3 text-center">
                <input type="checkbox" checked={allFilteredSelected} onChange={toggleAll} className="cursor-pointer" />
              </th>}
              {[
                ['part', 'Part', 'text-left'],
                ['description', 'Description', 'text-left'],
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
              <tr key={item.id} className={`transition-colors ${selected.has(item.id) ? 'bg-sky-50' : 'hover:bg-gray-50'}`}>
                {!readOnly && <td className="px-3 py-3 text-center">
                  <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleOne(item.id)} className="cursor-pointer" />
                </td>}
                <td className="px-6 py-3 font-medium overflow-hidden truncate">{item.parts.name}</td>
                <td className="px-6 py-3 text-gray-500 overflow-hidden truncate" title={item.parts.description}>{item.parts.description || '—'}</td>
                <td className="px-6 py-3 text-gray-500 overflow-hidden truncate">{item.parts.unit}</td>
                <td className="px-6 py-3 text-center overflow-hidden">
                  {readOnly ? item.quantity_per_unit : (
                    <EditableQty value={item.quantity_per_unit} onSave={v => updateItem(item.id, v)} />
                  )}
                </td>
                <td className="px-6 py-3 text-center text-gray-500 overflow-hidden truncate">{item.parts.lead_time_days}d</td>
                <td className="px-6 py-3 overflow-hidden">
                  {readOnly ? (
                    item.parts.link ? (
                      /^https?:\/\//i.test(item.parts.link)
                        ? <a href={item.parts.link} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline text-sm truncate block">🔗 {item.parts.link.replace(/^https?:\/\//, '')}</a>
                        : <span className="text-sm text-gray-700 truncate block">{item.parts.link}</span>
                    ) : null
                  ) : (
                    <EditableLink value={item.parts.link} onSave={async v => { await onUpdatePart(item.parts.id, { link: v }); refresh() }} />
                  )}
                </td>
                {!readOnly && <td className="px-6 py-3 text-right">
                  {deleteConfirm === item.id ? (
                    <span className="space-x-2">
                      <button onClick={() => { removeItem(item.id); setDeleteConfirm(null) }} className="text-red-600 hover:text-red-800 text-xs font-medium">Confirm</button>
                      <button onClick={() => setDeleteConfirm(null)} className="text-gray-400 text-xs">Cancel</button>
                    </span>
                  ) : (
                    <button onClick={() => setDeleteConfirm(item.id)} className="text-gray-300 hover:text-red-500 transition-colors">✕</button>
                  )}
                </td>}
                <td />
              </tr>
            ))}
            {filteredItems.length === 0 && (
              <tr><td colSpan={9} className="px-6 py-8 text-center text-gray-400">
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
