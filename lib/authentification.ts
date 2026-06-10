import type { LoginRequest, User } from "./types";
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
    console.log("Hello from login")
    await ensureCSRFToken()
    console.log("Ensured csrf")
    const cookie = await getCookie()

    const response = await fetch(`${API_BASE_URL}/api/v1/auth/login/`, {
        'method': 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(cookie ? { 'x-CSRFToken':  cookie! } : {})
        },
        credentials: 'include',
        body: JSON.stringify(credentials),
    });

    console.log(response)

    if(!response.ok){
        throw new Error('Login failed');
    }

    const user = await response.json() as User;
    

    if(user.token){
        await setAuthToken(user.token);
    }
    await setUser(user);
}

export async function logout(): Promise<void> {
    const token = await getAuthToken()
    const cookie = await getCookie()

    console.log(token)
    console.log(cookie)

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
        console.error("Logout failed: ", error)
    }

    await removeAuthToken()
    await removeUser()
}