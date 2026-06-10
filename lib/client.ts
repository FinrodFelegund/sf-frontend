export const API_BASE_URL = "http://localhost:8000"//process.env.NEXT_PUBLIC_BACKEND_URL ?? ""

export async function getCookie(): Promise<string | null>{
    try {
        const cookie = await chrome.cookies.get({
            url: API_BASE_URL,
            name: 'csrftoken',
        })

        return cookie ? cookie.value : null
    } catch(error){
        console.error("Could not read error: ", error)
        return null
    }
}

export async function ensureCSRFToken(): Promise<void> {
    console.log("Base url: ", API_BASE_URL)
    const cookie = await getCookie()
    if(!cookie){
        const response = await fetch(`${API_BASE_URL}/api/v1/csrf/`, {
            method: 'GET',
            credentials: 'include',
        })

        if(!response.ok){
            throw new Error("could not ensure csrf token")
        }
    }
}

export async function getAuthHeaders(): Promise<HeadersInit> {
    const token = await chrome.storage.local.get(['auth_token'])
    const csrfToken = await getCookie()
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Token ${token}` } : {}),
        ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {})
    }
}