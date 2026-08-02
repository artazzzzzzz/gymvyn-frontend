import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import Papa from 'papaparse'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../utils/supabase'
import { importGymMembers } from '../utils/api'
import GymOwnerNav from '../components/GymOwnerNav'
import NoAccessState from '../components/staff/NoAccessState'
import { AppLoader, ButtonSpinner, InlineLoader, TableSkeleton } from '../components/loading/Loading'
import {
  TARGET_FIELDS,
  FIELD_LABELS,
  MAX_IMPORT_ROWS,
  autoMapColumns,
  hasConflictingMappings,
  validateImportRows,
  buildImportPayload,
  statusGroup,
  statusTone,
  resultLabel,
  toCsv,
  buildAttentionReportRows,
  templateCsv,
} from '../utils/memberImportCsv'

const RESULT_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'successful', label: 'Successful' },
  { key: 'conflicts', label: 'Conflicts' },
  { key: 'invalid', label: 'Invalid' },
  { key: 'skipped', label: 'Skipped' },
]

function Icon({ name, size = 18, color = 'var(--text-secondary)' }) {
  const common = { width: size, height: size, fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', viewBox: '0 0 24 24' }
  if (name === 'download') return <svg {...common}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
  if (name === 'upload') return <svg {...common}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
  if (name === 'file') return <svg {...common}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="14" y2="17" /></svg>
  if (name === 'back') return <svg {...common}><polyline points="15 18 9 12 15 6" /></svg>
  if (name === 'check') return <svg {...common}><polyline points="20 6 9 17 4 12" /></svg>
  if (name === 'alert') return <svg {...common}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
  if (name === 'search') return <svg {...common}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
  if (name === 'close') return <svg {...common}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
  return <svg {...common}><circle cx="12" cy="12" r="10" /></svg>
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function Card({ children, style }) {
  return <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, ...style }}>{children}</section>
}

function Pill({ tone = 'neutral', children }) {
  const styles = {
    success: { background: 'var(--success-bg)', color: 'var(--success)' },
    warning: { background: 'var(--warning-bg)', color: 'var(--warning)' },
    error: { background: 'var(--error-bg)', color: 'var(--error)' },
    neutral: { background: 'var(--bg-pill)', color: 'var(--text-secondary)' },
  }
  return <span style={{ ...styles[tone], borderRadius: 20, padding: '5px 9px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{children}</span>
}

function Button({ children, onClick, disabled, variant = 'primary', type = 'button', style }) {
  const base = {
    height: 42,
    borderRadius: 10,
    border: '1px solid var(--border)',
    padding: '0 14px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    fontSize: 14,
    fontWeight: 700,
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.55 : 1,
    background: variant === 'primary' ? 'var(--text-primary)' : 'var(--bg-card)',
    color: variant === 'primary' ? 'var(--bg-card)' : 'var(--text-primary)',
  }
  return <button type={type} onClick={onClick} disabled={disabled} style={{ ...base, ...style }}>{children}</button>
}

function Metric({ label, value, tone = 'neutral' }) {
  return (
    <div style={{ border: '1px solid var(--border)', background: 'var(--bg-elevated)', borderRadius: 10, padding: 12 }}>
      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 24, color: tone === 'error' ? 'var(--error)' : tone === 'warning' ? 'var(--warning)' : tone === 'success' ? 'var(--success)' : 'var(--text-primary)', fontWeight: 800, marginTop: 4 }}>{value}</div>
    </div>
  )
}

function parseCsvFile(file, onComplete, onError) {
  Papa.parse(file, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: header => String(header || '').replace(/^\uFEFF/, '').trim(),
    complete: result => {
      if (result.errors?.length) {
        onError(result.errors[0]?.message || 'Could not parse this CSV file.')
        return
      }
      const rows = (result.data || []).filter(row => Object.values(row).some(value => String(value ?? '').trim()))
      onComplete({ rows, columns: result.meta?.fields || [] })
    },
    error: error => onError(error.message || 'Could not parse this CSV file.'),
  })
}

