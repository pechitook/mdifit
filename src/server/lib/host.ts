const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]'])

/**
 * The server only answers requests addressed to a loopback name. A page on
 * another site that rebinds its DNS to 127.0.0.1 sends its own hostname in
 * `Host` and gets refused, so it cannot read the workspace.
 */
export function isAllowedHost(host: string | undefined): boolean {
  if (!host) return false
  const hostname = host.startsWith('[') ? host.slice(0, host.indexOf(']') + 1) : host.split(':')[0]
  return hostname !== undefined && LOCAL_HOSTNAMES.has(hostname.toLowerCase())
}
