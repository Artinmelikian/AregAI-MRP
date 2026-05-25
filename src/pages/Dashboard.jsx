import { useParts } from '../hooks/useParts'
import { useRobotModels } from '../hooks/useRobotModels'
import ReorderAlerts from '../components/ReorderAlerts'

function StatCard({ label, value, sub, color }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function Dashboard() {
  const { parts, lowStockParts, loading: partsLoading } = useParts()
  const { models, loading: modelsLoading } = useRobotModels()

  const outOfStock = parts.filter(p => p.stock_level === 0).length

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">AregAI MRP — Robot Production Planning</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Robot Models" value={models.length} sub="active models" color="text-sky-600" />
        <StatCard label="Total Parts" value={parts.length} sub="tracked parts" color="text-gray-900" />
        <StatCard
          label="Low Stock Alerts"
          value={lowStockParts.length}
          sub="at or below threshold"
          color={lowStockParts.length > 0 ? 'text-orange-600' : 'text-green-600'}
        />
        <StatCard
          label="Out of Stock"
          value={outOfStock}
          sub="zero inventory"
          color={outOfStock > 0 ? 'text-red-600' : 'text-green-600'}
        />
      </div>

      {/* Reorder alerts */}
      {!partsLoading && <ReorderAlerts parts={lowStockParts} />}
    </div>
  )
}
