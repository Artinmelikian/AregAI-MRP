import { useRobotModels } from '../hooks/useRobotModels'
import { useProduction } from '../hooks/useProduction'
import PlannerForm from '../components/PlannerForm'
import PlannerResults from '../components/PlannerResults'

export default function Planner() {
  const { models, loading } = useRobotModels()
  const { results, calculating, calculate, reset } = useProduction()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Production Planner</h1>
        <p className="text-sm text-gray-500 mt-0.5">Enter a mixed batch to check feasibility and identify shortages.</p>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">Loading models…</div>
      ) : results ? (
        <PlannerResults results={results} onReset={reset} />
      ) : (
        <PlannerForm models={models} onCalculate={calculate} calculating={calculating} />
      )}
    </div>
  )
}
