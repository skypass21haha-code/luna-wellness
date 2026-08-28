export type AuthUrlError = {
  code: string
  message: string
}

let callbackHandled = false
let consumedAuthUrlError: AuthUrlError | null = null

export function getAuthRedirectUrl() {
  const configuredOrigin = import.meta.env.VITE_APP_URL?.trim()
  const origin = configuredOrigin || window.location.origin
  return `${origin.replace(/\/$/, '')}/`
}

function decodeAuthMessage(value: string | null) {
  return value ? value.replace(/\+/g, ' ') : ''
}

export function consumeAuthUrlError(): AuthUrlError | null {
  if (callbackHandled) return consumedAuthUrlError
  callbackHandled = true

  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const query = new URLSearchParams(window.location.search)
  const code = hash.get('error_code') || query.get('error_code') || hash.get('error') || query.get('error')
  const description = decodeAuthMessage(hash.get('error_description') || query.get('error_description'))

  if (!code && !description) return null

  const cleanQuery = new URLSearchParams(window.location.search)
  cleanQuery.delete('error')
  cleanQuery.delete('error_code')
  cleanQuery.delete('error_description')
  const queryString = cleanQuery.toString()
  window.history.replaceState({}, document.title, `${window.location.pathname}${queryString ? `?${queryString}` : ''}`)
  consumedAuthUrlError = {
    code: code || 'auth_error',
    message: description || 'We could not complete that authentication request.',
  }
  return consumedAuthUrlError
}

export function friendlyAuthError(error: AuthUrlError) {
  if (error.code === 'otp_expired' || error.code === 'access_denied' || /expired|invalid|already been used/i.test(error.message)) {
    return 'Your confirmation link has expired or has already been used.'
  }
  return 'That authentication link could not be completed. Please request a new one and try again.'
}
