import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { getAsyncViewState, shouldShowDelayedLoading } from '../src/utils/loadingState.js'

test('initial loading renders loading instead of empty or error', () => {
  assert.equal(getAsyncViewState({ loading: true, error: null, hasData: false }), 'loading')
  assert.equal(getAsyncViewState({ loading: true, error: new Error('later'), hasData: false }), 'loading')
})

test('existing data stays visible during refetch', () => {
  assert.equal(getAsyncViewState({ loading: true, error: null, hasData: true }), 'refreshing')
})

test('loading settles to error or empty after request finishes', () => {
  assert.equal(getAsyncViewState({ loading: false, error: new Error('failed'), hasData: false }), 'error')
  assert.equal(getAsyncViewState({ loading: false, error: null, hasData: false }), 'empty')
})

test('permission denied is distinct from loading and empty', () => {
  assert.equal(getAsyncViewState({ loading: true, error: null, hasData: false, permissionDenied: true }), 'permission')
})

test('delayed inline loading avoids flashes for fast requests', () => {
  const startedAt = 1_000
  assert.equal(shouldShowDelayedLoading(startedAt, 1_120, 180), false)
  assert.equal(shouldShowDelayedLoading(startedAt, 1_181, 180), true)
})

test('shared CSS disables loader animation for reduced-motion users', () => {
  const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')
  assert.match(css, /prefers-reduced-motion:\s*reduce/)
  assert.match(css, /\.gv-skeleton/)
  assert.match(css, /\.gv-button-spinner/)
})

test('priority source keeps preview data during import submit and check-in search refresh', () => {
  const importSource = readFileSync(new URL('../src/pages/GymImport.jsx', import.meta.url), 'utf8')
  const ownerCheckin = readFileSync(new URL('../src/pages/gym/GymCheckin.jsx', import.meta.url), 'utf8')
  const staffCheckin = readFileSync(new URL('../src/pages/staff/StaffCheckin.jsx', import.meta.url), 'utf8')

  assert.match(importSource, /setSubmitting\(true\)/)
  assert.doesNotMatch(importSource, /setRawRows\(\[\]\)[\s\S]{0,160}setSubmitting\(true\)/)
  assert.match(ownerCheckin, /\{searchResults\.length > 0 &&/)
  assert.match(staffCheckin, /\{searchResults\.length > 0 &&/)
})
