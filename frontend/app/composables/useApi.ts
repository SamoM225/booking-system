/** Thin $fetch wrapper for the backend (proxied through /backend, see nuxt.config.ts). */
export function useApi() {
  const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
  return <T>(path: string, options: Parameters<typeof $fetch>[1] = {}) =>
    $fetch<T>(`/backend${path}`, { credentials: 'include', headers, ...options } as never)
}

/** Message from a backend `{ message }` response, or a fallback. */
export function apiErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.') {
  const message = (error as { data?: { message?: string } })?.data?.message
  return message || fallback
}
