import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export function useLogistics() {
  const [shipments, setShipments] = useState([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('logistics')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) toast.error('Failed to load logistics')
    else setShipments(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const addShipment = async (record) => {
    const { data, error } = await supabase
      .from('logistics')
      .insert(record)
      .select('*')
      .single()
    if (error) { toast.error(error.message); return false }
    setShipments(prev => [data, ...prev])
    toast.success('Shipment added')
    return true
  }

  const updateShipment = async (id, updates) => {
    const payload = { ...updates, updated_at: new Date().toISOString() }
    const { error } = await supabase.from('logistics').update(payload).eq('id', id)
    if (error) { toast.error(error.message); return false }
    setShipments(prev => prev.map(s => s.id === id ? { ...s, ...payload } : s))
    return true
  }

  const deleteShipment = async (id) => {
    const { error } = await supabase.from('logistics').delete().eq('id', id)
    if (error) { toast.error(error.message); return false }
    setShipments(prev => prev.filter(s => s.id !== id))
    toast.success('Shipment removed')
    return true
  }

  return { shipments, loading, addShipment, updateShipment, deleteShipment }
}
