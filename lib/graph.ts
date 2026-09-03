import { API_BASE_URL, ensureCSRFToken, getAuthHeaders } from "./client"
import { Sitedata, GraphNode, GraphLink, SSEChunkGraph, GraphResponse, GraphWebsite, GraphFocus } from "./types"

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
                scores: [],
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

                if(parsed.type === "graph"){
                    return {
                        nodes: parsed.nodes ?? [],
                        links: parsed.links ?? [],
                        scores: parsed.scores ?? [],
                        snapshot: true,
                        done: false,
                    }
                }
       
                if(parsed.type === "nodes"){
                    return {
                        nodes: parsed["nodes"],
                        links: [],
                        scores: [],
                        done: false,
                    }
                }

                if(parsed.type === "links"){
                    return {
                        nodes: [],
                        links: parsed["links"],
                        scores: [],
                        done: false,
                    }
                }

                if(parsed.type === "scores"){
                    return {
                        nodes: [],
                        links: [],
                        scores: parsed["scores"],
                        done: false
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
            scores: [],
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

        if(!response.ok) {
            throw new Error(response.statusText)
        }

        const data =  await response.json() as Partial<GraphResponse>

        return {
            nodes: data.nodes ?? [],
            links: data.links ?? [],
            scores: data.scores ?? [],
        }

    } catch(error){
        throw new Error("Requesting graph failed:" + error)
    }
}


export async function requestAddNode(node: GraphNode, website: Sitedata){
    await ensureCSRFToken()
    const headers = await getAuthHeaders()
    const params = new URLSearchParams({ url: website.url })
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/web/entities/?${params.toString()}`, {
            method: "POST",
            headers: headers,
            credentials: "include",
            body: JSON.stringify({node: node, website: website})
        })
    
        return await response.json() as GraphNode
        
    } catch(error){
        throw new Error("Adding node Request failed:" + error)
    }
}

export async function requestDeleteNode(node: GraphNode, website: Sitedata) {
    await ensureCSRFToken()
    const headers = await getAuthHeaders()
    const params = new URLSearchParams({ url: website.url })
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/web/entities/${node.id}/?${params.toString()}`, {
            method: "DELETE",
            headers: headers,
            credentials: "include",
        })

        if(!response.ok){
            throw new Error(response.statusText)
        }

        return await response.json() as { entity: string, relations: string[]}

    } catch(error){
        throw new Error("Requesting deletion of node failed:" + error)
    }
}

export async function requestUpdateNode(node: GraphNode, website: Sitedata) {
    await ensureCSRFToken()
    const headers = await getAuthHeaders()
    const params = new URLSearchParams({ url: website.url })
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/web/entities/${node.id}/?${params.toString()}`, {
            method: "PATCH",
            headers: headers,
            credentials: "include",
            body: JSON.stringify({entity_name: node.caption, entity_type: node.label})
        })

        if(!response.ok){
            throw new Error(response.statusText)
        }

        const data = await response.json() as GraphNode
        return {...data, id: String(data.id)}
    } catch(error){
        throw new Error("Requesting updating of node failed:" + error)
    }
}

export async function requestMergeNodes(sourceNode: GraphNode, targetNode: GraphNode, website: Sitedata){
    await ensureCSRFToken()
    const headers = await getAuthHeaders()
    const params = new URLSearchParams({ url: website.url })
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/web/entities/merge/?${params.toString()}`, {
            method: "POST",
            headers: headers,
            credentials: "include",
            body: JSON.stringify({"source_id": sourceNode.id, "target_id": targetNode.id})
        })

        if(!response.ok){
            throw new Error(response.statusText)
        }

        return await response.json() as { merged: GraphNode, deleted_relations: GraphLink[], updated_relations: GraphLink[]}
    } catch(error){
        throw new Error("Requesting merging of nodes failed:" + error)
    }
}

export async function requestAddLink(link: GraphLink, website: Sitedata){
    await ensureCSRFToken()
    const headers = await getAuthHeaders()
    const params = new URLSearchParams({ url: website.url })
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/web/relations/?${params.toString()}`, {
            method: 'POST',
            headers: headers,
            credentials: 'include',
            body: JSON.stringify(link)
        })

        if(!response.ok){
            throw new Error(response.statusText)
        }
    
        return await response.json() as GraphLink
    
    } catch(error){
        throw new Error("Adding Link Request failed:" + error)
    }
}

export async function requestUpdateLink(link: GraphLink, website: Sitedata){
    await ensureCSRFToken()
    const headers = await getAuthHeaders()
    const params = new URLSearchParams({ url: website.url })
    try {
        console.log(link)
        const response = await fetch(`${API_BASE_URL}/api/v1/web/relations/${link.id}/?${params.toString()}`, {
            method: 'PATCH',
            headers: headers,
            credentials: 'include',
            body: JSON.stringify(link)
        })

        if(!response.ok){
            throw new Error(response.statusText)
        }

        return await response.json() as {'updated_relations': GraphLink[], 'deleted_relations': GraphLink[]}
    } catch(error){
        throw new Error("Updating Link Request failed:" + error)
    }
}

export async function requestWebsites(){
    await ensureCSRFToken()
    const headers = await getAuthHeaders()

    const response = await fetch(`${API_BASE_URL}/api/v1/web/websites/`, {
        method: 'GET',
        headers: headers,
        credentials: 'include',
    })

    if(!response.ok){
        throw new Error(response.statusText)
    }

    return await response.json() as GraphWebsite[]
}

export async function requestFocus(websiteIds: string[]){
    if(websiteIds.length === 0){
        return { website_ids: [], tfidf: {} }
    }

    await ensureCSRFToken()
    const headers = await getAuthHeaders()
    const params = new URLSearchParams( { focus: websiteIds.join(",") })

    const response = await fetch(`${API_BASE_URL}/api/v1/graph/focus?${params.toString()}`, {
        method: 'GET',
        headers: headers,
        credentials: 'include',
    })

    if(!response.ok){
        throw new Error(response.statusText)
    }

    const data = await response.json() as Partial<GraphFocus>
    return { website_ids: data.website_ids ?? [], tfidf: data.tfidf ?? {} }
}