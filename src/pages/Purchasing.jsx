import { useContext } from 'react'
import { RoleContext } from '../App'
import { useParts } from '../hooks/useParts'
import PurchasingTracker from '../components/PurchasingTracker'

export default function Purchasing() {
  const { isViewer } = useContext(RoleContext)
  const { parts, loading, updatePart } = useParts()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Purchasing Tracker</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Track procurement status for every part — whether needed for a production run or restocked for inventory.
        </p>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">Loading parts…</div>
      ) : (
        <PurchasingTracker parts={parts} onUpdate={updatePart} readOnly={isViewer} />
      )}
    </div>
  )
}
