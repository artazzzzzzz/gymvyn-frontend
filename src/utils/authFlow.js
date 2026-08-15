import { supabase } from './supabase'
import {
  ensureApplicationProfile as ensureApplicationProfileCore,
  getProfileCompletion as getProfileCompletionCore,
  requestPasswordReset as requestPasswordResetCore,
  resolveAuthenticatedRedirect as resolveAuthenticatedRedirectCore,
  startOAuth as startOAuthCore,
} from './authFlowCore'
export {
  getAuthDisplayName,
  getAuthRedirectPath,
  getOAuthRedirectTo,
  getPasswordResetRedirectTo,
  OAUTH_CALLBACK_PATH,
  OAUTH_PROVIDERS,
  PASSWORD_RESET_PATH,
} from './authFlowCore'

export function startOAuth(provider, options = {}) {
  return startOAuthCore(provider, { client: supabase, ...options })
}

export function requestPasswordReset(email, options = {}) {
  return requestPasswordResetCore(email, { client: supabase, ...options })
}

export function ensureApplicationProfile(user, client = supabase) {
  return ensureApplicationProfileCore(user, client)
}

export function getProfileCompletion(profile, userId, client = supabase) {
  return getProfileCompletionCore(profile, userId, client)
}

export function resolveAuthenticatedRedirect(user, client = supabase) {
  return resolveAuthenticatedRedirectCore(user, client)
}
