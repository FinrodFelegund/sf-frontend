import { API_BASE_URL, ensureCSRFToken, getAuthHeaders } from "./client"
import { Sitedata, GraphNode, GraphLink, SSEChunkGraph, GraphResponse } from "./types"

export async function* fetchSEE(url: string, options: RequestInit){
    const response = await fetch(url, options)
    if(!response.ok){
        throw new Error(response.statusText)
    }

    if(!response.body){
        throw new Error("Response body is null")
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""

    const processEvent = (rawEvent: string): SSEChunkGraph | null => {
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
                nodes: [],
                links: [],
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
       
                if(parsed.type === "nodes"){
                    return {
                        nodes: parsed["nodes"],
                        links: [],
                        done: false,
                    }
                }

                if(parsed.type === "links"){
                    return {
                        nodes: [],
                        links: parsed["links"],
                        done: false,
                    }
                }

                return null;
            } catch {
                // If it's not valid JSON content, fall through and treat it as text
            }
        }

        return {
            nodes: [],
            links: [],
            done: false,
        }
    }
    try {
        while(true){
            const { done, value } = await reader.read()

            if(done){
                break
            }
            buffer += decoder.decode(value, { stream: true })
            const normalizedBuffer = buffer.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
            const events = normalizedBuffer.split("\n\n")
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
        throw new Error("Error streaming LLM Graph Response:" + error)
    } finally {
        reader.releaseLock()
    }
}

export async function* sendGraphStream(sitedata: Sitedata): AsyncGenerator<SSEChunkGraph>{
    await ensureCSRFToken()
    const headers = await getAuthHeaders()

    yield* fetchSEE(`${API_BASE_URL}/api/v1/graph`, {
        method: 'POST',
        headers: headers,
        credentials: 'include',
        body: JSON.stringify(sitedata),
    })

}

export async function requestGraph(sitedata: Sitedata){
    await ensureCSRFToken()
    const headers = await getAuthHeaders()
    const params = new URLSearchParams({url: sitedata.url, text: ""})

    try {
        const response = await fetch (`${API_BASE_URL}/api/v1/graph?${params.toString()}`, {
        method: 'GET',
        headers: headers,
        credentials: 'include',
    })

    return await response.json() as GraphResponse

    } catch(error){
        throw new Error("Requesting graph failed:" + error)
    }
}

export async function requestAddEntity(entity: GraphNode, website: Sitedata){
    await ensureCSRFToken()
    const headers = await getAuthHeaders()
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/web/entities`, {
            method: 'POST',
            headers: headers,
            credentials: 'include',
            body: JSON.stringify({entity: entity, website: website})
        })
    
        return await response.json() as GraphNode
        
    } catch(error){
        throw new Error("Adding node Request failed:" + error)
    }
}

export async function requestAddRelation(entity1: string, entity2: string, relation_type: string, website: Sitedata){
        await ensureCSRFToken()
    const headers = await getAuthHeaders()
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/entities`, {
            method: 'POST',
            headers: headers,
            credentials: 'include',
            body: JSON.stringify({entity1: entity1, entity2: entity2, relation_type: relation_type, website: website})
        })
    
        return await response.json() as GraphLink
    
    } catch(error){
        throw new Error("Adding node Request failed:" + error)
    }
}