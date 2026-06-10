function getPageText(){
    return document.body.innerText || ""
}


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if(request.action === "EXTRACT_TEXT"){
        sendResponse({
            text: getPageText(),
            url: window.location.href,
        })
    }
})