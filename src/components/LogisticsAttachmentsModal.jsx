import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const BUCKET = 'logistics-files'

function formatBytes(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(ts) {
  return new Date(ts).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function fileIcon(mime) {
  if (!mime) return '📄'
  if (mime.startsWith('image/')) return '🖼️'
  if (mime === 'application/pdf') return '📕'
  if (mime.includes('spreadsheet') || mime.includes('excel')) return '📊'
  if (mime.includes('word') || mime.includes('document')) return '📝'
  return '📄'
}

export default function LogisticsAttachmentsModal({ shipment, onClose, onCountChange }) {
  const [attachments, setAttachments] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const fileInputRef = useRef(null)

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('logistics_attachments')
      .select('*')
      .eq('logistics_id', shipment.id)
      .order('created_at', { ascending: false })
    if (error) toast.error('Failed to load attachments')
    else {
      setAttachments(data ?? [])
      onCountChange?.(shipment.id, (data ?? []).length)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [shipment.id])

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setUploading(true)

    const { data: sessionData } = await supabase.auth.getSession()
    const email = sessionData?.session?.user?.email

    for (const file of files) {
      const ext = file.name.includes('.') ? file.name.split('.').pop() : ''
      const uniqueName = `${crypto.randomUUID()}${ext ? '.' + ext : ''}`
      const path = `${shipment.id}/${uniqueName}`

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file)

      if (uploadError) {
        toast.error(`Failed to upload ${file.name}`)
        continue
      }

      const { error: dbError } = await supabase
        .from('logistics_attachments')
        .insert({
          logistics_id: shipment.id,
          file_name: file.name,
          file_path: path,
          file_size: file.size,
          mime_type: file.type || null,
          uploaded_by: email,
        })

      if (dbError) {
        toast.error(`Failed to record ${file.name}`)
        await supabase.storage.from(BUCKET).remove([path])
      }
    }

    toast.success(`${files.length === 1 ? '1 file' : `${files.length} files`} uploaded`)
    setUploading(false)
    e.target.value = ''
    load()
  }

  const handleOpen = async (attachment) => {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(attachment.file_path, 3600)
    if (error || !data?.signedUrl) {
      toast.error('Could not open file')
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  const handleDelete = async (attachment) => {
    const { error: storageErr } = await supabase.storage
      .from(BUCKET)
      .remove([attachment.file_path])
    if (storageErr) toast.error('Failed to delete file from storage')

    const { error: dbErr } = await supabase
      .from('logistics_attachments')
      .delete()
      .eq('id', attachment.id)
    if (dbErr) toast.error('Failed to delete attachment record')
    else {
      setDeleteConfirm(null)
      load()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Attachments</h2>
            <p className="text-sm text-gray-500 mt-0.5 truncate max-w-xs">{shipment.product_name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none mt-0.5">✕</button>
        </div>

        {/* Upload area */}
        <div className="px-6 py-4 border-b border-gray-100">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full border-2 border-dashed border-gray-200 rounded-xl py-5 text-sm text-gray-400 hover:border-sky-400 hover:text-sky-600 hover:bg-sky-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading
              ? <span className="flex items-center justify-center gap-2"><span className="animate-spin">⏳</span> Uploading…</span>
              : <span>📎 Click to attach files <span className="text-gray-300">— invoices, images, PDFs, docs</span></span>
            }
          </button>
        </div>

        {/* File list */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {loading ? (
            <p className="text-center text-gray-400 py-8">Loading…</p>
          ) : attachments.length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm">No attachments yet.</p>
          ) : (
            <div className="space-y-2">
              {attachments.map(a => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-sky-200 hover:bg-sky-50 transition-colors group"
                >
                  <span className="text-2xl shrink-0 select-none">{fileIcon(a.mime_type)}</span>
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => handleOpen(a)}
                      className="font-medium text-sky-700 hover:underline text-sm truncate block text-left w-full"
                      title={a.file_name}
                    >
                      {a.file_name}
                    </button>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatBytes(a.file_size)}
                      {a.uploaded_by ? ` · ${a.uploaded_by}` : ''}
                      {' · '}{formatDate(a.created_at)}
                    </p>
                  </div>
                  {deleteConfirm === a.id ? (
                    <span className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleDelete(a)}
                        className="text-xs text-red-600 hover:text-red-800 font-medium"
                      >Delete</button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="text-xs text-gray-400 hover:text-gray-600"
                      >Cancel</button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(a.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all shrink-0 text-lg leading-none"
                      title="Delete attachment"
                    >✕</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
