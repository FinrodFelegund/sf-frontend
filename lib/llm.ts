import { API_BASE_URL, ensureCSRFToken, getAuthHeaders } from "./client";
import { ChatMessage, type SSEChunk } from "./types";


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

    const processEvent = (rawEvent: string): SSEChunk | null => {
        const event = rawEvent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

        const lines = event.split('\n');
        const dataLines: string[] = [];

        for (const line of lines) {
            if (line.startsWith('data:')) {
                dataLines.push(line.slice(5).replace(/^ /, ''));
            }
        }

        if (dataLines.length === 0) {
            return null;
        }

        const data = dataLines.join('\n');

        if (data === '[DONE]') {
            return {
                content: '',
                chat_history_id: chatHistoryId,
                done: true,
            };
        }

        if (!data) {
            return null;
        }

        let parsedData = data;

        if (parsedData.startsWith('"')) {
            try {
                parsedData = JSON.parse(parsedData);
            } catch {
                // keep original string
            }
        }

        if (parsedData.startsWith('{')) {
            try {
                const parsed = JSON.parse(parsedData);

                if (parsed.error) {
                    throw new Error(`Backend error: ${parsed.error}`);
                }

                if (parsed.chat_history_id) {
                    chatHistoryId = parsed.chat_history_id;
                }

                if (typeof parsed.content === 'string') {
                    return {
                        content: parsed.content,
                        chat_history_id: chatHistoryId,
                        done: false,
                    };
                }

                return null;
            } catch {
                // If it's not valid JSON content, fall through and treat it as text
            }
        }

        return {
            content: parsedData,
            chat_history_id: chatHistoryId,
            done: false,
        };
    };

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
                const result = processEvent(event)

                if(result){
                    yield result
                }

                if(result?.done){
                    return
                }
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