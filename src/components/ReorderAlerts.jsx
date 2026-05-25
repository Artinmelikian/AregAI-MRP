export default function ReorderAlerts({ parts }) {
  if (!parts.length) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Reorder Alerts</h2>
        <p className="text-sm text-green-600 font-medium">All parts are sufficiently stocked.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold mb-4">
        Reorder Alerts
        <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700 font-bold">
          {parts.length}
        </span>
      </h2>
      <div className="space-y-3">
        {parts.map(part => {
          const outOfStock = part.stock_level === 0
          return (
            <div
              key={part.id}
              className={`flex items-center justify-between rounded-lg px-4 py-3 border ${
                outOfStock ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'
              }`}
            >
              <div>
                <p className="font-medium text-sm">{part.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Lead time: {part.lead_time_days}d · Threshold: {part.reorder_threshold} {part.unit}
                </p>
              </div>
              <div className="text-right">
                <span
                  className={`inline-block px-2 py-0.5 text-xs font-bold rounded-full ${
                    outOfStock ? 'bg-red-200 text-red-800' : 'bg-orange-200 text-orange-800'
                  }`}
                >
                  {outOfStock ? 'OUT OF STOCK' : 'LOW STOCK'}
                </span>
                <p className="text-sm font-semibold mt-1">
                  {part.stock_level} / {part.reorder_threshold} {part.unit}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
