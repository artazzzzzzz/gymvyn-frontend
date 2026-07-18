import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../utils/api'
import { getAvatarColor, getInitials } from '../utils/avatarColor'
import { ButtonSpinner, ListSkeleton } from '../components/loading/Loading'
import { removePersonFromFriendViews, searchFriendAction } from '../utils/friendsState'

function Avatar({ name }) {
  const { bg, text } = getAvatarColor(name || 'Gymvyn User')
  return <div className="w-10 h-10 rounded-full flex shrink-0 items-center justify-center text-sm font-semibold" style={{ background: bg, color: text }}>{getInitials(name || 'Gymvyn User')}</div>
}

function RetryState({ message, onRetry }) {
  return <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-6 text-center"><p className="text-sm text-[var(--text-secondary)]">{message}</p><button onClick={onRetry} className="mt-3 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-semibold text-[var(--text-primary)]">Retry</button></div>
}

function EmptyState({ children }) {
  return <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-8 text-center text-sm text-[var(--text-tertiary)]">{children}</div>
}

function PersonRow({ person, detail, actions }) {
  return <div className="flex gap-3 border-b border-[var(--divider)] py-3 last:border-b-0">
    <Avatar name={person.full_name || person.other_user?.full_name} />
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{person.full_name || person.other_user?.full_name || 'Gymvyn User'}</p>
      <p className="mt-0.5 text-xs capitalize text-[var(--text-tertiary)]">{detail || person.role || person.other_user?.role || 'Member'}</p>
      {actions && <div className="mt-2 flex flex-wrap gap-2">{actions}</div>}
    </div>
  </div>
}

