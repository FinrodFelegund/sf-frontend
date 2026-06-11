import type { LoginRequest, User, RegisterRequest, UnlockRequest } from "./types";
import { API_BASE_URL, ensureCSRFToken, getCookie } from "./client";

export async function setUser(user: User){
    await chrome.storage.local.set({"user": JSON.stringify(user)})
}

export async function getUser(){
    const result =  await chrome.storage.local.get(["user"])
    return result ? result.user as User : null
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

export async function login(credentials: LoginRequest): Promise<void> {
    await ensureCSRFToken()
    const cookie = await getCookie()

    try {

        const response = await fetch(`${API_BASE_URL}/api/v1/auth/login/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(cookie ? { 'x-CSRFToken':  cookie! } : {})
            },
            credentials: 'include',
            body: JSON.stringify(credentials),
        });

        const user = await response.json() as User;
        if(user.token){
            await setAuthToken(user.token);
        }
        await setUser(user);
    } catch(error){
        throw new Error('Login failed:' + error);
    }
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

export async function register(credentials: RegisterRequest): Promise<Array<number>> {
    await ensureCSRFToken()
    const cookie = await getCookie()

    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/register/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(cookie ? { 'x-CSRFToken':  cookie! } : {})
            },
            credentials: 'include',
            body: JSON.stringify(credentials),
        })

        const registerResponse = await response.json() as UnlockRequest
        return registerResponse.unlockcode
        
    } catch(error){
        throw new Error("Failed to register user: " + error)
    }

}