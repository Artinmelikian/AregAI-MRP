import { useLogistics } from '../hooks/useLogistics'
import LogisticsTracker from '../components/LogisticsTracker'

export default function Logistics() {
  const { shipments, loading, addShipment, updateShipment, deleteShipment } = useLogistics()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Logistics Tracker</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Track purchased goods — supplier, shipment status, costs, customs, and delivery.
        </p>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">Loading shipments…</div>
      ) : (
        <LogisticsTracker
          shipments={shipments}
          onAdd={addShipment}
          onUpdate={updateShipment}
          onDelete={deleteShipment}
        />
      )}
    </div>
  )
}
