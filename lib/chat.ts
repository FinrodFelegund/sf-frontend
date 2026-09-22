import { apiJson } from "./client";
import type { ChatHistory } from "./types";


export async function fetchChatHistory(){
    return await apiJson<ChatHistory>("/api/v1/chat/history/", { method: 'POST' })
}

export async function fetchChatHistoryByUrl(url: string){
    return await apiJson<ChatHistory>("/api/v1/chat/history/", {
        method: 'POST',
        body: JSON.stringify({ url }),
    })
}

export async function deleteChatHistory(id: string){
    console.log(id)
}