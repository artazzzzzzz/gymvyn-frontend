import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createManualCheckinSearchController,
  createPendingActionGuard,
  mergeInsideStatus,
} from '../src/utils/manualCheckinSearch.js'

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

test('initial controller creation does not create a search request', async () => {
  let calls = 0
  createManualCheckinSearchController({
    debounceMs: 5,
    searchMembers: async () => { calls += 1; return [] },
  })
  await wait(20)
  assert.equal(calls, 0)
})

test('rapid typing sends one debounced request for the final query', async () => {
  const queries = []
  const controller = createManualCheckinSearchController({
    debounceMs: 10,
    searchMembers: async query => {
      queries.push(query)
      return [{ member_id: 'm1', full_name: 'Aman' }]
    },
  })

  controller.setQuery('a')
  controller.setQuery('am')
  controller.setQuery('ama')
  controller.setQuery('aman')
  await wait(35)

  assert.deepEqual(queries, ['aman'])
  assert.equal(controller.getState().results[0].full_name, 'Aman')
})

test('same query does not refetch without another state change', async () => {
  let calls = 0
  const controller = createManualCheckinSearchController({
    debounceMs: 5,
    searchMembers: async () => { calls += 1; return [] },
  })

  controller.setQuery('aman')
  await wait(20)
  await wait(20)

  assert.equal(calls, 1)
})

test('clearing search cancels the pending request and clears results', async () => {
  let calls = 0
  const controller = createManualCheckinSearchController({
    debounceMs: 20,
    searchMembers: async () => { calls += 1; return [{ member_id: 'm1' }] },
  })

  controller.setQuery('aman')
  controller.clear()
  await wait(45)

  assert.equal(calls, 0)
  assert.equal(controller.getState().query, '')
  assert.deepEqual(controller.getState().results, [])
})

test('older API response cannot replace newer results', async () => {
  const controller = createManualCheckinSearchController({
    debounceMs: 1,
    searchMembers: async query => {
      if (query === 'am') {
        await wait(40)
        return [{ member_id: 'old', full_name: 'Old Result' }]
      }
      await wait(5)
      return [{ member_id: 'new', full_name: 'New Result' }]
    },
  })

  controller.setQuery('am')
  await wait(8)
  controller.setQuery('aman')
  await wait(65)

  assert.equal(controller.getState().results[0].member_id, 'new')
})

test('API failure creates one stable error without retrying', async () => {
  let calls = 0
  const controller = createManualCheckinSearchController({
    debounceMs: 5,
    searchMembers: async () => {
      calls += 1
      throw new Error('Backend unavailable')
    },
  })

  controller.setQuery('aman')
  await wait(25)
  await wait(25)

  assert.equal(calls, 1)
  assert.equal(controller.getState().error, 'Backend unavailable')
  assert.deepEqual(controller.getState().results, [])
})

test('member selection helpers do not trigger a new search', async () => {
  let calls = 0
  const controller = createManualCheckinSearchController({
    debounceMs: 5,
    searchMembers: async () => {
      calls += 1
      return [{ member_id: 'm1', full_name: 'Aman' }]
    },
  })

  controller.setQuery('aman')
  await wait(20)
  const merged = mergeInsideStatus(controller.getState().results, [{ member_id: 'm1' }])

  assert.equal(calls, 1)
  assert.equal(merged[0].is_inside, true)
})

test('pending check-in guard prevents duplicate submission while active', () => {
  const guard = createPendingActionGuard()

  assert.equal(guard.start('member-1'), true)
  assert.equal(guard.start('member-1'), false)
  assert.equal(guard.isPending('member-1'), true)
  guard.finish('member-1')
  assert.equal(guard.start('member-1'), true)
})

test('owner and staff search flows can share the same controller behavior', async () => {
  const calls = []
  const makeController = role => createManualCheckinSearchController({
    debounceMs: 5,
    searchMembers: async query => {
      calls.push(`${role}:${query}`)
      return []
    },
  })

  makeController('owner').setQuery('aman')
  makeController('staff').setQuery('aman')
  await wait(25)

  assert.deepEqual(calls.sort(), ['owner:aman', 'staff:aman'])
})
