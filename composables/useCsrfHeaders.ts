const csrfCookieName = 'practicum_csrf'

export function useCsrfHeaders(headers: Record<string, string> = {}) {
  const csrfToken = useCookie(csrfCookieName).value
  return { ...headers, 'x-csrf-token': csrfToken ?? '' }
}
