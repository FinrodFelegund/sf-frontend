

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

export const highlightSources = (quotes: string[]) => 
    sendToActiveTab({ action: "HIGHLIGHT_SOURCES", quotes })

export const clearSourceHighlights = () =>
    sendToActiveTab({ action: "CLEAR_HIGHLIGHTS" })