export default function FriendsPage() {
  const navigate = useNavigate()
  const searchTimer = useRef(null)
  const [tab, setTab] = useState('friends')
  const [friends, setFriends] = useState([])
  const [incoming, setIncoming] = useState([])
  const [outgoing, setOutgoing] = useState([])
  const [blocked, setBlocked] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [actionKey, setActionKey] = useState('')
  const [confirm, setConfirm] = useState(null)

  const loadFriends = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [friendData, requestData, blockData] = await Promise.all([
        apiFetch('/api/friends'),
        apiFetch('/api/friends/requests'),
        apiFetch('/api/friends/blocks'),
      ])
      setFriends(friendData || [])
      setIncoming(requestData?.incoming || [])
      setOutgoing(requestData?.outgoing || [])
      setBlocked(blockData || [])
    } catch (err) {
      setError(err.message || 'Could not load friends.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => { void loadFriends() }, 0)
    return () => clearTimeout(timer)
  }, [loadFriends])

  useEffect(() => {
    clearTimeout(searchTimer.current)
    const query = search.trim()
    if (query.length < 2) {
      return undefined
    }
    searchTimer.current = setTimeout(async () => {
      setSearchLoading(true)
      setSearchError('')
      try {
        setSearchResults(await apiFetch(`/api/friends/search?q=${encodeURIComponent(query)}`))
      } catch (err) {
        setSearchResults([])
        setSearchError(err.message || 'Could not search users.')
      } finally {
        setSearchLoading(false)
      }
    }, 300)
    return () => clearTimeout(searchTimer.current)
  }, [search])

  const runAction = async (key, request, successMessage, onSuccess) => {
    if (actionKey) return
    setActionKey(key)
    setNotice('')
    try {
      await request()
      onSuccess?.()
      setNotice(successMessage)
      await loadFriends()
    } catch (err) {
      setNotice(err.message || 'That action could not be completed.')
    } finally {
      setActionKey('')
    }
  }

  const sendRequest = person => runAction(`request:${person.id}`, () => apiFetch('/api/friends/requests', { method: 'POST', body: JSON.stringify({ targetUserId: person.id }) }), 'Friend request sent.', () => {
    setSearchResults(results => results.map(result => result.id === person.id ? { ...result, friendship_status: 'pending' } : result))
  })

  const acceptRequest = request => runAction(`accept:${request.id}`, () => apiFetch(`/api/friends/requests/${request.id}/accept`, { method: 'POST' }), 'Friend request accepted.')
  const declineRequest = request => runAction(`decline:${request.id}`, () => apiFetch(`/api/friends/requests/${request.id}/decline`, { method: 'POST' }), 'Friend request declined.')
  const removeFriend = friend => runAction(`remove:${friend.friendship_id}`, () => apiFetch(`/api/friends/${friend.friendship_id}`, { method: 'DELETE' }), 'Friend removed.')
  const blockPerson = person => runAction(`block:${person.id}`, () => apiFetch('/api/friends/block', { method: 'POST', body: JSON.stringify({ userId: person.id }) }), 'User blocked. You can no longer message each other.', () => {
    const next = removePersonFromFriendViews({ friends, incoming, outgoing, blocked }, person.id)
    setFriends(next.friends); setIncoming(next.incoming); setOutgoing(next.outgoing); setBlocked(next.blocked)
    setSearchResults(results => results.filter(result => result.id !== person.id))
  })
  const unblockPerson = person => runAction(`unblock:${person.id}`, () => apiFetch(`/api/friends/block/${person.id}`, { method: 'DELETE' }), 'User unblocked.')

  const messageFriend = friend => runAction(`message:${friend.id}`, async () => {
    const result = await apiFetch('/api/chat/start', { method: 'POST', body: JSON.stringify({ targetUserId: friend.id }) })
    if (!result?.conversationId) throw new Error('Could not open this conversation.')
    navigate(`/client/chat?conversationId=${encodeURIComponent(result.conversationId)}&name=${encodeURIComponent(friend.full_name || 'Chat')}`)
  }, '')

  const busy = key => actionKey === key
  const actionButton = (label, key, handler, secondary = false) => <button disabled={!!actionKey} onClick={handler} className={`rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${secondary ? 'border border-[var(--border)] text-[var(--text-primary)]' : 'bg-[var(--text-primary)] text-[var(--bg-card)]'}`}>{busy(key) ? <ButtonSpinner size={12} /> : label}</button>

  return <div className="min-h-screen bg-[var(--bg-primary)] pb-24 text-[var(--text-primary)]">
    <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--bg-card)] px-5 py-4"><h1 className="text-xl font-semibold">Friends</h1><p className="mt-1 text-sm text-[var(--text-tertiary)]">Stay connected with people you know.</p></header>
    <main className="mx-auto max-w-2xl px-4 py-4">
      <div className="mb-4 grid grid-cols-3 rounded-xl bg-[var(--bg-pill)] p-1">
        {[['friends', 'Friends'], ['requests', 'Requests'], ['add', 'Add friend']].map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`rounded-lg px-2 py-2 text-sm ${tab === id ? 'bg-[var(--bg-card)] font-semibold text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}`}>{label}</button>)}
      </div>
      {notice && <p role="status" className="mb-4 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-secondary)]">{notice}</p>}
      {loading ? <ListSkeleton rows={4} /> : error ? <RetryState message={error} onRetry={loadFriends} /> : <>
        {tab === 'friends' && <section>
          <div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-semibold">Your friends</h2><button onClick={() => setTab('add')} className="text-sm font-semibold text-[var(--text-primary)] underline">Add friend</button></div>
          {friends.length === 0 ? <EmptyState>No friends yet. Search for someone to send a request.</EmptyState> : <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4">{friends.map(friend => <PersonRow key={friend.id} person={friend} actions={<>{actionButton('Message', `message:${friend.id}`, () => messageFriend(friend))}{actionButton('Remove', `remove:${friend.friendship_id}`, () => setConfirm({ type: 'remove', person: friend }), true)}{actionButton('Block', `block:${friend.id}`, () => setConfirm({ type: 'block', person: friend }), true)}</>} />)}</div>}
          <div className="mt-6"><h2 className="mb-2 text-sm font-semibold">Blocked users</h2>{blocked.length === 0 ? <EmptyState>You have not blocked anyone.</EmptyState> : <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4">{blocked.map(person => <PersonRow key={person.id} person={person} detail="Blocked" actions={actionButton('Unblock', `unblock:${person.id}`, () => unblockPerson(person), true)} />)}</div>}</div>
        </section>}
        {tab === 'requests' && <section className="space-y-6">
          <div><h2 className="mb-2 text-sm font-semibold">Incoming</h2>{incoming.length === 0 ? <EmptyState>No incoming requests.</EmptyState> : <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4">{incoming.map(request => <PersonRow key={request.id} person={request} detail="Wants to be friends" actions={<>{actionButton('Accept', `accept:${request.id}`, () => acceptRequest(request))}{actionButton('Decline', `decline:${request.id}`, () => declineRequest(request), true)}{actionButton('Block', `block:${request.other_user.id}`, () => setConfirm({ type: 'block', person: request.other_user }), true)}</>} />)}</div>}</div>
          <div><h2 className="mb-2 text-sm font-semibold">Sent</h2>{outgoing.length === 0 ? <EmptyState>No pending friend requests.</EmptyState> : <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4">{outgoing.map(request => <PersonRow key={request.id} person={request} detail="Request pending" actions={actionButton('Block', `block:${request.other_user.id}`, () => setConfirm({ type: 'block', person: request.other_user }), true)} />)}</div>}</div>
        </section>}
        {tab === 'add' && <section><label className="sr-only" htmlFor="friend-search">Search by name</label><input id="friend-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search by name" className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-sm outline-none" />
          <div className="mt-3">{search.trim().length < 2 ? <EmptyState>Enter at least two letters to search.</EmptyState> : searchLoading ? <ListSkeleton rows={3} /> : searchError ? <RetryState message={searchError} onRetry={() => setSearch(query => `${query} `)} /> : searchResults.length === 0 ? <EmptyState>No available users found.</EmptyState> : <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4">{searchResults.map(person => { const action = searchFriendAction(person); return <PersonRow key={person.id} person={person} actions={actionButton(action.label, `request:${person.id}`, () => sendRequest(person), true)} /> })}</div>}</div>
        </section>}
      </>}
    </main>
    {confirm && <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center" onClick={() => setConfirm(null)}><div role="dialog" aria-modal="true" className="w-full rounded-t-2xl bg-[var(--bg-card)] p-5 sm:max-w-sm sm:rounded-2xl" onClick={event => event.stopPropagation()}><h2 className="text-lg font-semibold">{confirm.type === 'block' ? 'Block this user?' : 'Remove friend?'}</h2><p className="mt-2 text-sm text-[var(--text-secondary)]">{confirm.type === 'block' ? 'You will no longer be able to message each other. Historical messages will not be deleted.' : `Remove ${confirm.person.full_name || 'this friend'} from your friends?`}</p><div className="mt-5 flex justify-end gap-2">{actionButton('Cancel', 'cancel', () => setConfirm(null), true)}{actionButton(confirm.type === 'block' ? 'Block user' : 'Remove', confirm.type === 'block' ? `block:${confirm.person.id}` : `remove:${confirm.person.friendship_id}`, () => { const current = confirm; setConfirm(null); return current.type === 'block' ? blockPerson(current.person) : removeFriend(current.person) })}</div></div></div>}
  </div>
}
