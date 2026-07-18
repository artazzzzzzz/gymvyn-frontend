export function removePersonFromFriendViews({ friends, incoming, outgoing, blocked }, userId) {
  return {
    friends: friends.filter(friend => friend.id !== userId),
    incoming: incoming.filter(request => request.other_user?.id !== userId),
    outgoing: outgoing.filter(request => request.other_user?.id !== userId),
    blocked: blocked.filter(person => person.id !== userId),
  }
}

export function searchFriendAction(person) {
  if (person.incoming_request) return { label: 'Incoming request', disabled: true }
  if (person.friendship_status === 'accepted') return { label: 'Already friends', disabled: true }
  if (person.friendship_status === 'pending') return { label: 'Request sent', disabled: true }
  return { label: 'Add friend', disabled: false }
}
