import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  ensureApplicationProfile,
  getAuthRedirectPath,
  resolveAuthenticatedRedirect,
  startOAuth,
} from '../src/utils/authFlowCore.js'

function oauthClient(error = null) {
  const calls = []
  return {
    calls,
    auth: {
      signInWithOAuth: async args => {
        calls.push(args)
        return { error }
      },
    },
  }
}

function profileClient({ existingUser = null, insertError = null, insertedUser = null, refetchedUser = null } = {}) {
  const calls = { inserts: [], userSelects: 0 }
  return {
    calls,
    from(table) {
      assert.equal(table, 'users')
      const builder = {
        select() { return builder },
        eq() { return builder },
        async maybeSingle() {
          calls.userSelects += 1
          const data = calls.userSelects === 1 ? existingUser : refetchedUser
          return { data, error: null }
        },
        insert(payload) {
          calls.inserts.push(payload)
          return {
            select() {
              return {
                maybeSingle: async () => (
                  insertError
                    ? { data: null, error: insertError }
                    : { data: insertedUser || payload, error: null }
                ),
              }
            },
          }
        },
      }
      return builder
    },
  }
}

test('Google OAuth starts with the google provider and callback URL', async () => {
  const client = oauthClient()
  await startOAuth('google', { client, origin: 'http://localhost:5173' })
  assert.deepEqual(client.calls[0], {
    provider: 'google',
    options: { redirectTo: 'http://localhost:5173/auth/callback' },
  })
})

test('Apple OAuth starts with the apple provider and callback URL', async () => {
  const client = oauthClient()
  await startOAuth('apple', { client, origin: 'https://app.gymvyn.com/' })
  assert.deepEqual(client.calls[0], {
    provider: 'apple',
    options: { redirectTo: 'https://app.gymvyn.com/auth/callback' },
  })
})

test('OAuth initiation errors are surfaced', async () => {
  const client = oauthClient(new Error('Provider is not enabled'))
  await assert.rejects(
    startOAuth('google', { client, origin: 'http://localhost:5173' }),
    /Provider is not enabled/
  )
})

test('callback routing sends completed users to the correct home', () => {
  assert.equal(getAuthRedirectPath({ role: 'consumer', complete: true }), '/home')
  assert.equal(getAuthRedirectPath({ role: 'gym_owner', complete: true }), '/gym/dashboard')
  assert.equal(getAuthRedirectPath({ role: 'trainer', complete: true }), '/trainer/dashboard')
  assert.equal(getAuthRedirectPath({ role: 'staff', complete: true }), '/staff/dashboard')
})

test('callback routing sends incomplete users to onboarding', () => {
  assert.equal(getAuthRedirectPath({ role: 'consumer', complete: false }), '/onboarding')
  assert.equal(getAuthRedirectPath({ role: null, complete: false }), '/role-select')
  assert.equal(getAuthRedirectPath({ role: 'gym_owner', complete: false }), '/gym-onboarding')
  assert.equal(getAuthRedirectPath({ role: 'trainer', complete: false }), '/become-trainer')
  assert.equal(getAuthRedirectPath({ role: 'staff', complete: false }), '/stagv-onboarding')
})

test('missing application profile is bootstrapped safely', async () => {
  const client = profileClient({
    insertedUser: { id: 'u1', full_name: 'Asha Rao', role: 'consumer' },
  })
  const result = await ensureApplicationProfile({
    id: 'u1',
    email: 'asha@example.com',
    user_metadata: { full_name: 'Asha Rao' },
  }, client)

  assert.equal(result.created, true)
  assert.deepEqual(client.calls.inserts, [{ id: 'u1', full_name: 'Asha Rao', role: 'consumer' }])
})

test('existing application profile is not duplicated or overwritten', async () => {
  const existingUser = { id: 'u1', full_name: 'Existing Name', role: 'trainer', goal: null, training_days: null }
  const client = profileClient({ existingUser })
  const result = await ensureApplicationProfile({
    id: 'u1',
    email: 'new@example.com',
    user_metadata: { full_name: 'New Name' },
  }, client)

  assert.equal(result.created, false)
  assert.equal(result.profile.role, 'trainer')
  assert.deepEqual(client.calls.inserts, [])
})

test('duplicate bootstrap insert refetches instead of creating another profile', async () => {
  const client = profileClient({
    insertError: { code: '23505', message: 'duplicate key value violates unique constraint' },
    refetchedUser: { id: 'u1', full_name: 'Existing Name', role: 'consumer' },
  })
  const result = await ensureApplicationProfile({
    id: 'u1',
    email: 'dupe@example.com',
    user_metadata: {},
  }, client)

  assert.equal(result.created, false)
  assert.equal(result.profile.id, 'u1')
  assert.equal(client.calls.inserts.length, 1)
})

test('authenticated completed consumer resolves to home', async () => {
  const client = profileClient({
    existingUser: { id: 'u1', full_name: 'Asha', role: 'consumer', goal: 'muscle_gain', training_days: 4 },
  })
  const result = await resolveAuthenticatedRedirect({ id: 'u1', email: 'asha@example.com', user_metadata: {} }, client)
  assert.equal(result.path, '/home')
})

test('authenticated incomplete consumer resolves to onboarding', async () => {
  const client = profileClient({
    existingUser: { id: 'u1', full_name: 'Asha', role: 'consumer', goal: null, training_days: null },
  })
  const result = await resolveAuthenticatedRedirect({ id: 'u1', email: 'asha@example.com', user_metadata: {} }, client)
  assert.equal(result.path, '/onboarding')
})

test('login and signup still use existing email/password auth methods', () => {
  const loginSource = readFileSync(new URL('../src/pages/Login.jsx', import.meta.url), 'utf8')
  const signupSource = readFileSync(new URL('../src/pages/Signup.jsx', import.meta.url), 'utf8')

  assert.match(loginSource, /signIn\(email,\s*password\)/)
  assert.match(signupSource, /signUp\(email,\s*password,\s*\{\s*data:/)
})

test('OAuth duplicate clicks are guarded while loading', () => {
  const loginSource = readFileSync(new URL('../src/pages/Login.jsx', import.meta.url), 'utf8')
  const signupSource = readFileSync(new URL('../src/pages/Signup.jsx', import.meta.url), 'utf8')

  assert.match(loginSource, /if \(oauthLoading\) return/)
  assert.match(signupSource, /if \(oauthLoading\) return/)
  assert.match(loginSource, /disabled=\{!!oauthLoading \|\| isLoading\}/)
  assert.match(signupSource, /disabled=\{!!oauthLoading \|\| isLoading\}/)
})
