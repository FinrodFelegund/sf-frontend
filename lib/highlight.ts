
async function sendToPage(message: unknown){
    try {
        await chrome.runtime.sendMessage({ action: "RELAY_TO_PAGE", payload: message})
    } catch (error) {
        console.debug("Storyfinder: page unreachable", error)
    }
}

/*
async function sendToActiveTab(message: unknown) {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        if(!tab?.id){
            return
        }

        await chrome.tabs.sendMessage(tab.id, message)
    } catch (error){
        console.debug("Storyfinder: content script unreachable", error)
    }
}
*/

export const highlightSources = (quotes: string[]) =>
    sendToPage({ action: "HIGHLIGHT_SOURCES", quotes })

export const clearSourceHighlights = () =>
    sendToPage({ action: "CLEAR_HIGHLIGHTS" })
