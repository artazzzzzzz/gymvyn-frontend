export function getAvatarColor(name) {
  if (!name) return { bg: '#F1EFE8', text: '#5F5E5A' }
  const first = name.charAt(0).toUpperCase()
  if (first >= 'A' && first <= 'D')
    return { bg: '#E6F1FB', text: '#185FA5' }
  if (first >= 'E' && first <= 'H')
    return { bg: '#EAF3DE', text: '#3B6D11' }
  if (first >= 'I' && first <= 'L')
    return { bg: '#FAEEDA', text: '#854F0B' }
  if (first >= 'M' && first <= 'P')
    return { bg: '#E1F5EE', text: '#0F6E56' }
  if (first >= 'Q' && first <= 'T')
    return { bg: '#FCEBEB', text: '#A32D2D' }
  if (first >= 'U' && first <= 'Z')
    return { bg: '#EEEDFE', text: '#3C3489' }
  return { bg: '#F1EFE8', text: '#5F5E5A' }
}

export function getInitials(fullName) {
  if (!fullName) return '??'
  const parts = fullName.trim().split(' ')
  if (parts.length === 1) return parts[0].slice(0,2).toUpperCase()
  return (parts[0][0] + parts[parts.length-1][0]).toUpperCase()
}
