import { useState } from 'react'

const COLUMN_OPTIONS = [
  { value: 'name', label: 'Part Name' },
  { value: 'description', label: 'Description' },
  { value: 'link', label: 'Model / Link' },
  { value: 'stock_level', label: 'Stock' },
  { value: 'reorder_threshold', label: 'Reorder At' },
  { value: 'lead_time_days', label: 'Lead Time (days)' },
  { value: 'unit', label: 'Unit' },
  { value: '_ignore', label: '— Ignore —' },
]

function parseSheet(text) {
  return text
    .split('\n')
    .map(row => row.split('\t').map(cell => cell.trim()))
    .filter(row => row.some(cell => cell !== ''))
}

export default function BulkImportPanel({ parts, onAdd, onUpdate }) {
  const [open, setOpen] = useState(false)
  const [raw, setRaw] = useState('')
  const [parsed, setParsed] = useState(null) // array of string[]
  const [mapping, setMapping] = useState([]) // column index → field key
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState(null) // { added, updated }
  const [confirmDupes, setConfirmDupes] = useState(false)

  const handlePaste = (e) => {
    // Let the textarea receive the paste naturally, then parse
    setTimeout(() => {
      const text = e.target.value
      const rows = parseSheet(text)
      if (!rows.length) return
      setParsed(rows)
      setDone(null)
      // Auto-map columns based on count
      const cols = rows[0].length
      const defaults = ['name', 'description', 'link', 'stock_level', 'reorder_threshold', 'lead_time_days', 'unit']
      setMapping(Array.from({ length: cols }, (_, i) => defaults[i] ?? '_ignore'))
    }, 0)
  }

  // Compute within-paste duplicate names (names appearing more than once)
  const getDupeNames = (rows, map) => {
    const nameIdx = map.indexOf('name')
    if (nameIdx < 0) return new Set()
    const seen = new Set()
    const dupes = new Set()
    for (const row of rows) {
      const n = (row[nameIdx] ?? '').toLowerCase().trim()
      if (!n) continue
      if (seen.has(n)) dupes.add(n)
      seen.add(n)
    }
    return dupes
  }

  const dupeNames = parsed ? getDupeNames(parsed, mapping) : new Set()

  const runImport = async () => {
    if (!parsed?.length) return
    setImporting(true)
    setConfirmDupes(false)

    const existingByName = Object.fromEntries(parts.map(p => [p.name.toLowerCase().trim(), p]))

    // Deduplicate within paste: last occurrence of each name wins
    const nameIdx = mapping.indexOf('name')
    const seen = new Set()
    const deduped = [...parsed].reverse().filter(row => {
      const n = (row[nameIdx] ?? '').toLowerCase().trim()
      if (!n || seen.has(n)) return false
      seen.add(n)
      return true
    }).reverse()

    let added = 0
    let updated = 0

    for (const row of deduped) {
      const record = {}
      row.forEach((cell, i) => {
        const field = mapping[i]
        if (field && field !== '_ignore' && cell !== '') {
          record[field] = ['stock_level', 'reorder_threshold', 'lead_time_days'].includes(field)
            ? Number(cell)
            : cell
        }
      })

      if (!record.name) continue

      const existing = existingByName[record.name.toLowerCase().trim()]
      if (existing) {
        const updates = { ...record }
        delete updates.name
        if (Object.keys(updates).length > 0) {
          await onUpdate(existing.id, updates)
          updated++
        }
      } else {
        await onAdd({
          name: record.name,
          description: record.description ?? '',
          stock_level: record.stock_level ?? 0,
          reorder_threshold: record.reorder_threshold ?? 0,
          lead_time_days: record.lead_time_days ?? 0,
          unit: record.unit ?? 'pcs',
          link: record.link ?? null,
        })
        added++
      }
    }

    setImporting(false)
    setDone({ added, updated, skipped: parsed.length - deduped.length })
    setRaw('')
    setParsed(null)
  }

  const handleImport = () => {
    if (dupeNames.size > 0) {
      setConfirmDupes(true)
    } else {
      runImport()
    }
  }

  const reset = () => {
    setRaw('')
    setParsed(null)
    setDone(null)
    setConfirmDupes(false)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header toggle */}
      <button
        onClick={() => { setOpen(o => !o); reset() }}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div>
          <span className="font-semibold text-gray-800">📋 Paste from Google Sheets</span>
          <span className="text-sm text-gray-400 ml-2">Bulk import or update parts</span>
        </div>
        <span className="text-gray-400 text-sm">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-gray-100 px-6 py-5 space-y-5">
          {!parsed && !done && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                In Google Sheets, select the cells you want to import (any columns), copy (⌘C), then paste below.
                Columns are auto-detected — you can remap them before importing.
              </p>
              <textarea
                value={raw}
                onChange={e => setRaw(e.target.value)}
                onPaste={handlePaste}
                placeholder="Paste your Google Sheets data here…"
                rows={6}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm font-mono outline-none focus:border-sky-400 resize-y"
              />
            </div>
          )}

          {parsed && !done && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">
                  {parsed.length} rows detected — map each column then click Import
                </p>
                <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600">← Paste again</button>
              </div>

              {/* Column mapping */}
              <div className="flex gap-3 flex-wrap">
                {mapping.map((field, i) => (
                  <div key={i} className="flex flex-col gap-1">
                    <label className="text-xs text-gray-400 uppercase tracking-wider">Column {i + 1}</label>
                    <select
                      value={field}
                      onChange={e => setMapping(m => m.map((v, j) => j === i ? e.target.value : v))}
                      className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-sky-400"
                    >
                      {COLUMN_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <span className="text-xs text-gray-400 truncate max-w-32" title={parsed[0]?.[i]}>
                      e.g. "{parsed[0]?.[i]}"
                    </span>
                  </div>
                ))}
              </div>

              {/* Preview table */}
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">#</th>
                      {mapping.map((field, i) => (
                        <th key={i} className="px-3 py-2 text-left font-medium">
                          {COLUMN_OPTIONS.find(o => o.value === field)?.label ?? field}
                        </th>
                      ))}
                      <th className="px-3 py-2 text-left font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {parsed.slice(0, 10).map((row, ri) => {
                      const nameIdx = mapping.indexOf('name')
                      const name = nameIdx >= 0 ? row[nameIdx] : ''
                      const nameLower = name.toLowerCase().trim()
                      const isDupe = name && dupeNames.has(nameLower)
                      const existsInDb = name && parts.some(p => p.name.toLowerCase().trim() === nameLower)
                      const rowColor = isDupe ? 'bg-red-50' : existsInDb ? 'bg-amber-50' : 'bg-green-50'
                      return (
                        <tr key={ri} className={rowColor}>
                          <td className="px-3 py-1.5 text-gray-400">{ri + 1}</td>
                          {row.map((cell, ci) => (
                            <td key={ci} className="px-3 py-1.5 text-gray-700 max-w-40 truncate">{cell}</td>
                          ))}
                          <td className="px-3 py-1.5">
                            {isDupe ? (
                              <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-red-200 text-red-800">Duplicate</span>
                            ) : existsInDb ? (
                              <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-amber-200 text-amber-800">Update</span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-green-200 text-green-800">Add</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                    {parsed.length > 10 && (
                      <tr><td colSpan={mapping.length + 2} className="px-3 py-2 text-center text-gray-400">… and {parsed.length - 10} more rows</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {dupeNames.size > 0 && (
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm">
                  <span className="text-red-500 text-base leading-none mt-0.5">⚠</span>
                  <div>
                    <p className="font-semibold text-red-800">{dupeNames.size} duplicate part name{dupeNames.size > 1 ? 's' : ''} detected in your paste</p>
                    <p className="text-red-600 mt-0.5">
                      Duplicates are highlighted in red. If you continue, only the <strong>last</strong> occurrence of each duplicate will be imported — earlier ones will be skipped.
                    </p>
                    <p className="text-red-500 text-xs mt-1">Duplicates: {[...dupeNames].join(', ')}</p>
                  </div>
                </div>
              )}

              {confirmDupes && (
                <div className="flex items-center gap-3 bg-orange-50 border border-orange-300 rounded-lg px-4 py-3">
                  <p className="text-sm font-medium text-orange-800 flex-1">
                    Proceed and skip earlier duplicates (keeping the last occurrence of each)?
                  </p>
                  <button
                    onClick={runImport}
                    disabled={importing}
                    className="px-4 py-1.5 bg-orange-600 text-white text-sm font-semibold rounded-lg hover:bg-orange-700 disabled:opacity-40 transition-colors whitespace-nowrap"
                  >
                    Yes, Import
                  </button>
                  <button
                    onClick={() => setConfirmDupes(false)}
                    className="px-4 py-1.5 border border-gray-300 text-sm rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
                  >
                    Go Back
                  </button>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleImport}
                  disabled={importing || !mapping.includes('name') || confirmDupes}
                  className="px-5 py-2 bg-sky-600 text-white text-sm font-semibold rounded-lg hover:bg-sky-700 disabled:opacity-40 transition-colors"
                >
                  {importing ? 'Importing…' : `Import ${parsed.length} rows`}
                </button>
                {!mapping.includes('name') && (
                  <p className="text-sm text-red-500 self-center">Map at least one column to "Part Name"</p>
                )}
              </div>
            </div>
          )}

          {done && (
            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-5 py-4">
              <div>
                <p className="font-semibold text-green-800">Import complete</p>
                <p className="text-sm text-green-600 mt-0.5">
                  {done.added} parts added · {done.updated} parts updated{done.skipped > 0 ? ` · ${done.skipped} duplicate${done.skipped > 1 ? 's' : ''} skipped` : ''}
                </p>
              </div>
              <button onClick={reset} className="text-sm text-green-700 hover:text-green-900 font-medium">
                Paste more
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
