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
    }
})