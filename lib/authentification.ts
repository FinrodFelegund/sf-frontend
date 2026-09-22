import type { LoginRequest, User, RegisterRequest, UnlockRequest } from "./types";
import { API_BASE_URL, ensureCSRFToken, getCookie } from "./client";

export class AuthError extends Error {
    status: number
    constructor(status: number, message: string){
        super(message)
        this.name = "AuthError"
        this.status = status
    }
}

function drfMessage(body: unknown, fallback: string): string {
    if(!body || typeof body !== "object"){
        return fallback
    }
    const b = body as Record<string, unknown>

    for(const key of ["detail", "non_field_errors", "username", "password"]){
        const value = b[key]
        if(typeof value === "string") return value
        if(Array.isArray(value) && typeof value[0] === "string") return value[0]
    }
    return fallback
}

export async function setUser(user: User){
    await chrome.storage.local.set({"user": JSON.stringify(user)})
}

export async function getUser(){
    const result =  await chrome.storage.local.get(["user"])
    if(!result?.user){
        return null
    }
    try {
        return typeof result.user === "string"
            ? JSON.parse(result.user) as User
            : result.user as User
    } catch {
        return null
    }
}

export async function removeUser(){
    chrome.storage.local.remove('user')
}


export async function setAuthToken(token: string){
    await chrome.storage.local.set({'auth_token': token})
}

export async function getAuthToken(){
    const token = await chrome.storage.local.get('auth_token')
    return token ? token.auth_token : null
}

export async function removeAuthToken(){
    await chrome.storage.local.remove('auth_token')
}

export async function login(credentials: LoginRequest): Promise<User> {
    await ensureCSRFToken()
    const cookie = await getCookie()

    let response: Response
    try {
        response = await fetch(`${API_BASE_URL}/api/v1/auth/login/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(cookie ? { 'X-CSRFToken': cookie } : {})
            },
            credentials: 'include',
            body: JSON.stringify(credentials),
        })
    } catch {
        throw new AuthError(0, "Could not reach the server.")
    }

    let body: unknown = null
    try { body = await response.json() } catch { }

    if(!response.ok){
        throw new AuthError(response.status, drfMessage(
            body,
            response.status === 429
                ? "Too many attempts. Please wait a moment and try again."
                : "Login failed."
        ))
    }

    const user = body as User
    if(!user?.token){
        throw new AuthError(response.status, "Login failed.")
    }

    await setAuthToken(user.token)
    await setUser(user)
    return user
}
export async function logout(): Promise<void> {
    const token = await getAuthToken()
    const cookie = await getCookie()


    try {
        await fetch(`${API_BASE_URL}/api/v1/auth/logout/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Token ${token}` } : {}),
                ...(cookie ? { 'X-CSRFToken': cookie! } : {} )
            },
            credentials: 'include'
        })
    } catch(error){
        throw new Error("Logout failed: " + error)
    }

    await removeAuthToken()
    await removeUser()
}

export async function register(credentials: RegisterRequest): Promise<UnlockRequest> {
    await ensureCSRFToken()
    const cockie = await getCookie()

    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/registration/register/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(cockie ? { 'x-CSRFToken':  cockie! } : {})
            },
            credentials: 'include',
            body: JSON.stringify(credentials),
        })

        if(!response.ok){
            throw new Error("Register failed: " + response.statusText)
        }

        const registerResponse = await response.json() as UnlockRequest

        return registerResponse
        
    } catch(error){
        throw new Error("Failed to fetch: " + error)
    }

}

export async function unlock(id: string): Promise<String> {
    await ensureCSRFToken()
    const cockie = await getCookie()

    try {
        
        const response = await fetch(`${API_BASE_URL}/api/v1/registration/unlock/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(cockie ? { 'x-CSRFToken':  cockie! } : {})
            },
            credentials: 'include',
            body: JSON.stringify({"id": id}),
        })
    
        if(!response.ok){
            throw new Error("Failed to unlock: " + response.statusText)
        }

        const data = await response.json()
        return data.detail

    } catch(error){
        throw new Error("Failed to fetch:" + error)
    }

}