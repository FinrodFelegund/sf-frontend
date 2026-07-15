import { useEffect, useState, useRef } from "react"
import { Button } from "../ui/button"
import { requestAddEntity, requestAddRelation, requestGraph, sendGraphStream } from "@/lib/graph"
import { GraphResponse, type GraphLink, type GraphNode, type Sitedata } from "@/lib"
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
    const [hoverItem, setHoverItem] = useState<string | null>(null)
    const [mousePos, setMousePos] = useState({ x: 0, y: 0})
    
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
            setIsLoading(true)

            const graphdata = await requestGraph(currentSite)
            setGraphData(prev => ({
                nodes: [...prev.nodes, ...graphdata.nodes],
                links: [...prev.links, ...graphdata.links]
            }))
            setIsLoading(false)
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
                if(typeof chunk.nodes !== "undefined" && typeof chunk.links !== "undefined"){
                    setGraphData(prev => ({
                            nodes: [...prev.nodes, ...chunk.nodes],
                            links: [...prev.links, ...chunk.links],
                        }))
                    
                }
            }

            console.log(graphData)
        } catch(error){
            console.error("Graph Streaming error:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleAddEntity = async (entity: GraphNode) => {

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

    const handleAddRelation = async (relation: GraphLink) => {
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

    useEffect(() => {
        console.log(graphData)
    }, [graphData])

    return (
        <div className="relative flex flex-col h-[calc(100vh-4rem)] w-full bg-background">
            <div className="absolute top-2 right-2 z-10 w-1/2">
                <GraphAnnotation
                    className="m-4"
                    currentSite={currentSite ? currentSite : {url: "no url provided", text: ""}}
                    addEntity={handleAddEntity}
                    addRelation={handleAddRelation}
                    isLoading={isLoading}>
                </GraphAnnotation>
            </div>
            <div 
                ref={containerRef}
                className="flex-1 min-h-0 px-6 py-2"
                onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top})
                }}
            >
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
                        linkColor={() => "#e11d48"}
                        linkWidth={2}
                        linkCurvature={0.5}
                        onNodeHover={(node: any) => setHoverItem(node ? `${node.caption} (${node.label})` : null)}
                        onLinkHover={(link: any) => setHoverItem(link ? (link.relation_type ?? "relation") : null)}
                    />
                )}
                {hoverItem && (
                    <div
                        className="pointer-events-none absolute z-50 rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground shadow-md"
                        style={{ left: mousePos.x + 12, top: mousePos.y + 12 }}
                    >
                        {hoverItem}
                    </div>
                )}
            </div>
       
            <Button className="m-4 shrink" onClick={handleCreateGraph}>
                {t("graph.request-graph")}
            </Button>
  

        </div>
    )
}