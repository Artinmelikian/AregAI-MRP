import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export function useRobotModels() {
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('robot_models')
      .select('*')
      .order('name')
    if (error) toast.error('Failed to load robot models')
    else setModels(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const addModel = async ({ name, description }) => {
    const { data, error } = await supabase
      .from('robot_models')
      .insert({ name, description })
      .select()
      .single()
    if (error) { toast.error(error.message); return null }
    setModels(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    toast.success(`${name} added`)
    return data
  }

  const updateModel = async (id, updates) => {
    const { error } = await supabase
      .from('robot_models')
      .update(updates)
      .eq('id', id)
    if (error) { toast.error(error.message); return false }
    setModels(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m))
    return true
  }

  const deleteModel = async (id) => {
    const { error } = await supabase.from('robot_models').delete().eq('id', id)
    if (error) { toast.error(error.message); return false }
    setModels(prev => prev.filter(m => m.id !== id))
    toast.success('Model deleted')
    return true
  }

  return { models, loading, addModel, updateModel, deleteModel, refresh: fetch }
}