export default function GymImport() {
  const { user, role } = useAuth()
  const staffContext = useOutletContext() || {}
  const navigate = useNavigate()
  const isStaff = role === 'staff'

  const [gym, setGym] = useState(null)
  const [gymError, setGymError] = useState('')
  const [file, setFile] = useState(null)
  const [columns, setColumns] = useState([])
  const [rawRows, setRawRows] = useState([])
  const [mapping, setMapping] = useState({})
  const [parseError, setParseError] = useState('')
  const [parsing, setParsing] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [result, setResult] = useState(null)
  const [resultFilter, setResultFilter] = useState('all')
  const [resultSearch, setResultSearch] = useState('')
  const fileInputRef = useRef(null)

  const loadGym = useCallback(async () => {
    if (!user) return
    setGymError('')
    setGym(null)
    try {
      if (isStaff) {
        if (staffContext.loading) return
        if (!staffContext.permissions?.manage_members) {
          setGymError('You need member management permission to import members.')
          return
        }
        if (!staffContext.gymId) {
          setGymError('No active gym found for this staff account.')
          return
        }
        setGym({ id: staffContext.gymId, name: staffContext.gymName || 'your gym' })
        return
      }
      const { data, error } = await supabase
        .from('gyms')
        .select('id, name')
        .eq('owner_id', user.id)
        .eq('is_active', true)
        .maybeSingle()
      if (error) throw error
      if (!data) setGymError('No active gym found for this owner.')
      else setGym(data)
    } catch (err) {
      setGymError(err.message || 'Failed to load gym.')
    }
  }, [user, isStaff, staffContext.gymId, staffContext.gymName, staffContext.loading, staffContext.permissions?.manage_members])

  useEffect(() => {
    loadGym()
  }, [loadGym])

  const mappingConflicts = useMemo(() => hasConflictingMappings(mapping), [mapping])
  const validatedRows = useMemo(() => validateImportRows(rawRows, mapping), [rawRows, mapping])
  const validRows = validatedRows.filter(row => row.valid)
  const invalidRows = validatedRows.filter(row => !row.valid)
  const duplicateRows = validatedRows.filter(row => row.duplicate)
  const payload = useMemo(() => buildImportPayload(validatedRows), [validatedRows])

  const canSubmit = gym?.id && payload.length > 0 && mappingConflicts.length === 0 && confirmed && !submitting

  const resultRows = useMemo(() => {
    if (!result) return []
    const sentRows = validRows
    return (result.results || []).map((rowResult, index) => {
      const source = sentRows[(rowResult.row || index + 1) - 1]
      const originalRow = source?.rowNumber || rowResult.row
      return {
        ...rowResult,
        originalRow,
        member: source?.mapped?.full_name || '',
        phone: source?.mapped?.phone || '',
        email: source?.mapped?.email || '',
      }
    })
  }, [result, validRows])

  const filteredResults = resultRows.filter(row => {
    const group = statusGroup(row.status)
    const matchesFilter = resultFilter === 'all' || resultFilter === group
    const q = resultSearch.trim().toLowerCase()
    const matchesSearch = !q || [row.member, row.phone, row.email, row.message, row.status].some(value => String(value || '').toLowerCase().includes(q))
    return matchesFilter && matchesSearch
  })

  function resetImport() {
    setFile(null)
    setColumns([])
    setRawRows([])
    setMapping({})
    setParseError('')
    setConfirmed(false)
    setSubmitError('')
    setResult(null)
    setResultFilter('all')
    setResultSearch('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function chooseFile(nextFile) {
    if (!nextFile) return
    if (!nextFile.name.toLowerCase().endsWith('.csv') && nextFile.type !== 'text/csv') {
      setParseError('Choose a CSV file.')
      return
    }
    setParseError('')
    setSubmitError('')
    setResult(null)
    setConfirmed(false)
    setFile(nextFile)
    setParsing(true)
    parseCsvFile(nextFile, ({ rows, columns: detectedColumns }) => {
      setParsing(false)
      if (rows.length > MAX_IMPORT_ROWS) {
        setParseError(`This file has ${rows.length} rows. Please import ${MAX_IMPORT_ROWS} rows or fewer at a time.`)
        setRawRows([])
        setColumns([])
        setMapping({})
        return
      }
      setColumns(detectedColumns)
      setRawRows(rows)
      setMapping(autoMapColumns(detectedColumns))
    }, error => {
      setParsing(false)
      setParseError(error)
    })
  }

  function updateMapping(column, target) {
    setConfirmed(false)
    setMapping(current => {
      if (target === 'ignore') return { ...current, [column]: target }
      const next = { ...current }
      for (const key of Object.keys(next)) {
        if (key !== column && next[key] === target) next[key] = 'ignore'
      }
      next[column] = target
      return next
    })
  }

  async function submitImport() {
    if (!canSubmit) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const data = await importGymMembers(gym.id, payload)
      setResult(data)
      setConfirmed(false)
    } catch (err) {
      setSubmitError(err.message || 'Import failed. Your parsed data is still here.')
    } finally {
      setSubmitting(false)
    }
  }

  function downloadTemplate() {
    downloadText('gymvyn-member-import-template.csv', templateCsv())
  }

  function downloadAttentionReport() {
    const backendAttention = buildAttentionReportRows(resultRows.map(row => ({ ...row, row: row.originalRow })), validatedRows)
    const localInvalid = invalidRows.map(row => ({
      row: row.rowNumber,
      full_name: row.mapped.full_name || '',
      phone: row.mapped.phone || '',
      email: row.mapped.email || '',
      membership_plan: row.mapped.membership_plan || '',
      gym_member_code: row.mapped.gym_member_code || '',
      status: 'local_validation_error',
      message: row.errors.join('; '),
    }))
    const rows = result ? [...backendAttention, ...localInvalid] : localInvalid
    downloadText('gymvyn-member-import-attention-report.csv', toCsv(rows, ['row', 'full_name', 'phone', 'email', 'membership_plan', 'gym_member_code', 'status', 'message']))
  }

  function retryAttentionRows() {
    const failedOriginalRows = new Set(resultRows.filter(row => statusGroup(row.status) !== 'successful').map(row => row.originalRow))
    const rowsToRetry = validatedRows.filter(row => row.valid && failedOriginalRows.has(row.rowNumber)).map(row => row.source)
    setRawRows(rowsToRetry)
    setResult(null)
    setSubmitError('')
    setConfirmed(false)
  }

  if (isStaff && !staffContext.loading && !staffContext.permissions?.manage_members) {
    return <NoAccessState message="Member Import Access Required" subtitle="Ask the gym owner to grant member management permission." />
  }
  if (isStaff && staffContext.loading) return <AppLoader label="Checking import access" />

  const backPath = isStaff ? '/staff/members' : '/gym/members'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: isStaff ? 88 : 96 }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '18px 16px 28px' }}>
        <button onClick={() => navigate(backPath)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 14, cursor: 'pointer', padding: '6px 0', marginBottom: 10 }}>
          <Icon name="back" size={16} /> Back to members
        </button>

        <header style={{ display: 'flex', gap: 12, justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 26, lineHeight: 1.15, margin: 0, color: 'var(--text-primary)', fontWeight: 800 }}>Import Members</h1>
            <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: 14 }}>
              Bulk import members into {gym?.name || 'your gym'} using the verified Gymvyn import flow.
            </p>
          </div>
          <Button variant="secondary" onClick={downloadTemplate}>
            <Icon name="download" size={16} /> Template
          </Button>
        </header>

        {gymError && (
          <Card style={{ borderColor: 'var(--error)', color: 'var(--error)', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <span>{gymError}</span>
              <Button variant="secondary" onClick={loadGym}>Try again</Button>
            </div>
          </Card>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 14 }}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name="file" color="var(--text-cta)" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 16 }}>CSV template</h2>
                <p style={{ margin: '5px 0 12px', color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.45 }}>
                  Supported fields: full_name, phone, email, gender, date_of_birth, membership_start_date, membership_expiry_date, membership_plan, fee, payment_status, gym_member_code, assigned_trainer_id, notes, tags.
                </p>
                <Button variant="secondary" onClick={downloadTemplate}>
                  <Icon name="download" size={15} /> Download CSV template
                </Button>
              </div>
            </div>
          </Card>

          <Card>
            <h2 style={{ margin: '0 0 10px', color: 'var(--text-primary)', fontSize: 16 }}>Upload CSV</h2>
            <div
              onDragOver={event => { event.preventDefault() }}
              onDrop={event => { event.preventDefault(); chooseFile(event.dataTransfer.files?.[0]) }}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed var(--border)',
                borderRadius: 12,
                padding: 24,
                textAlign: 'center',
                cursor: 'pointer',
                background: 'var(--bg-elevated)',
              }}
            >
              <Icon name="upload" size={28} color="var(--text-cta)" />
              <p style={{ margin: '10px 0 4px', color: 'var(--text-primary)', fontWeight: 700 }}>{file ? file.name : 'Choose or drop a CSV file'}</p>
              <p style={{ margin: 0, color: 'var(--text-tertiary)', fontSize: 13 }}>CSV only, up to {MAX_IMPORT_ROWS} rows per import.</p>
              <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={event => chooseFile(event.target.files?.[0])} style={{ display: 'none' }} />
            </div>
            <div style={{ marginTop: 10 }}>
              <InlineLoader label="Parsing CSV" visible={parsing} />
            </div>
            {parseError && <p style={{ color: 'var(--error)', fontSize: 13, margin: '10px 0 0' }}>{parseError}</p>}
          </Card>

          {parsing && rawRows.length === 0 && (
            <Card>
              <TableSkeleton rows={5} columns={5} />
            </Card>
          )}

          {columns.length > 0 && (
            <Card>
              <h2 style={{ margin: '0 0 10px', color: 'var(--text-primary)', fontSize: 16 }}>Column mapping</h2>
              <p style={{ margin: '0 0 12px', color: 'var(--text-secondary)', fontSize: 13 }}>Review every detected column. Two CSV columns cannot map to the same Gymvyn field.</p>
              <div style={{ display: 'grid', gap: 8 }}>
                {columns.map(column => (
                  <div key={column} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, alignItems: 'center' }}>
                    <div style={{ minWidth: 0, color: 'var(--text-primary)', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{column}</div>
                    <select value={mapping[column] || 'ignore'} onChange={event => updateMapping(column, event.target.value)} style={{ height: 38, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', borderRadius: 8, padding: '0 10px' }}>
                      {TARGET_FIELDS.map(field => <option key={field.key} value={field.key}>{field.label}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              {mappingConflicts.length > 0 && <p style={{ margin: '10px 0 0', color: 'var(--error)', fontSize: 13 }}>Fix duplicate mappings before importing.</p>}
            </Card>
          )}

          {rawRows.length > 0 && (
            <Card>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(128px, 1fr))', gap: 10, marginBottom: 14 }}>
                <Metric label="Parsed rows" value={validatedRows.length} />
                <Metric label="Valid" value={validRows.length} tone="success" />
                <Metric label="Invalid" value={invalidRows.length} tone={invalidRows.length ? 'error' : 'neutral'} />
                <Metric label="Duplicates" value={duplicateRows.length} tone={duplicateRows.length ? 'warning' : 'neutral'} />
              </div>

              <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 10 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-elevated)' }}>
                      {['Row', 'Name', 'Phone', 'Email', 'Plan', 'Local status'].map(head => <th key={head} style={thStyle}>{head}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {validatedRows.slice(0, 12).map(row => (
                      <tr key={row.rowNumber} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={tdStyle}>{row.rowNumber}</td>
                        <td style={tdStyle}>{row.mapped.full_name || '—'}</td>
                        <td style={tdStyle}>{row.mapped.phone || '—'}</td>
                        <td style={tdStyle}>{row.mapped.email || '—'}</td>
                        <td style={tdStyle}>{row.mapped.membership_plan || '—'}</td>
                        <td style={tdStyle}>
                          {row.valid ? <Pill tone={row.duplicate ? 'warning' : 'success'}>{row.duplicate ? 'Duplicate in file' : 'Ready'}</Pill> : <Pill tone="error">{row.errors[0]}</Pill>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {validatedRows.length > 12 && <p style={{ color: 'var(--text-tertiary)', fontSize: 12, margin: '8px 0 0' }}>Showing 12 of {validatedRows.length} parsed rows.</p>}
            </Card>
          )}

          {rawRows.length > 0 && !result && (
            <Card>
              <h2 style={{ margin: '0 0 8px', color: 'var(--text-primary)', fontSize: 16 }}>Confirm import behavior</h2>
              <div style={{ display: 'grid', gap: 6, color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.45 }}>
                <span>Existing Gymvyn users will be linked to this gym.</span>
                <span>Their personal profile details will not be overwritten by owner-imported data.</span>
                <span>Gym-specific membership details may be created or updated.</span>
                <span>Unknown people remain unclaimed until they register with matching verified credentials.</span>
                <span>Identity conflicts will not be auto-merged.</span>
              </div>
              <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: 14, color: 'var(--text-primary)', fontSize: 14 }}>
                <input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />
                I understand this can create or update gym memberships.
              </label>
              {submitError && <p style={{ color: 'var(--error)', fontSize: 13, margin: '10px 0 0' }}>{submitError}</p>}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 14, flexWrap: 'wrap' }}>
                {invalidRows.length > 0 && <Button variant="secondary" onClick={downloadAttentionReport}>Download local error report</Button>}
                <Button onClick={submitImport} disabled={!canSubmit} style={{ minWidth: 184 }}>
                  {submitting ? (
                    <>
                      <ButtonSpinner size={14} /> Importing...
                    </>
                  ) : `Import ${payload.length} valid row${payload.length === 1 ? '' : 's'}`}
                </Button>
              </div>
            </Card>
          )}

          {result && (
            <Card>
              <h2 style={{ margin: '0 0 12px', color: 'var(--text-primary)', fontSize: 16 }}>Import results</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(128px, 1fr))', gap: 10, marginBottom: 14 }}>
                <Metric label="Total rows" value={result.summary?.total_rows ?? 0} />
                <Metric label="Successful" value={result.summary?.successful_rows ?? 0} tone="success" />
                <Metric label="Linked" value={result.summary?.existing_users_linked ?? 0} tone="success" />
                <Metric label="Unclaimed" value={result.summary?.unclaimed_members_created ?? 0} />
                <Metric label="Updated" value={result.summary?.existing_memberships_updated ?? 0} />
                <Metric label="Skipped" value={result.summary?.duplicates_skipped ?? 0} />
                <Metric label="Conflicts" value={result.summary?.conflicts ?? 0} tone="warning" />
                <Metric label="Invalid" value={(result.summary?.invalid_rows ?? 0) + invalidRows.length} tone="error" />
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: '1 1 220px' }}>
                  <span style={{ position: 'absolute', left: 10, top: 10 }}><Icon name="search" size={16} /></span>
                  <input value={resultSearch} onChange={event => setResultSearch(event.target.value)} placeholder="Search results" style={{ width: '100%', height: 38, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', padding: '0 10px 0 32px' }} />
                </div>
                {RESULT_FILTERS.map(filter => (
                  <button key={filter.key} onClick={() => setResultFilter(filter.key)} style={{ height: 34, borderRadius: 18, border: '1px solid var(--border)', background: resultFilter === filter.key ? 'var(--text-primary)' : 'var(--bg-card)', color: resultFilter === filter.key ? 'var(--bg-card)' : 'var(--text-secondary)', padding: '0 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                    {filter.label}
                  </button>
                ))}
              </div>

              <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 10 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 840 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-elevated)' }}>
                      {['CSV row', 'Name', 'Phone', 'Email', 'Status', 'Message'].map(head => <th key={head} style={thStyle}>{head}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResults.map((row, index) => (
                      <tr key={`${row.originalRow}-${index}`} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={tdStyle}>{row.originalRow}</td>
                        <td style={tdStyle}>{row.member || '—'}</td>
                        <td style={tdStyle}>{row.phone || '—'}</td>
                        <td style={tdStyle}>{row.email || '—'}</td>
                        <td style={tdStyle}><Pill tone={statusTone(row.status)}>{resultLabel(row.status)}</Pill></td>
                        <td style={tdStyle}>{row.message || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 14, flexWrap: 'wrap' }}>
                <Button variant="secondary" onClick={downloadAttentionReport}>Download attention report</Button>
                {resultRows.some(row => statusGroup(row.status) !== 'successful') && <Button variant="secondary" onClick={retryAttentionRows}>Retry attention rows</Button>}
                <Button variant="secondary" onClick={resetImport}>Import another file</Button>
                <Button onClick={() => navigate(backPath)}>Back to members</Button>
              </div>
            </Card>
          )}
        </div>
      </div>
      {!isStaff && <GymOwnerNav />}
    </div>
  )
}

const thStyle = {
  padding: '10px 12px',
  textAlign: 'left',
  color: 'var(--text-secondary)',
  fontSize: 12,
  fontWeight: 800,
  whiteSpace: 'nowrap',
}

const tdStyle = {
  padding: '10px 12px',
  color: 'var(--text-primary)',
  fontSize: 13,
  verticalAlign: 'top',
}
