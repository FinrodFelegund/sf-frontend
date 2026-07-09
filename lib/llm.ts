import { API_BASE_URL, ensureCSRFToken, getAuthHeaders } from "./client";
import { ChatMessage, type SSEChunk } from "./types";

function processEvent(event: string){

    return ""
}


export async function* fetchSSE(url: string, options: RequestInit): AsyncGenerator<SSEChunk>{
    
    const response = await fetch(url, options)
    if(!response.ok){
        throw new Error(response.statusText)
    }

    if(!response.body){
        throw new Error("Response body is null")
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let chatHistoryId: number | undefined = 0

    try {
        while(true){
            const { done, value } = await reader.read()

            if(done){
                break
            }

            buffer += decoder.decode(value, { stream: true})

            const normalizedBuffer = buffer.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
            const events = normalizedBuffer.split('\n\n')
            buffer = events.pop() || ""


            for (const event of events){
                yield { content: processEvent(event), chat_history_id: chatHistoryId, done: false}
            }
            
        }
    } catch(error){
        throw new Error("Error streaming LLM response:" + error)
    } finally {
        reader.releaseLock()
    }
}


export async function* sendChatStream(message: ChatMessage): AsyncGenerator<SSEChunk>{
    await ensureCSRFToken()
    const headers = await getAuthHeaders()

    yield* fetchSSE(`${API_BASE_URL}/api/v1/chat/stream/`, {
        method: 'POST',
        headers: headers,
        credentials: 'include',
        body: JSON.stringify(message)
    })
}