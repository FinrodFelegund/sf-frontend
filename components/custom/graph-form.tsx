import { useEffect, useState, useRef } from "react"
import { Button } from "../ui/button"
import { requestAddEntity, requestAddRelation, sendGraphStream } from "@/lib/graph"
import { GraphResponse, Link, Node, Sitedata } from "@/lib"
import { GraphAnnotation } from "@/components/custom/graph-annotation"
import { useLanguage } from "@/hooks/language-hook"
import ForceGraph2D from "react-force-graph-2d"

const labelColors: Record<string, string> = {
    PERSON: "#4f8ef7",
    ORG: "#f7a44f",
    GPE: "#e7a44f",
    LOC: "#b07ff5",
    NORP: "#5fc98e",

}

const getNodeColor = (label: string) => labelColors[label] ?? "#999999"

export function Graph({currentSite}: {currentSite: Sitedata | null}){
    const [isLoading, setIsLoading] = useState(false)
    const { t } = useLanguage()
    const [dims, setDims] = useState({width: 0, height: 0})
    const [graphData, setGraphData] = useState<GraphResponse>({"nodes": [], "links": []})
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
        if(!currentSite){
            return
        }

        setIsLoading(true)
        setGraphData({"nodes": [], "links": []})

        try {
            const stream = sendGraphStream(currentSite)
            //let fullContent = ""
            for await (const chunk of stream){
                if(chunk.nodes){
                    setGraphData({
                        nodes: [...graphData.nodes, chunk.nodes ? chunk.nodes : []],
                        links: graphData.links,
                    })
                }
            }
        } catch(error){
            console.error("Graph Streaming error:", error)
        } finally {
            setIsLoading(false)
        }
            
    }

    const handleAddEntity = async (entity: Node) => {

        if(!currentSite){
            return
        }
        setIsLoading(true)
        const newNode = await requestAddEntity(entity, currentSite)
        setGraphData({
            nodes: [...graphData.nodes, newNode],
            links: graphData.links
        })
        setIsLoading(false)
    }

    const handleAddRelation = async (relation: Link) => {
        if(!currentSite){
            return
        }
        setIsLoading(true)
        const newRelation = await requestAddRelation(relation.source, relation.target, relation.relation_type ? relation.relation_type : "PERSON", currentSite)    
        setGraphData({
            nodes: graphData.nodes,
            links: [...graphData.links, newRelation]
        })
        setIsLoading(false)
    }

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] w-full bg-background">
            <div>
                <GraphAnnotation currentSite={currentSite ? currentSite : {url: "no url provided", text: ""}} addEntity={handleAddEntity} addRelation={handleAddRelation} isLoading={isLoading}>

                </GraphAnnotation>
            </div>
            <div ref={containerRef} className="flex-1 min-h-0 px-6 py-2">
                {dims.width > 0 && (
                    <ForceGraph2D
                        graphData={graphData}
                        width={dims.width}
                        height={dims.height}
                        nodeCanvasObject={(node: any, ctx, globalScale) => {
                            const radius = 6
                            const fontSize = 12 / globalScale

                            // small fixed-size circle colored by label
                            ctx.beginPath()
                            ctx.arc(node.x!, node.y!, radius, 0, 2 * Math.PI)
                            ctx.fillStyle = getNodeColor(node.label)
                            ctx.fill()

                            // truncated caption below the node
                            const maxLen = 20
                            const caption =
                                node.caption.length > maxLen
                                ? node.caption.slice(0, maxLen) + "…"
                                : node.caption

                            ctx.font = `${fontSize}px Sans-Serif`
                            ctx.textAlign = "center"
                            ctx.textBaseline = "top"
                            ctx.fillStyle = "#333333"
                            ctx.fillText(caption, node.x!, node.y! + radius + 2 / globalScale)

                            node.__r = radius
                        }}
                        nodePointerAreaPaint={(node: any, color, ctx) => {
                            ctx.beginPath()
                            ctx.arc(node.x!, node.y!, node.__r ?? 6, 0, 2 * Math.PI)
                            ctx.fillStyle = color
                            ctx.fill()
                        }}
                        nodeLabel={(node: any) => node.caption}
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