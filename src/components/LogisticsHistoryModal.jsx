import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const FIELD_LABELS = {
  product_name:                 'Product Name',
  status:                       'Status',
  eta:                          'ETA',
  quantity:                     'Quantity',
  supplier:                     'Supplier',
  unit_price:                   'Unit Price',
  invoice_number:               'Invoice Number',
  invoice_amount:               'Invoice Amount',
  currency:                     'Currency',
  order_date:                   'Order Date',
  responsible_person:           'Responsible Person',
  department:                   'Department',
  lead_time_days:               'Lead Time (days)',
  payment_method:               'Payment Method',
  invoice_status:               'Invoice Status',
  invoice_status_date:          'Invoice Status Date',
  source_of_procurement:        'Source of Procurement',
  delivery_term:                'Delivery Term',
  actual_arrival_date:          'Actual Arrival',
  transportation_cost:          'Transportation Cost',
  transportation_payment:       'Transportation Payment',
  custom_clearance_cost:        'Custom Clearance Cost',
  custom_clearance_status:      'Custom Clearance Status',
  expertise_service_fee:        'Expertise Service Fee',
  expertise_fee_payment_status: 'Expertise Fee Payment Status',
}

function formatDate(ts) {
  const d = new Date(ts)
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

export default function LogisticsHistoryModal({ shipment, onClose }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('logistics_history')
        .select('*')
        .eq('logistics_id', shipment.id)
        .order('changed_at', { ascending: false })
      setHistory(data ?? [])
      setLoading(false)
    }
    load()
  }, [shipment.id])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Change History</h2>
            <p className="text-sm text-gray-500 mt-0.5">{shipment.product_name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none mt-0.5">✕</button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {loading ? (
            <p className="text-center text-gray-400 py-8">Loading history…</p>
          ) : history.length === 0 ? (
            <p className="text-center text-gray-400 py-8">No changes recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {history.map(entry => (
                <div key={entry.id} className="flex gap-4 text-sm">
                  {/* Timeline dot */}
                  <div className="flex flex-col items-center pt-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-sky-400 shrink-0" />
                    <div className="w-px flex-1 bg-gray-200 mt-1" />
                  </div>
                  {/* Content */}
                  <div className="pb-4 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-800">
                        {FIELD_LABELS[entry.field_name] ?? entry.field_name}
                      </span>
                      <span className="text-xs text-gray-400">{formatDate(entry.changed_at)}</span>
                      {entry.changed_by && (
                        <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">{entry.changed_by}</span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-2 flex-wrap text-xs">
                      <span className="bg-red-50 text-red-700 rounded px-2 py-0.5 line-through">
                        {entry.old_value ?? '(empty)'}
                      </span>
                      <span className="text-gray-400">→</span>
                      <span className="bg-green-50 text-green-700 rounded px-2 py-0.5">
                        {entry.new_value ?? '(empty)'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 text-right">
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
