import { useEffect, useState, useCallback } from "react"
import { Navigation } from "@/components/custom/navigation"
import { Home } from "@/components/custom/home-form"
import { Login } from "@/components/custom/login-form"
import { Graph } from "@/components/custom/graph-form"
import { Chat } from "@/components/custom/chat-form"
import { Register } from "@/components/custom/register-form"

type Message = {
  action: string,
  data: {
    url: string,
    text: string,
  }
}

export function App() {


  const [currentView, setCurrentView] = useState("home")
  const [currentUrl, setCurrentUrl] = useState("")

  const setCurrentViewState = async (view: string) => {
    await chrome.storage.local.set({"view": view})
    setCurrentView(view)
  }

  const getCurrentViewState = useCallback(async () => {
    const view = await chrome.storage.local.get(["view"])
    if(typeof view.view === "string"){
      return view.view
    }
    return "home"
  }, [])

  useEffect(() => {
    const initializeView = async () => {
      try {
        const view: string = await getCurrentViewState()
        if(view){
          setCurrentView(view)
        }
      } catch(error){
        console.error("Failed to get view from chrome storage: ", error)
      }
    }
    initializeView()
  }, [])

  useEffect(() => {
    chrome.runtime.sendMessage({ action: "REQUEST_DATA"}, (response) => {
      if(response && response.text){
        setCurrentUrl(response.url)
      }
    })

    const handleRuntimeMessages = (message: Message) => {
      if(message.action === "NEW_SITE_DATA"){
        setCurrentUrl(message.data.url)
      }
    }

    chrome.runtime.onMessage.addListener(handleRuntimeMessages)
    return () => {
      chrome.runtime.onMessage.removeListener(handleRuntimeMessages)
    }

  }, [])

  const renderView = () => {
    switch (currentView){
      case "home":
        return (
          <Home />
        )

        case "login":
          return (
            <Login setCurrentView={setCurrentViewState} />
          )
        
        case "register":
          return (
            <Register setCurrentView={setCurrentViewState} />
          )

        case "graph":
          return (
            <Graph currentUrl={currentUrl} />
          )

        case "chat":
          return (
            <Chat currentUrl={currentUrl} />
          )


      default:
        return null
    }
  }

  return (
  <main>
    <Navigation 
      currentView={currentView}
      setCurrentView={setCurrentViewState}
    />
    <section className="flex-1 p-4">
      {renderView()}
    </section>

   
  </main>)
}


