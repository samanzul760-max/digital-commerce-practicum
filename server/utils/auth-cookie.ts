export function shouldUseSecureCookies(protocol: string | undefined) {
  return protocol?.toLowerCase() === 'https'
}
