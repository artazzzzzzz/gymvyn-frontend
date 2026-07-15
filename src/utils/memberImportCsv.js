const TARGET_FIELDS = [
  { key: 'ignore', label: 'Ignore this column' },
  { key: 'full_name', label: 'Full name' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'gender', label: 'Gender' },
  { key: 'date_of_birth', label: 'Date of birth' },
  { key: 'membership_start_date', label: 'Membership start date' },
  { key: 'membership_expiry_date', label: 'Membership expiry date' },
  { key: 'membership_plan', label: 'Membership plan' },
  { key: 'fee', label: 'Fee' },
  { key: 'payment_status', label: 'Payment status' },
  { key: 'gym_member_code', label: 'Gym member code' },
  { key: 'assigned_trainer_id', label: 'Assigned trainer id' },
  { key: 'notes', label: 'Notes' },
  { key: 'tags', label: 'Tags' },
]

const FIELD_LABELS = Object.fromEntries(TARGET_FIELDS.map(field => [field.key, field.label]))
const IMPORTABLE_FIELDS = TARGET_FIELDS.filter(field => field.key !== 'ignore').map(field => field.key)
const MAX_IMPORT_ROWS = 500

const ALIASES = {
  full_name: ['full name', 'fullname', 'name', 'member name', 'customer name', 'client name'],
  phone: ['phone', 'phone number', 'mobile', 'mobile number', 'contact', 'contact number', 'whatsapp', 'whatsapp number'],
  email: ['email', 'email address', 'mail', 'e-mail', 'email id'],
  gender: ['gender', 'sex'],
  date_of_birth: ['date of birth', 'dob', 'birth date', 'birthday'],
  membership_start_date: ['membership start date', 'start date', 'joining date', 'join date', 'joined date', 'membership start', 'start'],
  membership_expiry_date: ['membership expiry date', 'membership end date', 'expiry', 'expiry date', 'end date', 'valid till', 'membership expiry'],
  membership_plan: ['membership plan', 'plan', 'package', 'plan name', 'membership type', 'membership package'],
  fee: ['fee', 'amount', 'monthly fee', 'membership fee', 'price', 'paid amount'],
  payment_status: ['payment status', 'fee status', 'payment', 'paid status'],
  gym_member_code: ['gym member code', 'member code', 'membership code', 'code', 'member id', 'gym id'],
  assigned_trainer_id: ['assigned trainer id', 'trainer id'],
  notes: ['notes', 'note', 'gym notes', 'remarks', 'comments'],
  tags: ['tags', 'tag', 'gym tags', 'labels'],
}

function normalizeHeader(header) {
  return String(header || '')
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, ' ')
}

function canonicalValue(value) {
  return String(value ?? '').trim()
}

function normalizeEmail(value) {
  const email = canonicalValue(value).toLowerCase()
  if (!email) return ''
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null
}

function normalizeIndianPhone(value) {
  let digits = canonicalValue(value).replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1)
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2)
  return /^[6-9]\d{9}$/.test(digits) ? digits : null
}

function isValidDate(value) {
  const text = canonicalValue(value)
  if (!text) return true
  const date = new Date(text)
  return !Number.isNaN(date.getTime())
}

function dateValue(value) {
  const text = canonicalValue(value)
  if (!text) return null
  const date = new Date(text)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString().slice(0, 10)
}

function autoMapColumns(columns) {
  const used = new Set()
  const mapping = {}
  for (const column of columns) {
    const normalized = normalizeHeader(column)
    let target = 'ignore'
    for (const [field, aliases] of Object.entries(ALIASES)) {
      if (used.has(field)) continue
      if (aliases.includes(normalized)) {
        target = field
        used.add(field)
        break
      }
    }
    mapping[column] = target
  }
  return mapping
}

function hasConflictingMappings(mapping) {
  const seen = new Map()
  const conflicts = []
  for (const [column, target] of Object.entries(mapping || {})) {
    if (!target || target === 'ignore') continue
    if (seen.has(target)) conflicts.push({ target, columns: [seen.get(target), column] })
    else seen.set(target, column)
  }
  return conflicts
}

function buildMappedRows(rows, mapping) {
  return (rows || []).map((sourceRow, index) => {
    const mapped = {}
    for (const [column, target] of Object.entries(mapping || {})) {
      if (!target || target === 'ignore') continue
      mapped[target] = canonicalValue(sourceRow[column])
    }
    return { rowNumber: index + 2, source: sourceRow, mapped }
  })
}

function duplicateKeysForRow(mapped) {
  const phone = normalizeIndianPhone(mapped.phone)
  const email = normalizeEmail(mapped.email)
  const code = canonicalValue(mapped.gym_member_code).toLowerCase()
  return [
    phone ? `phone:${phone}` : null,
    email ? `email:${email}` : null,
    code ? `code:${code}` : null,
  ].filter(Boolean)
}

