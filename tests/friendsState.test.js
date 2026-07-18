import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { removePersonFromFriendViews, searchFriendAction } from '../src/utils/friendsState.js'

test('blocking immediately removes a person from all visible friend views', () => {
  const next = removePersonFromFriendViews({
    friends: [{ id: 'person-a' }, { id: 'person-b' }],
    incoming: [{ other_user: { id: 'person-a' } }],
    outgoing: [{ other_user: { id: 'person-a' } }],
    blocked: [{ id: 'person-b' }],
  }, 'person-a')
  assert.deepEqual(next.friends, [{ id: 'person-b' }])
  assert.deepEqual(next.incoming, [])
  assert.deepEqual(next.outgoing, [])
  assert.deepEqual(next.blocked, [{ id: 'person-b' }])
})

test('search result actions distinguish new, pending, incoming, and accepted relationships', () => {
  assert.deepEqual(searchFriendAction({}), { label: 'Add friend', disabled: false })
  assert.deepEqual(searchFriendAction({ friendship_status: 'pending' }), { label: 'Request sent', disabled: true })
  assert.deepEqual(searchFriendAction({ incoming_request: true }), { label: 'Incoming request', disabled: true })
  assert.deepEqual(searchFriendAction({ friendship_status: 'accepted' }), { label: 'Already friends', disabled: true })
})

test('Friends page uses backend APIs, confirmation UI, and the existing member chat route', () => {
  const source = readFileSync(new URL('../src/pages/FriendsPage.jsx', import.meta.url), 'utf8')
  for (const path of ['/api/friends/requests', '/api/friends/block', '/api/chat/start', '/api/friends/blocks']) {
    assert.match(source, new RegExp(path.replaceAll('/', '\\/')))
  }
  assert.match(source, /setConfirm\(\{ type: 'remove'/)
  assert.match(source, /setConfirm\(\{ type: 'block'/)
  assert.match(source, /\/client\/chat\?conversationId=/)
})
