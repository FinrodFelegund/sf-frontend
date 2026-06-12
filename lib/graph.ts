import { API_BASE_URL, ensureCSRFToken, getAuthHeaders } from "./client"
import { GraphResponse, Sitedata } from "./types"

export async function request_graph(sitedata: Sitedata){
    await ensureCSRFToken()
    const headers = await getAuthHeaders()

    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/graph/`, {
            method: 'POST',
            headers: headers,
            credentials: 'include',
            body: JSON.stringify(sitedata),
        })

        const graphResponse = await response.json() as GraphResponse
        return graphResponse
    } catch(error){
        throw new Error("Graph Request failed:" + error)
    }
}