import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Upload, FileText, Download, CheckCircle2, AlertTriangle,
  Loader2, X, RotateCcw,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../utils/supabase'
import GymOwnerNav from '../components/GymOwnerNav'

const API_BASE = import.meta.env.VITE_API_URL

const SAMPLE_CSV =
  'full_name,phone,membership_type,monthly_fee,start_date,end_date,notes\n' +
  'Rohan Sharma,9876543210,monthly,1500,2026-05-01,2026-06-01,Walk-in signup\n' +
  'Priya Mehta,9123456780,quarterly,4000,2026-05-01,2026-08-01,Annual referral\n'

function downloadSampleCsv() {
  const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'gym-members-sample.csv'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function GymImport() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [gym, setGym] = useState(null)
  const [gymError, setGymError] = useState('')
  const [file, setFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [result, setResult] = useState(null) // { imported, skipped, errors }
  const fileInputRef = useRef(null)

  // Fetch the owner's gym to get its id
  useEffect(() => {
    let cancelled = false
    async function loadGym() {
      if (!user) return
      try {
        const { data, error } = await supabase
          .from('gyms')
          .select('id, name')
          .eq('owner_id', user.id)
          .maybeSingle()
        if (cancelled) return
        if (error) throw error
        if (!data) {
          setGymError('No gym found for this owner.')
          return
        }
        setGym(data)
      } catch (err) {
        if (!cancelled) setGymError(err.message || 'Failed to load gym.')
      }
    }
    loadGym()
    return () => { cancelled = true }
  }, [user])

  function pickFile(f) {
    if (!f) return
    if (!f.name.toLowerCase().endsWith('.csv')) {
      setUploadError('Please select a .csv file.')
      return
    }
    setUploadError('')
    setFile(f)
  }

  function onDragOver(e) {
    e.preventDefault()
    setDragOver(true)
  }
  function onDragLeave(e) {
    e.preventDefault()
    setDragOver(false)
  }
  function onDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    pickFile(f)
  }

  function onChooseFile(e) {
    pickFile(e.target.files?.[0])
  }

  function clearFile() {
    setFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function reset() {
    setFile(null)
    setResult(null)
    setUploadError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleUpload() {
    if (!file || !gym?.id) return
    setUploading(true)
    setUploadError('')
    try {
      const fd = new FormData()
      fd.append('gym_id', gym.id)
      fd.append('file', file)

      const res = await fetch(`${API_BASE}/api/gym-members/csv-import`, {
        method: 'POST',
        body: fd,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || `Import failed (${res.status})`)
      setResult({
        imported: data.imported ?? 0,
        skipped: data.skipped ?? 0,
        errors: Array.isArray(data.errors) ? data.errors : [],
      })
    } catch (err) {
      setUploadError(err.message || 'Failed to upload CSV.')
    } finally {
      setUploading(false)
    }
  }

  const showResults = !!result

  return (
    <div className="min-h-screen bg-[#0c0c0e] pb-24 overflow-x-hidden">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-emerald-500/[0.07] blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-3xl mx-auto px-5 py-10 sm:py-12">
        <button
          onClick={() => navigate('/gym/members')}
          className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-white text-sm mb-6 transition-colors"
        >
          <ArrowLeft size={14} /> Back to members
        </button>

        <header className="mb-7">
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Import Members</h1>
          <p className="text-zinc-500 text-sm mt-1">
            Bulk-add members to {gym?.name || 'your gym'} from a CSV file.
          </p>
        </header>

        {gymError && (
          <div className="mb-5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {gymError}
          </div>
        )}

        {!showResults && (
          <>
            {/* Sample CSV card */}
            <section className="bg-[#141416] border border-white/[0.06] rounded-2xl p-5 mb-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center flex-shrink-0">
                <FileText size={18} className="text-sky-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">Need a template?</p>
                <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                  Download our sample CSV with the expected columns:
                  full_name, phone, membership_type, monthly_fee, start_date, end_date, notes.
                </p>
              </div>
              <button
                onClick={downloadSampleCsv}
                className="inline-flex items-center gap-1.5 bg-white/[0.06] hover:bg-white/[0.12] text-white text-xs font-medium px-3.5 py-2 rounded-lg transition-colors flex-shrink-0"
              >
                <Download size={12} />
                Download Sample CSV
              </button>
            </section>

            {/* Drop zone */}
            <section
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              className={`rounded-2xl border-2 border-dashed p-8 sm:p-12 text-center transition-all ${
                dragOver
                  ? 'border-emerald-500/60 bg-emerald-500/[0.04]'
                  : 'border-white/[0.08] bg-[#141416]'
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <Upload size={24} className="text-emerald-400" />
              </div>
              <p className="text-sm font-semibold text-white mb-1.5">
                Drag & drop your CSV here
              </p>
              <p className="text-xs text-zinc-500 mb-5">or pick a file from your computer</p>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={onChooseFile}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 bg-white/[0.06] hover:bg-white/[0.12] text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
              >
                Choose CSV file
              </button>
            </section>

            {/* Selected file + upload */}
            {file && (
              <section className="bg-[#141416] border border-white/[0.06] rounded-2xl p-4 mt-5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                  <FileText size={16} className="text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{file.name}</p>
                  <p className="text-xs text-zinc-500 tabular-nums">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  onClick={clearFile}
                  disabled={uploading}
                  className="w-8 h-8 rounded-lg hover:bg-white/[0.06] text-zinc-500 hover:text-white flex items-center justify-center transition-colors disabled:opacity-40"
                  aria-label="Remove file"
                >
                  <X size={14} />
                </button>
              </section>
            )}

            {uploadError && (
              <div className="mt-5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {uploadError}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleUpload}
                disabled={!file || !gym?.id || uploading}
                className="inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/20 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                {uploading
                  ? <><Loader2 size={14} className="animate-spin" /> Importing…</>
                  : <><Upload size={14} /> Import Members</>}
              </button>
            </div>
          </>
        )}

        {showResults && (
          <section className="space-y-4">
            <div className="bg-[#141416] border border-white/[0.06] rounded-2xl p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-500/[0.06] border border-emerald-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 size={14} className="text-emerald-400" />
                    <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-widest">
                      Imported
                    </p>
                  </div>
                  <p className="text-3xl font-bold text-white tabular-nums">{result.imported}</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {result.imported === 1 ? 'member' : 'members'} added
                  </p>
                </div>
                <div className="bg-amber-500/[0.06] border border-amber-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle size={14} className="text-amber-400" />
                    <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-widest">
                      Skipped
                    </p>
                  </div>
                  <p className="text-3xl font-bold text-white tabular-nums">{result.skipped}</p>
                  <p className="text-xs text-zinc-500 mt-1">missing name or phone</p>
                </div>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="bg-[#141416] border border-red-500/20 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={14} className="text-red-400" />
                  <h2 className="text-sm font-semibold text-white">
                    {result.errors.length} {result.errors.length === 1 ? 'error' : 'errors'}
                  </h2>
                </div>
                <ul className="divide-y divide-white/[0.04] -mx-2">
                  {result.errors.map((e, i) => (
                    <li key={i} className="px-2 py-2.5 flex items-start gap-3 text-sm">
                      <span className="text-zinc-500 tabular-nums w-14 flex-shrink-0">
                        Row {e.row}
                      </span>
                      <span className="text-red-300 flex-1 break-words">{e.reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => navigate('/gym/members')}
                className="inline-flex items-center gap-1.5 text-zinc-300 hover:text-white text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-white/[0.04] transition-colors"
              >
                Back to members
              </button>
              <button
                onClick={reset}
                className="inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
              >
                <RotateCcw size={14} />
                Import More
              </button>
            </div>
          </section>
        )}
      </div>

      <GymOwnerNav />
    </div>
  )
}
