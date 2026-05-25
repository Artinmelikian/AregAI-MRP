import { format } from 'date-fns'

export default function PlannerResults({ results, onReset }) {
  const { rows, feasible, targetDate } = results

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
          </p>
        </div>
        <button
          onClick={onReset}
          className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-white transition-colors"
        >
          New Plan
        </button>
      </div>

      {/* Results table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Part</th>
                <th className="px-4 py-3 text-right font-medium">Required</th>
                <th className="px-4 py-3 text-right font-medium">In Stock</th>
                <th className="px-4 py-3 text-right font-medium">Shortage</th>
                <th className="px-4 py-3 text-center font-medium">Order By Date</th>
                <th className="px-4 py-3 text-center font-medium">Lead Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map(row => (
                <tr
                  key={row.partId}
                  className={row.shortage > 0 ? 'bg-red-50' : 'bg-green-50'}
                >
                  <td className="px-4 py-3 font-medium">
                    {row.partName}
                    <span className="text-gray-400 text-xs ml-1">({row.unit})</span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.required}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.inStock}</td>
                  <td className={`px-4 py-3 text-right font-semibold tabular-nums ${row.shortage > 0 ? 'text-red-700' : 'text-green-700'}`}>
                    {row.shortage > 0 ? `-${row.shortage}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1.5 ${row.isUrgent ? 'text-red-700' : 'text-gray-700'}`}>
                      {format(row.orderByDate, 'MMM d, yyyy')}
                      {row.isUrgent && (
                        <span className="px-1.5 py-0.5 text-xs font-bold rounded bg-red-200 text-red-800">URGENT</span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-500">{row.leadTimeDays}d</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
