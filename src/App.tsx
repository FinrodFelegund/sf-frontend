import { useEffect, useState, useCallback } from "react"
import { Navigation } from "@/components/custom/navigation"
import { Home } from "@/components/custom/home-form"
import { Login } from "@/components/custom/login-form"
import { Graph } from "@/components/custom/graph-form"
import { Chat } from "@/components/custom/chat-form"
import { Register } from "@/components/custom/register-form"
import type { Sitedata, RuntimeMessage } from "@/lib/types" 
import { useLanguage } from "@/hooks/language-hook"



export function App() {


  const [currentView, setCurrentView] = useState("home")
  const [currentSite, setCurrentSite] = useState<Sitedata | null>(null)
  const { t } = useLanguage()

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
        setCurrentSite(response.data)
      }
    })

    const handleRuntimeMessages = (message: RuntimeMessage) => {
      if(message.action === "NEW_SITE_DATA"){
        setCurrentSite(message.data)
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
            <Graph currentSite={currentSite ? currentSite : null} />
          )

        case "chat":
          return (
            <Chat currentSite= {currentSite ? currentSite : {"url": "", "text": ""}} initialMessages={[{
              chat_message_id: "welcome-message",
              role: "assistant",
              content: t("chat.initial-message"),
              timestamp: new Date()
            }]} />
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
    </main>
  )
}


