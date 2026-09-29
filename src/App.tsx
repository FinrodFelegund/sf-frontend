
import { useEffect, useState, useCallback } from "react"
import { Navigation } from "@/components/custom/navigation"
import { Home } from "@/components/custom/home-form"
import { Login } from "@/components/custom/login-form"
import { Graph } from "@/components/custom/graph-form"
import { Chat } from "@/components/custom/chat-form"
import { Register } from "@/components/custom/register-form"
import type { Sitedata, RuntimeMessage } from "@/lib/types" 
import { useLanguage } from "@/hooks/language-hook"
import { useAuth } from "@/hooks/authentication-hook"


export function App() {
  
  const [currentView, setCurrentView] = useState("home")
  const [currentGraph, setCurrentGraph] = useState("global")
  const [currentSite, setCurrentSite] = useState<Sitedata | null>(null)
  const { t } = useLanguage()
  const { isAuthenticated, isReady } = useAuth()

  const PUBLIC_VIEWS = ["home", "login", "register"]


  const setCurrentViewState = async (view: string) => {
    await chrome.storage.local.set({"view": view})
    setCurrentView(view)
  }

  useEffect(() => {
    chrome.storage.local.get(["graphtype"]).then((result) => {
      if(result.graphtype === "local" || result.graphtype === "global"){
        setCurrentGraph(result.graphtype)
      }
    })
  }, [])

  useEffect(() => {
    if(!isReady){
      return
    }
    if(isAuthenticated){
      return
    }
    if(PUBLIC_VIEWS.includes(currentView)){
      return
    }

    setCurrentViewState("home")
  }, [isAuthenticated, isReady, currentView])

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
      if(response){
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
            <Graph currentSite={currentSite ? currentSite : null} graphType={currentGraph} />
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
        currentGraph={currentGraph}
        setCurrentView={setCurrentViewState}
        setCurrentGraph={setCurrentGraph}
        currentUrl={currentSite ? currentSite.url : "no url provided"}
      />
      <section className="flex-1 p-4">
        {isReady ? renderView() : null}
      </section>
    </main>
  )

/*  return (
    <img
      src={formally}
      alt={"Formally"}
      className="h-full w-full object-cover"
    >
    
    </img>
  )
*/
}


