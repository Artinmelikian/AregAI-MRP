import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { useColumnWidths } from '../hooks/useColumnWidths'
import ResizeHandle from './ResizeHandle'

const ASSEMBLY_WIDTHS = {
  model: 140,
  qty: 80,
  mech: 130,
  elec: 130,
  total: 100,
  partsNeededBy: 160,
}

const PARTS_WIDTHS = {
  part: 220,
  required: 100,
  inStock: 100,
  shortage: 100,
  orderBy: 170,
  leadTime: 110,
  send: 140,
}

function SaveBar({ currentPlan, defaultName, onSave, onSaveAsNew, onEdit }) {
  const [name, setName] = useState(currentPlan?.name || defaultName || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => { setName(currentPlan?.name || defaultName || '') }, [currentPlan, defaultName])

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    await onSave(name.trim())
    setSaving(false)
  }

  const handleSaveAsNew = async () => {
    if (!name.trim()) return
    setSaving(true)
    await onSaveAsNew(name.trim())
    setSaving(false)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 px-6 py-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Plan name (e.g. June Production Run)"
        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-sky-400"
      />
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={onEdit}
          className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          ✏️ Edit Inputs
        </button>
        {currentPlan && (
          <button
            onClick={handleSaveAsNew}
            disabled={saving || !name.trim()}
            className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            Save as New
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="px-4 py-2 bg-sky-600 text-white text-sm font-semibold rounded-lg hover:bg-sky-700 disabled:opacity-40 transition-colors"
        >
          {saving ? 'Saving…' : currentPlan ? 'Update Plan' : '💾 Save Plan'}
        </button>
      </div>
    </div>
  )
}

export default function PlannerResults({ results, onReset, currentPlan, onSave, onSaveAsNew, onEdit, onSendToPurchasing }) {
  const { rows, feasible, targetDate, partsNeededBy, maxAssemblyDays, assemblyByModel } = results
  const hasAssemblyData = maxAssemblyDays > 0
  const shortageCount = rows.filter(r => r.shortage > 0).length
  const [assemblyWidths, setAssemblyWidth] = useColumnWidths('planner-assembly-column-widths', ASSEMBLY_WIDTHS)
  const [partsWidths, setPartsWidth] = useColumnWidths('planner-parts-column-widths', PARTS_WIDTHS)
  const [sentIds, setSentIds] = useState(new Set())

  const handleSend = async (row) => {
    await onSendToPurchasing(row)
    setSentIds(prev => new Set([...prev, row.partId]))
  }

  const handleSendAll = async () => {
    await onSendToPurchasing()
    setSentIds(prev => new Set([...prev, ...rows.filter(r => r.shortage > 0).map(r => r.partId)]))
  }

  return (
    <div className="space-y-4">
      {/* Status banner */}
      <div className={`rounded-xl px-6 py-4 flex items-center justify-between ${
        feasible ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
      }`}>
        <div>
          <span className={`text-xl font-bold ${feasible ? 'text-green-700' : 'text-red-700'}`}>
            {feasible ? '✓ FEASIBLE' : '✗ INFEASIBLE'}
          </span>
          <p className="text-sm text-gray-500 mt-0.5">
            Target: {format(targetDate, 'MMMM d, yyyy')} · {rows.length} parts analyzed
            {currentPlan && <span className="ml-2 text-sky-600 font-medium">· {currentPlan.name}</span>}
          </p>
        </div>
        <button
          onClick={onReset}
          className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-white transition-colors"
        >
          New Plan
        </button>
      </div>

      {/* Save bar */}
      <SaveBar
        currentPlan={currentPlan}
        defaultName={`Plan – ${format(targetDate, 'MMM d, yyyy')}`}
        onSave={onSave}
        onSaveAsNew={onSaveAsNew}
        onEdit={onEdit}
      />

      {/* Assembly Timeline */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-700">🏗️ Assembly Timeline</h3>
        </div>
        <div className="overflow-auto max-h-[50vh]">
          <table className="text-sm" style={{ tableLayout: 'fixed', width: '100%' }}>
            <colgroup>
              <col style={{ width: assemblyWidths.model }} />
              <col style={{ width: assemblyWidths.qty }} />
              <col style={{ width: assemblyWidths.mech }} />
              <col style={{ width: assemblyWidths.elec }} />
              <col style={{ width: assemblyWidths.total }} />
              <col style={{ width: assemblyWidths.partsNeededBy }} />
            </colgroup>
            <thead className="sticky top-0 z-10 bg-white text-xs uppercase tracking-wider text-gray-500 border-b border-gray-100">
              <tr>
                {[
                  ['model', 'Model', 'text-left'],
                  ['qty', 'Qty', 'text-center'],
                  ['mech', '⚙️ Mechanical', 'text-center'],
                  ['elec', '⚡ Electrical', 'text-center'],
                  ['total', 'Total', 'text-center'],
                  ['partsNeededBy', 'Parts Needed By', 'text-center'],
                ].map(([key, label, align]) => (
                  <th key={key} className={`relative px-4 py-2.5 font-medium ${align}`}>
                    <span className="truncate block pr-2">{label}</span>
                    <ResizeHandle width={assemblyWidths[key]} onResize={w => setAssemblyWidth(key, w)} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {Object.values(assemblyByModel).map(({ modelName, qty, mechDays, elecDays, totalDays }) => {
                const isBottleneck = totalDays === maxAssemblyDays && maxAssemblyDays > 0
                return (
                  <tr key={modelName} className={isBottleneck ? 'bg-orange-50' : ''}>
                    <td className="px-4 py-2.5 font-medium overflow-hidden truncate">
                      {modelName}
                      {isBottleneck && maxAssemblyDays > 0 && (
                        <span className="ml-2 px-1.5 py-0.5 text-xs bg-orange-200 text-orange-800 rounded font-bold">BOTTLENECK</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center tabular-nums text-gray-600">{qty}</td>
                    <td className="px-4 py-2.5 text-center tabular-nums">{mechDays.toFixed(1)}d</td>
                    <td className="px-4 py-2.5 text-center tabular-nums">{elecDays.toFixed(1)}d</td>
                    <td className="px-4 py-2.5 text-center font-semibold tabular-nums">{totalDays.toFixed(1)}d</td>
                    <td className="px-4 py-2.5 text-center text-gray-600 overflow-hidden truncate">
                      {format(partsNeededBy, 'MMM d, yyyy')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="border-t-2 border-gray-200 bg-gray-50">
              <tr>
                <td colSpan={4} className="px-4 py-2.5 text-sm text-gray-500">
                  {hasAssemblyData
                    ? `Planning buffer: ${maxAssemblyDays.toFixed(1)} days (longest model)`
                    : 'No assembly times configured — go to Robot Models → Assembly Timeline to set them'}
                </td>
                <td className="px-4 py-2.5 text-center font-bold">{maxAssemblyDays.toFixed(1)}d</td>
                <td className="px-4 py-2.5 text-center font-semibold text-sky-700">
                  {format(partsNeededBy, 'MMM d, yyyy')}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Parts requirements table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-700">🔩 Parts Requirements</h3>
            {hasAssemblyData && (
              <p className="text-xs text-gray-400 mt-0.5">
                Order By Date = Parts Needed By ({format(partsNeededBy, 'MMM d')}) − Part Lead Time
              </p>
            )}
          </div>
          <button
            onClick={handleSendAll}
            disabled={shortageCount === 0}
            title={shortageCount > 0 ? `Set "Qty Ordered" = shortage for ${shortageCount} part(s) in Purchasing Tracker` : 'No shortages to send'}
            className="px-3 py-1.5 text-sm font-medium bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            🛒 Send Shortages to Purchasing{shortageCount > 0 ? ` (${shortageCount})` : ''}
          </button>
        </div>
        <div className="overflow-auto max-h-[60vh]">
          <table className="text-sm" style={{ tableLayout: 'fixed', width: '100%' }}>
            <colgroup>
              <col style={{ width: partsWidths.part }} />
              <col style={{ width: partsWidths.required }} />
              <col style={{ width: partsWidths.inStock }} />
              <col style={{ width: partsWidths.shortage }} />
              <col style={{ width: partsWidths.orderBy }} />
              <col style={{ width: partsWidths.leadTime }} />
              <col style={{ width: partsWidths.send }} />
            </colgroup>
            <thead className="sticky top-0 z-10 bg-gray-50 text-xs uppercase tracking-wider text-gray-500 border-b border-gray-100">
              <tr>
                {[
                  ['part', 'Part', 'text-left'],
                  ['required', 'Required', 'text-center'],
                  ['inStock', 'In Stock', 'text-center'],
                  ['shortage', 'Shortage', 'text-center'],
                  ['orderBy', 'Order By Date', 'text-center'],
                  ['leadTime', 'Lead Time', 'text-center'],
                ].map(([key, label, align]) => (
                  <th key={key} className={`relative px-4 py-3 font-medium ${align}`}>
                    <span className="truncate block pr-2">{label}</span>
                    <ResizeHandle width={partsWidths[key]} onResize={w => setPartsWidth(key, w)} />
                  </th>
                ))}
                <th className="px-4 py-3 font-medium text-center">Purchasing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map(row => (
                <tr
                  key={row.partId}
                  className={row.shortage > 0 ? 'bg-red-50' : 'bg-green-50'}
                >
                  <td className="px-4 py-3 font-medium overflow-hidden truncate">
                    {row.partName}
                    <span className="text-gray-400 text-xs ml-1">({row.unit})</span>
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums">{row.required}</td>
                  <td className="px-4 py-3 text-center tabular-nums">{row.inStock}</td>
                  <td className={`px-4 py-3 text-center font-semibold tabular-nums ${row.shortage > 0 ? 'text-red-700' : 'text-green-700'}`}>
                    {row.shortage > 0 ? `-${row.shortage}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-center overflow-hidden">
                    <span className={`inline-flex items-center gap-1.5 ${row.isUrgent ? 'text-red-700' : 'text-gray-700'}`}>
                      {format(row.orderByDate, 'MMM d, yyyy')}
                      {row.isUrgent && (
                        <span className="px-1.5 py-0.5 text-xs font-bold rounded bg-red-200 text-red-800">URGENT</span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-500">{row.leadTimeDays}d</td>
                  <td className="px-4 py-3 text-center">
                    {sentIds.has(row.partId) ? (
                      <span className="inline-block text-xs font-semibold rounded-full px-2.5 py-1 bg-green-100 text-green-700">
                        ✓ Added to Tracker
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSend(row)}
                        disabled={row.shortage <= 0}
                        title={row.shortage > 0 ? `Send shortage of ${row.shortage} to Purchasing Tracker` : 'No shortage'}
                        className="px-2.5 py-1 text-xs font-medium bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                      >
                        Send
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
