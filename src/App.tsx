import { useEffect, useState, useCallback } from "react"
import { Navigation } from "@/components/custom/navigation"
import { Home } from "@/components/custom/home-form"
import { Login } from "@/components/custom/login-form"

export function App() {


  const [currentView, setCurrentView] = useState("home")

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

  const renderView = () => {
    switch (currentView){
      case "home":
        return (
          <Home />
        )

        case "login":
          return (
            <Login setCurrentView={setCurrentViewState}/>
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