function validateImportRows(rows, mapping) {
  const mappedRows = buildMappedRows(rows, mapping)
  const keyCounts = new Map()
  for (const row of mappedRows) {
    for (const key of duplicateKeysForRow(row.mapped)) {
      keyCounts.set(key, (keyCounts.get(key) || 0) + 1)
    }
  }

  return mappedRows.map(row => {
    const errors = []
    const warnings = []
    const mapped = row.mapped
    const phone = normalizeIndianPhone(mapped.phone)
    const email = normalizeEmail(mapped.email)

    if (!phone && !email) errors.push('Add a valid phone or email. Name alone cannot identify a member.')
    if (mapped.phone && phone === null) errors.push('Phone is not a valid Indian mobile number.')
    if (mapped.email && email === null) errors.push('Email format is invalid.')
    if (!isValidDate(mapped.membership_start_date)) errors.push('Start date is invalid.')
    if (!isValidDate(mapped.membership_expiry_date)) errors.push('Expiry date is invalid.')

    const start = dateValue(mapped.membership_start_date)
    const expiry = dateValue(mapped.membership_expiry_date)
    if (start && expiry && start > expiry) errors.push('Start date cannot be after expiry date.')

    if (canonicalValue(mapped.fee)) {
      const amount = Number(canonicalValue(mapped.fee))
      if (!Number.isFinite(amount) || amount < 0) errors.push('Fee must be a valid number.')
    }

    const duplicates = duplicateKeysForRow(mapped).filter(key => keyCounts.get(key) > 1)
    if (duplicates.length > 0) warnings.push('Duplicate phone, email, or member code inside this file.')

    return {
      ...row,
      normalized: { phone: phone || '', email: email || '' },
      errors,
      warnings,
      valid: errors.length === 0,
      duplicate: duplicates.length > 0,
    }
  })
}

function buildImportPayload(validatedRows) {
  return (validatedRows || [])
    .filter(row => row.valid)
    .map(row => {
      const payload = {}
      for (const field of IMPORTABLE_FIELDS) {
        const value = canonicalValue(row.mapped[field])
        if (value) payload[field] = value
      }
      return payload
    })
}

function statusGroup(status) {
  if (['linked_existing_user', 'created_unclaimed_member', 'updated_existing_membership'].includes(status)) return 'successful'
  if (status === 'identity_conflict') return 'conflicts'
  if (['validation_error', 'authorization_error'].includes(status)) return 'invalid'
  if (status === 'duplicate_skipped') return 'skipped'
  return 'invalid'
}

function statusTone(status) {
  const group = statusGroup(status)
  if (group === 'successful') return 'success'
  if (group === 'conflicts') return 'warning'
  if (group === 'skipped') return 'neutral'
  return 'error'
}

function resultLabel(status) {
  return String(status || 'unknown').split('_').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}

function csvEscape(value) {
  const text = String(value ?? '')
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

function toCsv(rows, columns) {
  return [
    columns.map(csvEscape).join(','),
    ...rows.map(row => columns.map(column => csvEscape(row[column])).join(',')),
  ].join('\n')
}

function buildAttentionReportRows(results, validatedRows) {
  const byRow = new Map((validatedRows || []).map(row => [row.rowNumber, row]))
  return (results || [])
    .filter(result => statusGroup(result.status) !== 'successful')
    .map(result => {
      const source = byRow.get(result.row)?.mapped || {}
      return {
        row: result.row,
        full_name: source.full_name || '',
        phone: source.phone || '',
        email: source.email || '',
        membership_plan: source.membership_plan || '',
        gym_member_code: source.gym_member_code || '',
        status: result.status || '',
        message: result.message || '',
      }
    })
}

function templateCsv() {
  return toCsv([
    {
      full_name: 'REMOVE EXAMPLE - Aman Sharma',
      phone: '9876543210',
      email: 'aman@example.com',
      gender: 'male',
      date_of_birth: '1998-04-12',
      membership_start_date: '2026-07-01',
      membership_expiry_date: '2026-08-01',
      membership_plan: 'monthly',
      fee: '1500',
      payment_status: 'paid',
      gym_member_code: 'GM-001',
      assigned_trainer_id: '',
      notes: 'Remove this example row before importing',
      tags: 'morning batch',
    },
  ], IMPORTABLE_FIELDS)
}

export {
  TARGET_FIELDS,
  FIELD_LABELS,
  IMPORTABLE_FIELDS,
  MAX_IMPORT_ROWS,
  normalizeHeader,
  normalizeEmail,
  normalizeIndianPhone,
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
}
