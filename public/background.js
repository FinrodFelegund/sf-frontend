let lastProcessedTabId = null
let lastProcessedUrl = ""
let lastWebTabId = null

const isWebUrl = (url) => !!url && /^https?:/.test(url)

async function rememberWebTab(tabId){
    try {
        const tab = await chrome.tabs.get(tabId)
        if(isWebUrl(tab?.url)){
            lastWebTabId = tabId
        }
    } catch {}
}

async function resolveTargetTab(){
    if(lastWebTabId != null){
        try {
            const tab = await chrome.tabs.get(lastWebTabId)
            if(isWebUrl(tab?.url)){
                return tab
            }
        } catch {
            lastWebTabId = null
        }
    }

    const [active] = await chrome.tabs.query({ active: true, currentWindow: true })
    if(isWebUrl(active?.url)){
        return active
    }

    const tabs = await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] })
    tabs.sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0))
    return tabs[0] ?? null
}

async function ensureContentScript(tabId){
    try {
        await chrome.tabs.sendMessage(tabId, {action: "PING"})
        return true
    } catch {
        try {
            await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] })
            return true
        } catch {
            return false      // chrome://, the web store, PDF viewer — nothing to do
        }
    }
}

async function openAppTab(){
    const pattern = chrome.runtime.getURL("index.html*")
    const existing = await chrome.tabs.query({ url: pattern })
    const open = existing.find(t => t.url?.includes("view=tab"))

    if(open?.id){
        await chrome.tabs.update(open.id, {active: true})
        await chrome.windows.update(open.windowId, { focused: true})
        return
    }
    await chrome.tabs.create({ url: chrome.runtime.getURL("index.html?view=tab")})
}


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
                console.warn("Content script unreachable:", chrome.runtime.lastError.message)
                return
            }

            if(response){
                chrome.runtime.sendMessage({
                    action: "NEW_SITE_DATA",
                    data: {
                        url: response.data.url,
                        text: response.data.text,
                    }
                }).catch(() => {})
            }
        })
    })
}

//switch to new tab
chrome.tabs.onActivated.addListener(({tabId}) => {
    rememberWebTab(tabId)
    handleSiteChange(tabId)
})

//new url inside current tab
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if(changeInfo.status === "complete" && tab.active){
        rememberWebTab(tabId)
        handleSiteChange(tabId)
    }
})

chrome.tabs.onRemoved.addListener((tabId) => {
    if(lastWebTabId === tabId){
        lastWebTabId = null
    }
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if(message.action === "REQUEST_DATA"){
        (async () => {
            const tab = await resolveTargetTab()
            if(!tab?.id || !(await ensureContentScript(tab.id))) return sendResponse(null)

            chrome.tabs.sendMessage(tab.id, { action: "EXTRACT_TEXT" }, (response) => {
                sendResponse(chrome.runtime.lastError ? null : response)
            })
        })()
        return true
    }

    // UI page (panel or tab) → the page the user is reading
    if(message.action === "RELAY_TO_PAGE"){
        (async () => {
            const tab = await resolveTargetTab()
            if(!tab?.id || !(await ensureContentScript(tab.id))) return sendResponse({ ok: false })

            chrome.tabs.sendMessage(tab.id, message.payload, () => {
                sendResponse({ ok: !chrome.runtime.lastError })
            })
        })()
        return true
    }

    if(message.action === "OPEN_IN_TAB"){
        openAppTab()
            .then(() => sendResponse({ ok: true}))
            .catch((error) => sendResponse({ ok: false, error: String(error)}))
        return true
    }
})


chrome.runtime.onInstalled.addListener(async () => {
    const tabs = await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] })
    for (const tab of tabs) {
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["content.js"],
        }).catch(() => {}) // some tabs (chrome://, web store) will refuse; fine
    }
})