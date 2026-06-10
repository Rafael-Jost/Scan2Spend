const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

export function authFetch(url, options = {}) {
    const token = localStorage.getItem('jwt')
    const headers = { ...options.headers }
    if (token) headers['Authorization'] = `Bearer ${token}`
    const fullUrl = API_BASE ? url.replace(/^\/api/, API_BASE) : url
    return fetch(fullUrl, { ...options, headers })
}
