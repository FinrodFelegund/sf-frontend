import { useEffect } from "react"
import { Button } from "../ui/button"
import { request_graph } from "@/lib/graph"
import { Sitedata } from "@/lib"
import { useLanguage } from "@/hooks/language-hook"

export function Graph({currentSite}: {currentSite: Sitedata | null}){
    //const [isLoading, setIsLoading] = useState(false)
    //const [source, setSource] = useState("http://localhost:8000")
    const { t } = useLanguage()

    useEffect(() => {
        //check if graph data for this particular graph is present
        async function loadGraph() {
            if(!currentSite || !currentSite.url.trim()){
                return
            }
        }

        loadGraph()

    }, [currentSite])

    const handleCreateGraph = async () => {
        if(currentSite){
            
            const response = await request_graph(currentSite)
            console.log(response)

        }
    }

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] w-full bg-background">
  
            <div className="flex-1 flex flex-col px-6 py-2">
                <iframe 
                    src="http://localhost:8000"
                    className="w-full h-full border-0"
                    title={currentSite ? currentSite.url : ""}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                >
                </iframe>
                <Button onClick={handleCreateGraph}>
                    {t("graph.request-graph")}
                </Button>
            </div> 

        </div>
    )
}