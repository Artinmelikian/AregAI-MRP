import { useContext } from 'react'
import { RoleContext } from '../App'
import { useParts } from '../hooks/useParts'
import PartsTable from '../components/PartsTable'
import BulkImportPanel from '../components/BulkImportPanel'

export default function Parts() {
  const { isViewer } = useContext(RoleContext)
  const { parts, loading, addPart, updatePart, deletePart } = useParts()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Parts & Inventory</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {isViewer ? 'View-only access.' : 'Click any cell to edit inline. Changes are saved immediately.'}
        </p>
      </div>
      {!isViewer && <BulkImportPanel parts={parts} onAdd={addPart} onUpdate={updatePart} />}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">Loading parts…</div>
      ) : (
        <PartsTable
          parts={parts}
          onUpdate={updatePart}
          onDelete={deletePart}
          onAdd={addPart}
          readOnly={isViewer}
        />
      )}
    </div>
  )
}
