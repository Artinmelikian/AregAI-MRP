import { useState } from 'react'
import { format } from 'date-fns'

export default function PlannerForm({ models, onCalculate, calculating, initialBatch, initialTargetDate }) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const [targetDate, setTargetDate] = useState(initialTargetDate || '')
  const [quantities, setQuantities] = useState(() => {
    if (!initialBatch) return {}
    return Object.fromEntries(initialBatch.filter(b => b.qty > 0).map(b => [b.modelId, b.qty]))
  })

  const setQty = (modelId, val) =>
    setQuantities(prev => ({ ...prev, [modelId]: Math.max(0, Number(val)) }))

  const handleSubmit = (e) => {
    e.preventDefault()
    const batch = models.map(m => ({ modelId: m.id, modelName: m.name, qty: quantities[m.id] || 0 }))
    onCalculate(batch, targetDate)
  }

  const total = Object.values(quantities).reduce((s, v) => s + (v || 0), 0)

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold mb-5">Define Production Batch</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {models.map(model => (
          <div key={model.id} className="border border-gray-200 rounded-lg p-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">{model.name}</label>
            {model.description && <p className="text-xs text-gray-400 mb-2">{model.description}</p>}
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={quantities[model.id] || ''}
                onChange={e => setQty(model.id, e.target.value)}
                placeholder="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-sky-400"
              />
              <span className="text-xs text-gray-400 whitespace-nowrap">units</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Target Completion Date</label>
          <input
            type="date"
            min={today}
            value={targetDate}
            onChange={e => setTargetDate(e.target.value)}
            required
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-sky-400"
          />
        </div>
        <button
          type="submit"
          disabled={calculating || total === 0}
          className="px-6 py-2 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 disabled:opacity-40 transition-colors"
        >
          {calculating ? 'Calculating…' : `Calculate (${total} robots)`}
        </button>
      </div>
    </form>
  )
}
