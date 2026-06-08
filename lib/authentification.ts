import type { LoginRequest, User } from "./types";
import { API_BASE_URL } from "./client";

export async function setUser(user: User){
    await chrome.storage.local.set({"user": JSON.stringify(user)})
}

export async function getUser() : Promise<User | null> {
    const result =  await chrome.storage.local.get(["user"])
    const raw = result.user

    if(!raw){
        return null
    }

    if(typeof raw === "string"){

        try {
            const parsed: User = JSON.parse(raw)
            return parsed
        } catch {
            return null
        }
    }

    return raw as User
}

export async function removeUser(){
    chrome.storage.local.remove('user')
}


export async function setAuthToken(token: string){
    await chrome.storage.local.set({'auth_token': token})
}

export async function getAuthToken(){
    const token = await chrome.storage.local.get('auth_token')
    return token
}

export async function removeAuthToken(){
    await chrome.storage.local.remove('auth_token')
}

export async function login(credentials: LoginRequest): Promise<void> {
    credentials
    API_BASE_URL
    /*
    const response = await fetch(`${API_BASE_URL}/tbd/`, {
        'method': 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(credentials),
    });

    if(!response.ok){
        throw new Error('Login failed');
    }

    const user = await response.json() as User;
    */
   const user: User = {
    token: "test_token",
    user: {
            id: "1",
            username: "admin",
            email: "admin@sf.de",
            first_name: "admin",
            last_name: "user",
            is_active: false,
            date_joined: "01.05.2026",
            last_login: "01.05.2026"
        }
   }

    if(user.token){
        setAuthToken(user.token);
    }
    setUser(user);
}

export async function logout(): Promise<void> {
    await removeAuthToken()
    await removeUser()
}