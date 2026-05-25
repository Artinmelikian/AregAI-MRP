import { useState } from 'react'
import { useRobotModels } from '../hooks/useRobotModels'
import { useParts } from '../hooks/useParts'
import BOMEditor from '../components/BOMEditor'

export default function Models() {
  const { models, loading, addModel, deleteModel } = useRobotModels()
  const { parts } = useParts()
  const [selectedId, setSelectedId] = useState(null)
  const [adding, setAdding] = useState(false)
  const [newModel, setNewModel] = useState({ name: '', description: '' })
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const selectedModel = models.find(m => m.id === selectedId) ?? null

  const handleAdd = async () => {
    if (!newModel.name.trim()) return
    const created = await addModel(newModel)
    if (created) {
      setAdding(false)
      setNewModel({ name: '', description: '' })
      setSelectedId(created.id)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Robot Models</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage models and their Bills of Materials.</p>
      </div>

      <div className="flex gap-6">
        {/* Model list */}
        <div className="w-56 flex-shrink-0 space-y-2">
          {loading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : (
            models.map(model => (
              <div
                key={model.id}
                className={`relative group rounded-lg border px-4 py-3 cursor-pointer transition-colors ${
                  selectedId === model.id
                    ? 'bg-sky-600 border-sky-600 text-white'
                    : 'bg-white border-gray-200 hover:border-sky-300'
                }`}
                onClick={() => setSelectedId(model.id)}
              >
                <p className="font-semibold text-sm">{model.name}</p>
                {model.description && (
                  <p className={`text-xs mt-0.5 truncate ${selectedId === model.id ? 'text-sky-200' : 'text-gray-400'}`}>
                    {model.description}
                  </p>
                )}
                {deleteConfirm === model.id ? (
                  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-white rounded-lg border border-red-300 z-10">
                    <button
                      onClick={e => { e.stopPropagation(); deleteModel(model.id); if (selectedId === model.id) setSelectedId(null); setDeleteConfirm(null) }}
                      className="text-red-600 text-xs font-medium hover:text-red-800"
                    >Confirm</button>
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteConfirm(null) }}
                      className="text-gray-400 text-xs"
                    >Cancel</button>
                  </div>
                ) : (
                  <button
                    onClick={e => { e.stopPropagation(); setDeleteConfirm(model.id) }}
                    className={`absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-xs ${
                      selectedId === model.id ? 'text-sky-200 hover:text-white' : 'text-gray-300 hover:text-red-500'
                    }`}
                  >✕</button>
                )}
              </div>
            ))
          )}

          {adding ? (
            <div className="bg-sky-50 rounded-lg border border-sky-300 p-3 space-y-2">
              <input
                autoFocus
                type="text"
                value={newModel.name}
                onChange={e => setNewModel(p => ({ ...p, name: e.target.value }))}
                placeholder="Model name"
                className="w-full border border-sky-300 rounded px-2 py-1 text-sm outline-none"
              />
              <input
                type="text"
                value={newModel.description}
                onChange={e => setNewModel(p => ({ ...p, description: e.target.value }))}
                placeholder="Description (optional)"
                className="w-full border border-sky-300 rounded px-2 py-1 text-sm outline-none"
              />
              <div className="flex gap-2">
                <button onClick={handleAdd} className="flex-1 py-1 bg-sky-600 text-white text-xs font-medium rounded hover:bg-sky-700">Save</button>
                <button onClick={() => setAdding(false)} className="flex-1 py-1 border border-gray-300 text-gray-500 text-xs rounded hover:bg-gray-50">Cancel</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-400 hover:border-sky-400 hover:text-sky-600 transition-colors"
            >
              + Add Model
            </button>
          )}
        </div>

        {/* BOM editor */}
        <div className="flex-1">
          <BOMEditor model={selectedModel} allParts={parts} />
        </div>
      </div>
    </div>
  )
}
