export const UNAUTHORIZED_EVENT = "storyfinder:unauthorized"

export class ApiError extends Error {
    status: number
    constructor(status: number, message: string){
        super(message)
        this.name = "ApiError"
        this.status = status
    }
}

export async function getAPIBaseUrl(){
    const url = await chrome.storage.local.get(["serverurl"])
    if(url && typeof url.serverurl === "string"){
        return url.serverurl
    }

    return "http://localhost:8000"
}

export async function assertAuthorized(response: Response){
    if(response.status === 401 || response.status === 403){
        await chrome.storage.local.remove(["auth_token", "user"])
        if(typeof window !== "undefined"){
            window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT))
        }
        throw new ApiError(response.status, "Not authenticated")
    }

    return response
}

export const isAuthError = (error: unknown) => {
    return error instanceof ApiError && (error.status === 401 || error.status === 403)
}

export async function getCookie(): Promise<string | null>{
    const api_base_url = await getAPIBaseUrl()
    try {
        const cookie = await chrome.cookies.get({
            url: api_base_url,
            name: 'csrftoken',
        })

        return cookie ? cookie.value : null
    } catch(error){
        console.error("Could not read error: ", error)
        return null
    }
}

export async function ensureCSRFToken(): Promise<void> {
    const api_base_url = await getAPIBaseUrl()
    const cookie = await getCookie()
    if(!cookie){
        const response = await fetch(`${api_base_url}/api/v1/csrf/`, {
            method: 'GET',
            credentials: 'include',
        })

        if(!response.ok){
            throw new Error("could not ensure csrf token")
        }
    }
}

export async function getAuthHeaders(): Promise<HeadersInit> {
    const stored = (await chrome.storage.local.get(['auth_token']))
    const token = stored.auth_token
    const csrfToken = await getCookie()
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Token ${token}` } : {}),
        ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {})
    }
}

export async function apiFetch(path: string, init: RequestInit = {}) {
    const api_base_url = await getAPIBaseUrl()
    await ensureCSRFToken()
    const headers = await getAuthHeaders()

    const response = await fetch(`${api_base_url}${path}`, {
        ...init,
        headers: {...headers, ...(init.headers ?? {}) },
        credentials: "include",
    })

    await assertAuthorized(response)

    if(!response.ok){
        throw new ApiError(response.status, response.statusText)
    }

    return response
}

export async function apiJson<T>(path: string, init: RequestInit = {}){
    return await (await apiFetch(path, init)).json() as T
}