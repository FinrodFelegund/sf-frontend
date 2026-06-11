import { useEffect } from "react"

export function Graph({currentUrl}: {currentUrl: string}){
    //const [isLoading, setIsLoading] = useState(false)
    //const [source, setSource] = useState("http://localhost:8000")

    useEffect(() => {
        //check if graph data for this particular graph is present
        async function loadGraph() {
            if(!currentUrl.trim()){
                return
            }
        }

        loadGraph()

    }, [currentUrl])

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] w-full bg-background">
  
            <div className="flex-1 flex flex-col px-6 py-2">
                <iframe 
                    src="http://localhost:8000"
                    className="w-full h-full border-0"
                    title={currentUrl}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                >
                </iframe>
            </div> 

        </div>
    )
}