import { useEffect, useState, useRef } from "react"
import { Button } from "../ui/button"
import { requestGraph } from "@/lib/graph"
import { Sitedata } from "@/lib"
import { useLanguage } from "@/hooks/language-hook"
import ForceGraph2D from "react-force-graph-2d" 

const myData = {
  nodes: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
  links: [
    { source: 'a', target: 'b' },
    { source: 'c', target: 'a' }
  ]
};

export function Graph({currentSite}: {currentSite: Sitedata | null}){
    //const [isLoading, setIsLoading] = useState(false)
    //const [source, setSource] = useState("http://localhost:8000")
    const { t } = useLanguage()
    const [dims, setDims] = useState({width: 0, height: 0})
    const containerRef = useRef<HTMLDivElement>(null)
    
    useEffect(() => {
        if(!containerRef.current){
            return
        }
        const observer = new ResizeObserver(([entry]) => {
            setDims({
                width: entry.contentRect.width,
                height: entry.contentRect.height,
            })
        })
        observer.observe(containerRef.current)
        return () => observer.disconnect()

    }, [])

    useEffect(() => {
        async function loadGraph() {
            if(!currentSite || !currentSite.url.trim()){
                return
            }
        }
        loadGraph()

    }, [currentSite])

    const handleCreateGraph = async () => {
        if(currentSite){
            
            const response = await requestGraph(currentSite)
            console.log(response)

        }
    }

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] w-full bg-background">
            <div ref={containerRef} className="flex-1 min-h-0 px-6 py-2">
                {dims.width > 0 && (
                    <ForceGraph2D
                        graphData={myData}
                        width={dims.width}
                        height={dims.height}
                    />
                )}
            </div>
            <div className="flex-1 flex flex-col px-6 py-2">
                <Button onClick={handleCreateGraph}>
                    {t("graph.request-graph")}
                </Button>
            </div> 

        </div>
    )
}