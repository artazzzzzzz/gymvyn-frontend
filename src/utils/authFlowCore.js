import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'

export const OAUTH_CALLBACK_PATH = '/auth/callback'
export const NATIVE_OAUTH_CALLBACK_URL = 'gymvyn://auth/callback'
export const OAUTH_PROVIDERS = {
  google: 'google',
  apple: 'apple',
}

export function getOAuthRedirectTo(origin = window.location.origin) {
  return `${String(origin).replace(/\/+$/, '')}${OAUTH_CALLBACK_PATH}`
}

// Deep-link equivalents of AuthCallback.jsx's window.location.search/hash
// parsing, for the native flow where the callback arrives as a
// gymvyn://auth/callback URL via appUrlOpen rather than a page navigation.
export function getDeepLinkAuthError(url) {
  const params = new URL(url).searchParams
  return params.get('error_description') || params.get('error') || ''
}

export function getDeepLinkCode(url) {
  return new URL(url).searchParams.get('code')
}

export async function startOAuth(provider, {
  client,
  origin = window.location.origin,
} = {}) {
  if (!client) throw new Error('Supabase client is not available.')
  if (!Object.values(OAUTH_PROVIDERS).includes(provider)) {
    throw new Error('Unsupported sign-in provider.')
  }

  if (Capacitor.isNativePlatform()) {
    const { data, error } = await client.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: NATIVE_OAUTH_CALLBACK_URL,
        skipBrowserRedirect: true,
      },
    })
    if (error) throw error
    await Browser.open({ url: data.url })
    return
  }

  const { error } = await client.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: getOAuthRedirectTo(origin),
    },
  })

  if (error) throw error
}

export function getAuthDisplayName(user) {
  const metadata = user?.user_metadata || {}
  const name = metadata.full_name || metadata.name
  if (typeof name === 'string' && name.trim()) return name.trim()
  if (typeof user?.email === 'string' && user.email.includes('@')) {
    return user.email.split('@')[0]
  }
  return 'Gymvyn User'
}

export async function ensureApplicationProfile(user, client) {
  if (!client) throw new Error('Supabase client is not available.')
  if (!user?.id) throw new Error('Missing authenticated user.')

  const selectColumns = 'id, full_name, goal, training_days, role, gym_id'
  const existing = await client
    .from('users')
    .select(selectColumns)
    .eq('id', user.id)
    .maybeSingle()

  if (existing.error) throw existing.error
  if (existing.data) return { profile: existing.data, created: false }

  const inserted = await client
    .from('users')
    .insert({
      id: user.id,
      full_name: getAuthDisplayName(user),
      role: 'consumer',
    })
    .select(selectColumns)
    .maybeSingle()

  if (!inserted.error) return { profile: inserted.data, created: true }

  const duplicate = inserted.error.code === '23505' || /duplicate key/i.test(inserted.error.message || '')
  if (!duplicate) throw inserted.error

  const refetched = await client
    .from('users')
    .select(selectColumns)
    .eq('id', user.id)
    .maybeSingle()

  if (refetched.error) throw refetched.error
  if (!refetched.data) throw inserted.error
  return { profile: refetched.data, created: false }
}

export async function getProfileCompletion(profile, userId, client) {
  if (!client) throw new Error('Supabase client is not available.')
  const role = profile?.role || null

  if (!role) return { role, complete: false }
  if (role === 'consumer' || role === 'gym_member') {
    return { role, complete: !!(profile?.goal && profile?.training_days) }
  }
  if (role === 'gym_owner') {
    return { role, complete: !!profile?.gym_id }
  }
  if (role === 'trainer') {
    const { data, error } = await client
      .from('trainer_profiles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw error
    return { role, complete: !!data }
  }
  if (role === 'staff') {
    const { data, error } = await client
      .from('gym_staff')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle()
    if (error) throw error
    return { role, complete: !!data }
  }

  return { role, complete: false }
}

export function getAuthRedirectPath({ role, complete }) {
  if (!complete) {
    if (role === 'gym_owner') return '/gym-onboarding'
    if (role === 'trainer') return '/become-trainer'
    if (role === 'staff') return '/stagv-onboarding'
    if (!role) return '/role-select'
    return '/onboarding'
  }

  if (role === 'gym_owner') return '/gym/dashboard'
  if (role === 'trainer') return '/trainer/dashboard'
  if (role === 'staff') return '/staff/dashboard'
  return '/home'
}

export async function resolveAuthenticatedRedirect(user, client) {
  const { profile, created } = await ensureApplicationProfile(user, client)
  const completion = await getProfileCompletion(profile, user.id, client)
  return {
    created,
    profile,
    ...completion,
    path: getAuthRedirectPath(completion),
  }
}
