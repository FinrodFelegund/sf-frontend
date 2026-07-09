import { API_BASE_URL, ensureCSRFToken, getAuthHeaders } from "./client";

export async function fetchChatHistory(){
    await ensureCSRFToken()
    const headers = await getAuthHeaders()

    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/chat/history/`, {
            method: 'POST',
            headers: headers,
            credentials: 'include',
        })

        const chatHistoryResponse = await response.json()
        return chatHistoryResponse
    } catch(error){
        throw new Error("Fetching chat history failed:" + error)
    }
}

export async function fetchChatHistoryByUrl(url: string){
    await ensureCSRFToken()
    const headers = await getAuthHeaders()

    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/chat/history/`, {
            method: 'POST',
            headers: headers,
            credentials: 'include',
            body: JSON.stringify({url: url})
        })

        const chatHistoryResponse = await response.json()
        return chatHistoryResponse
    } catch(error){
        throw new Error("Fetching chat history by url failed:" + error)
    }
}

export async function deleteChatHistory(id: string){
    console.log(id)
}