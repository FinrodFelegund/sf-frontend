let lastProcessedTabId = null
let lastProcessedUrl = ""


function handleSiteChange(tabId){
    chrome.tabs.get(tabId, (tab) => {
        if(!tab || !tab.url || (!tab.url.startsWith("http") && !tab.url.startsWith("https"))){
            return
        }

        if(tabId === lastProcessedTabId && tab.url === lastProcessedUrl){
            return
        }

        lastProcessedTabId = tabId
        lastProcessedUrl = tab.url

        chrome.tabs.sendMessage(tabId, { action: "EXTRACT_TEXT" }, (response) => {
            if(chrome.runtime.lastError){
                console.warn("Content scrpt unreachable:", chrome.runtime.lastError.message)
                return
            }

            if(response){
                chrome.runtime.sendMessage({
                    action: "NEW_SITE_DATA",
                    data: {
                        url: response.url,
                        text: response.text,
                    }
                }).catch(() => {})
            }
        })
    })
}

//switch to new tab
chrome.tabs.onActivated.addListener((activeInfo) => {
    handleSiteChange(activeInfo.tabId)
})

//new url inside current tab
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if(changeInfo.status === "complete" && tab.active){
        handleSiteChange(tabId)
    }
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if(message.action === "REQUEST_DATA"){
        chrome.tabs.query({ active: true, currentWindow: true}, (tabs) => {
            if(tabs[0] && tabs[0].id){
                chrome.tabs.sendMessage(tabs[0].id, { action: "EXTRACT_TEXT"}, (response) => {
                    //we are not inside any tab, maybe in chrome://extension
                    if(chrome.runtime.lastError){
                        sendResponse(null)
                    } else {
                        sendResponse(response)
                    }
                })
            } else {
                sendResponse(null)
            }
        })
        return true
    }
})