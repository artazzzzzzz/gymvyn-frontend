import test from 'node:test'
import assert from 'node:assert/strict'
import {
  autoMapColumns,
  hasConflictingMappings,
  validateImportRows,
  buildImportPayload,
  statusGroup,
  buildAttentionReportRows,
  templateCsv,
} from '../src/utils/memberImportCsv.js'

test('CSV alias auto-mapping maps safe aliases', () => {
  const mapping = autoMapColumns(['Member Name', 'Mobile Number', 'Email Address', 'Joining Date', 'Expiry', 'Package'])
  assert.equal(mapping['Member Name'], 'full_name')
  assert.equal(mapping['Mobile Number'], 'phone')
  assert.equal(mapping['Email Address'], 'email')
  assert.equal(mapping['Joining Date'], 'membership_start_date')
  assert.equal(mapping.Expiry, 'membership_expiry_date')
  assert.equal(mapping.Package, 'membership_plan')
})

test('phone or email is required and invalid row does not block valid row', () => {
  const rows = validateImportRows([
    { name: 'Only Name' },
    { name: 'Valid', phone: '+91 98765 43210' },
  ], { name: 'full_name', phone: 'phone' })
  assert.equal(rows[0].valid, false)
  assert.match(rows[0].errors[0], /phone or email/i)
  assert.equal(rows[1].valid, true)
})

test('duplicate file rows are flagged', () => {
  const rows = validateImportRows([
    { phone: '9876543210' },
    { phone: '+91 98765 43210' },
  ], { phone: 'phone' })
  assert.equal(rows[0].duplicate, true)
  assert.equal(rows[1].duplicate, true)
})

test('conflicting mappings are detected', () => {
  const conflicts = hasConflictingMappings({ A: 'phone', B: 'phone', C: 'email' })
  assert.equal(conflicts.length, 1)
  assert.equal(conflicts[0].target, 'phone')
})

test('correct API payload creation uses valid rows only', () => {
  const rows = validateImportRows([
    { name: 'Bad' },
    { name: 'Good', mobile: '9876543210', package: 'monthly', amount: '1500' },
  ], { name: 'full_name', mobile: 'phone', package: 'membership_plan', amount: 'fee' })
  assert.deepEqual(buildImportPayload(rows), [{ full_name: 'Good', phone: '9876543210', membership_plan: 'monthly', fee: '1500' }])
})

test('backend result statuses map to UI groups', () => {
  assert.equal(statusGroup('linked_existing_user'), 'successful')
  assert.equal(statusGroup('created_unclaimed_member'), 'successful')
  assert.equal(statusGroup('updated_existing_membership'), 'successful')
  assert.equal(statusGroup('identity_conflict'), 'conflicts')
  assert.equal(statusGroup('validation_error'), 'invalid')
  assert.equal(statusGroup('authorization_error'), 'invalid')
  assert.equal(statusGroup('duplicate_skipped'), 'skipped')
})

test('error report contains attention-required rows', () => {
  const validated = validateImportRows([{ name: 'A', phone: '9876543210' }], { name: 'full_name', phone: 'phone' })
  const report = buildAttentionReportRows([{ row: 2, status: 'identity_conflict', message: 'Review manually' }], validated)
  assert.equal(report.length, 1)
  assert.equal(report[0].full_name, 'A')
  assert.equal(report[0].status, 'identity_conflict')
})

test('template explains that the example row should be removed', () => {
  assert.match(templateCsv(), /REMOVE EXAMPLE/i)
  assert.match(templateCsv(), /Remove this example row before importing/i)
})
