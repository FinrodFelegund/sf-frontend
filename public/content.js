const HIGHLIGHT_NAME = "storyfinder-source"
let styleInjected = false

function injectHighlightStyle(){
    if(styleInjected){
        return
    }

    const style = document.createElement("style")
    style.textContent = 
        "::highlight(" + HIGHLIGHT_NAME + "){" +
        "background-color: rgba(250, 204, 21, 0.45);" +
        "color: inherit;" +
        "}"

    document.head.appendChild(style)
    styleInjected = true
}

function buildTextIndex(){
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode(node){
            const parent = node.parentElement
            if(!parent){
                return NodeFilter.FILTER_REJECT
            }

            const tag = parent.tagName
            if(tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT"){
                return NodeFilter.FILTER_REJECT
            }

            if(!node.nodeValue || !node.nodeValue.trim()){
                return NodeFilter.FILTER_REJECT
            }

            return NodeFilter.FILTER_ACCEPT
        }
    })

    let haystack = ""
    const map = []
    let node

    while((node = walker.nextNode())){
        const raw = node.nodeValue
        for(let i = 0; i < raw.length; i++){
            const isSpace = /\s/.test(raw[i])
            if(isSpace && haystack.endsWith(" ")){
                continue
            }
            map.push({ node: node, offset: i})
            haystack += isSpace ? " " : raw[i].toLocaleLowerCase()
        }

        if(!haystack.endsWith(" ")){
            map.push({ node: node, offset: raw.length })
            haystack += " "
        }
    }

    return { haystack: haystack, map: map}
}

function rangeFor(index, length, map){
    const startEntry = map[index]
    const endEntry = map[index + length - 1]
    if(!startEntry || !endEntry){
        return null
    }

    const range = document.createRange()
    try {
        range.setStart(startEntry.node, startEntry.offset)
        range.setEnd(endEntry.node, Math.min(endEntry.offset + 1, endEntry.node.nodeValue.length))
    } catch {
        return null
    }
    return range
}

function clearHighlights(){
    if(CSS.highlights){
        CSS.highlights.delete(HIGHLIGHT_NAME)
    }
}

function highlightQuotes(quotes){
    console.log("Highligting")
    if(!CSS.highlights){
        return { matched: 0, supported: false}
    }

    clearHighlights()
    injectHighlightStyle()

    const index = buildTextIndex()
    const ranges = []

    for(const quote of quotes || []){
        const needle = String(quote).replace(/\s+/g, " ").trim().toLocaleLowerCase()
        if(needle.length < 15){
            continue
        }

        let from = 0
        while(true){
            const at = index.haystack.indexOf(needle, from)
            if(at === -1){
                break
            }

            const range = rangeFor(at, needle.length, index.map)
            if(range){
                ranges.push(range)
            }
            from = at + needle.length
        }
    }

    if (ranges.length){
        CSS.highlights.set(HIGHLIGHT_NAME, new Highlight(...ranges))
    }

    return { matched: ranges.length, supported: true}
}

function getPageText(){
    return document.documentElement.outerHTML || ""
}


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if(request.action === "EXTRACT_TEXT"){
        sendResponse({
            data: {
                text: getPageText(),
                url: window.location.href,
            }
        })
        return
    }

    if(request.action === "HIGHLIGHT_SOURCES"){
        sendResponse(highlightQuotes(request.quotes))
        return
    }

    if(request.action === "CLEAR_HIGHLIGHTS"){
        clearHighlights()
        sendResponse({ cleared: true})
        return
    }
})