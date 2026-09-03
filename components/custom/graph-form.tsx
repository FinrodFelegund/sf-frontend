import { useEffect, useState, useRef, useMemo, useCallback } from "react"
import { Button } from "../ui/button"
import { requestAddNode, requestDeleteNode, requestUpdateNode, requestMergeNodes, requestAddLink, requestUpdateLink, requestGraph, sendGraphStream, requestFocus } from "@/lib/graph"
import { GraphResponse, type GraphLink, type GraphNode, type Sitedata } from "@/lib"
import { GraphAnnotation } from "@/components/custom/graph-annotation"
import { EntitySearch } from "@/components/custom/entity-search"
import { SourcesPanel } from "@/components/custom/sources-panel"
import { useLanguage } from "@/hooks/language-hook"
import ForceGraph2D from "react-force-graph-2d"
import { useAuth } from "@/hooks/authentication-hook"
import { LinkTooltip, NodeTooltip } from "./tooltips"
import { smoothLinePoints, wrapInCircle} from "@/lib"
import { Layers, X } from "lucide-react"
import { cn } from "@/lib"

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

const CHARGE_STRENGTH = -120
const LINK_DISTANCE = 90
const TOOLTIP_WIDTH = 288
const TOOLTIP_MAX_HEIGHT = 260
const HIDE_DELAY_MS = 250
const EXPAND_N = 2
const FOCUS_NEIGHBOURS = 2
const FOCUS_TOP_N = 24
const DEFAULT_TOP_N = 50
const MAX_PINS = 8

const labelColors: Record<string, string> = {
    PERSON: "#4f8ef7",
    ORG: "#f7a44f",
    GPE: "#e7a44f",
    LOC: "#b07ff5",
    NORP: "#5fc98e",
}

type HoverItem = {
    label: String,
    value: GraphLink | GraphNode,
}

const getNodeColor = (label: string) => labelColors[label] ?? "#999999"

const endId = (end: string | GraphNode): string =>
    typeof end === "string" ? end : String(end.id)

type MergeNodes = {
    source: GraphNode,
    target: GraphNode,
}


export function Graph({currentSite, graphType}: {currentSite: Sitedata | null, graphType: string}){
    const { isAuthenticated } = useAuth()
    const [isLoading, setIsLoading] = useState(false)
    const { t } = useLanguage()
    const [dims, setDims] = useState({width: 0, height: 0})
    const [rawGraphData, setRawGraphData] = useState<GraphResponse>({"nodes": [], "links": [], "scores": []})
    const [expandedIds, setExpandedIds] = useState<string[]>([])
    const containerRef = useRef<HTMLDivElement>(null)

    const mousePosRef = useRef({ x: 0, y: 0 })
    const [anchor, setAnchor] = useState({ x: 0, y: 0, r:0 })
    const [isDragging, setIsDragging] = useState(false)
    const [hoverItem, setHoverItem] = useState<HoverItem | null>(null)
    const [hoverNode, setHoverNode] = useState<GraphNode | null>(null)
    const [hoverLink, setHoverLink] = useState<GraphLink | null>(null)
    const hoverItemRef = useRef<HoverItem | null>(null)
    const hideTimer = useRef<number | null>(null)
    const [mergeIds, setMergeIds] = useState<MergeNodes | null>(null)

    const dragStartPosRef = useRef<{ id: string, x: number, y: number, fx?: number, fy?: number } | null>(null)
    const graphRef = useRef<any>(null)

    const [focusedSiteIds, setFocusedSiteIds] = useState<string[]>([])
    const [tfidfById, setTfidfById] = useState<Map<string, number>>(new Map())
    const [sourcesOpen, setSourcesOpen] = useState(false)
    const globalCache = useRef<GraphResponse | null>(null)

    const [pinnedIds, setPinnedIds] = useState<string[]>([])
    const pinnedSet = useMemo(() => new Set(pinnedIds), [pinnedIds])
    const centerOnRef = useRef<string | null>(null)

    useEffect(() => { setPinnedIds([]) }, [graphType])

    const focusedIds = useMemo(() => {
        return new Set(tfidfById.keys())
    }, [tfidfById])



    const isFocusMode = graphType === "global" && focusedIds.size > 0

    const handleDrag = (dragNode: any) => {

        const graphNodes = graphData.nodes
        if(graphNodes.length < 1){
            return
        }

        const resetDragCoords = (node: any) => {
            node.fx = node.x
            node.fy = node.y
        }

        graphNodes.forEach((node) => {
            resetDragCoords(node)
        })



        if(!dragNode || !graphRef || graphType !== "local" || mergeIds){
            return
        }


        const boundingbox = (node: any) => {
            return {
                x1: node.x - node.__r,
                y1: node.y - node.__r,
                x2: node.x + node.__r,
                y2: node.y + node.__r,
            }
        }



        const overlap = (node1: any, node2: any) => {
            if(node1.x2 < node2.x1 || node1.x1 > node2.x2){
                return false
            }

            if(node1.y1 > node2.y2 || node1.y2 < node2.y1){
                return false
            }

            return true
        }

        const dragBoundingBox = boundingbox(dragNode)
        const dragNeighbors = neighborsById.get(String(dragNode.id))
        for(const node of graphNodes) {
            if(node.id === dragNode.id){
                continue
            }
            if(dragNeighbors?.has(dragNode.id)){
                continue
            }

            const nodeBoundingBox = boundingbox(node)
            if(overlap(dragBoundingBox, nodeBoundingBox)){
                setMergeIds({source: dragNode, target: node})
                break
            }  
        }
    }

    useEffect(() => {
        const fg = graphRef.current
        if(!fg){
            return
        }
        if(mergeIds){
            fg.pauseAnimation()
        } else {
            fg.resumeAnimation()
        }
    }, [mergeIds])

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
            if(!isAuthenticated) return
            if(graphType === "local" && (!currentSite || !currentSite.url.trim())) return

            setIsLoading(true)
            setExpandedIds([])
            try {
                if(graphType === "local"){
                    setRawGraphData(await requestGraph(currentSite!))
                } else {
                    // the corpus graph is fetched once — focus never refetches it
                    if(!globalCache.current){
                        globalCache.current = await requestGraph({ url: "", text: "" })
                    }
                    setRawGraphData(globalCache.current)
                }
            } catch(error){
                console.error("Failed to load graph:", error)
            } finally {
                setIsLoading(false)
            }
        }
        loadGraph()
    }, [currentSite, graphType, isAuthenticated])

    useEffect(() => {
        if(graphType !== "global" || focusedSiteIds.length === 0){
            setTfidfById(new Map())
            return
        }

        let cancelled = false
        requestFocus(focusedSiteIds)
            .then(focus => { if(!cancelled) setTfidfById(new Map(Object.entries(focus.tfidf))) })
            .catch(error => console.error("Failed to load focus:", error))

        return () => { cancelled = true }
    }, [focusedSiteIds, graphType])


    const scoreById = useMemo(() => {
        const m = new Map<string, number>()
        for (const s of rawGraphData.scores ?? []) {
            m.set(String(s.id), s.score ?? 0)
        }
        return m
    }, [rawGraphData.scores])

    const prById = useMemo(() => {
        const raw = rawGraphData.nodes.map(n => scoreById.get(String(n.id)) ?? 0)
        const min = Math.min(...raw, Infinity), max = Math.max(...raw, -Infinity)
        const m = new Map<string, number>()
        rawGraphData.nodes.forEach((n, i) => {
            if(n.id) m.set(n.id, max === min ? 0.5 : (raw[i] - min) / (max - min))
    })
    return m
    }, [rawGraphData.nodes, scoreById])

    const rankOf = useCallback((id?: string) => {
        if(!id) return 0
        if(isFocusMode && focusedIds.has(id)) return tfidfById.get(id) ?? 0
        return prById.get(id) ?? 0
    }, [isFocusMode, focusedIds, tfidfById, prById])




    const neighborsById = useMemo(() => {
        const m = new Map<string, Set<string>>()
        const add = (a: string, b: string) => {
            if(!m.has(a)) {
                m.set(a, new Set())
            }
            m.get(a)!.add(b)
        }

        for (const link of rawGraphData.links) {
            const s = endId(link.source)
            const t = endId(link.target)
            add(s, t)
            add(t, s)
        }

        return m
    }, [rawGraphData.links])


    const scaleById = useMemo(() => {
        const m = new Map<string, number>()
        for(const n of rawGraphData.nodes) if(n.id) m.set(n.id, rankOf(n.id) / 2 + 0.75)
        return m
    }, [rawGraphData.nodes, rankOf])

    const LABEL_RADIUS_MAX = 32, LABEL_RADIUS_MIN = 21
    const labelRadius = Math.min(
        LABEL_RADIUS_MAX,
        Math.max(LABEL_RADIUS_MIN, Math.max(dims.width, dims.height) / 50)
    )

    const anchorFor = useCallback((item: any, isLink: boolean) => {
        const fg = graphRef.current
        if(!fg?.graph2ScreenCoords) return null
        const zoom = fg.zoom?.() ?? 1

        if(isLink){
            const s = item.source, t = item.target
            if(s?.x == null || t?.x == null) return null
            const p = fg.graph2ScreenCoords((s.x + t.x) / 2, (s.y + t.y) / 2)
            return { x: p.x, y: p.y, r: 6 * zoom }
        }

        if(item?.x == null) return null
        const p = fg.graph2ScreenCoords(item.x, item.y)
        return { x: p.x, y: p.y, r: (item.__r ?? labelRadius) * zoom }
    }, [])

    useEffect(() => {
        if(isDragging){
            hideNow()
            return
        }

        const item: HoverItem | null =
            hoverNode ? { label: "Node", value: hoverNode }
            : hoverLink ? { label: "Link", value: hoverLink }
            : null

        if(item){
            cancelHide()
            if(hoverItemRef.current?.value !== item.value){
                const a = anchorFor(item.value, item.label === "Link")
                if(a) setAnchor(a)
            }
            hoverItemRef.current = item
            setHoverItem(item)
        } else {
            cancelHide()
            hideTimer.current = window.setTimeout(() => {
                hoverItemRef.current = null
                setHoverItem(null)
                hideTimer.current = null
            }, HIDE_DELAY_MS)
        }
    }, [hoverNode, hoverLink, isDragging, anchorFor])


    //const NODE_CELL_FACTOR = 6

    /*const { maxFocus, maxNeighbours } = useMemo(() => {
        const cell = 4 * labelRadius * labelRadius * NODE_CELL_FACTOR
        let maxElements = Math.ceil((dims.width * dims.height) / cell)
        const mn = maxElements >= 24 ? 2 : maxElements > 16 ? 1 : 0
        if(dims.height < 500) maxElements = maxElements / 1.5

        return {
            maxFocus: Math.max(1, Math.floor(maxElements / (1 + mn))),
            maxNeighbours: isFocusMode ? Math.max(1, mn) : mn,
        }
    }, [dims.width, dims.height, labelRadius, isFocusMode])*/

    const visibleIds = useMemo(() => {
        // always order by PageRank: it's what keeps the connected core together
        const byRank = (ids: string[]) =>
            ids.sort((a, b) => (prById.get(b) ?? 0) - (prById.get(a) ?? 0))

        const pull = (ids: Set<string>, id: string, n: number) => {
            byRank([...(neighborsById.get(id) ?? [])].filter(x => !ids.has(x)))
                .slice(0, n)
                .forEach(x => ids.add(x))
        }

        const ids = new Set<string>()

        if(isFocusMode){
            // seed from the focused site's entities…
            byRank([...focusedIds]).slice(0, FOCUS_TOP_N).forEach(id => ids.add(id))
            // …then pull in the corpus around them. This is the whole point of the view.
            for(const id of [...ids]) pull(ids, id, FOCUS_NEIGHBOURS)
        } else {
            rawGraphData.nodes
                .filter((n): n is GraphNode & { id: string } => !!n.id)
                .slice()
                .sort((a, b) => (prById.get(b.id) ?? 0) - (prById.get(a.id) ?? 0))
                .slice(0, DEFAULT_TOP_N)
                .forEach(n => ids.add(n.id))
        }

        for(const id of expandedIds){
            ids.add(id)
            pull(ids, id, EXPAND_N)
        }

        for(const id of pinnedIds){
            ids.add(id)
            pull(ids, id, EXPAND_N)
        }

        return ids
    }, [rawGraphData.nodes, neighborsById, expandedIds, focusedIds, isFocusMode, prById, pinnedIds])

    const graphData = useMemo(() => {
        const nodes = rawGraphData.nodes.filter(n => n.id && visibleIds.has(n.id))

        // legacy global_graph.js:98 — one link per node pair, later relations overwrite the label
        const byPair = new Map<string, GraphLink>()
        for (const l of rawGraphData.links) {
            const s = endId(l.source), t = endId(l.target)
            if (!visibleIds.has(s) || !visibleIds.has(t)) continue
            const key = s < t ? `${s},${t}` : `${t},${s}`
            const prev = byPair.get(key)
            if (prev) {
                prev.sentences = [...(prev.sentences ?? []), ...(l.sentences ?? [])]
                prev.relation_type = l.relation_type ?? prev.relation_type
            } else {
                byPair.set(key, { ...l, sentences: [...(l.sentences ?? [])] })
            }
        }

        return { nodes, links: [...byPair.values()] }
    }, [rawGraphData.nodes, rawGraphData.links, visibleIds])


    useEffect(() => {
        const fg = graphRef.current
        if(!fg || !dims.width) return

        fg.d3Force("link")?.distance(LINK_DISTANCE).strength(1)
        fg.d3Force("charge")?.strength(CHARGE_STRENGTH)
        fg.d3ReheatSimulation()
    }, [graphData, dims.width])

    const handleCreateGraph = async () => {
        if(!currentSite || !isAuthenticated){
            return
        }

        setIsLoading(true)
        setExpandedIds([])
        setRawGraphData({"nodes": [], "links": [], "scores": []})

        try {
            const stream = sendGraphStream(currentSite)
            //let fullContent = ""
            for await (const chunk of stream){
                if(chunk.snapshot){
                    setRawGraphData({
                        nodes: chunk.nodes,
                        links: chunk.links,
                        scores: chunk.scores,
                    })
                    continue
                }
                setRawGraphData(prev => ({
                        nodes: [...prev.nodes, ...chunk.nodes],
                        links: [...prev.links, ...chunk.links],
                        scores: [...prev.scores, ...chunk.scores],
                    }))
            }


        } catch(error){
            console.error("Graph Streaming error:", error)
        } finally {
            setIsLoading(false)
        }
    }

    
    const cancelHide = () => {
        if(hideTimer.current !== null){
            window.clearTimeout(hideTimer.current)
            hideTimer.current = null
        }
    }
    
    const hideNow = () => {
        cancelHide()
        setHoverNode(null)
        setHoverLink(null)
        setHoverItem(null)
    }
        
    useEffect(() => cancelHide, [])
    
    const TOOLTIP_GAP = 10

    const tooltipPos = useMemo(() => {
        const left = Math.min(
            Math.max(8, anchor.x - TOOLTIP_WIDTH / 2),
            Math.max(8, dims.width - TOOLTIP_WIDTH - 8)
        )
        const below = anchor.y + anchor.r + TOOLTIP_GAP
        const fits = below + TOOLTIP_MAX_HEIGHT <= dims.height

        return {
            left,
            top: fits ? below : undefined,
            bottom: fits ? undefined : dims.height - (anchor.y - anchor.r - TOOLTIP_GAP),
        }
    }, [anchor, dims])

      useEffect(() => { setPinnedIds([]) }, [graphType])

    const degreeOf = useCallback(
        (id: string) => neighborsById.get(id)?.size ?? 0,
        [neighborsById]
    )

    const handlePinEntity = useCallback((node: GraphNode & { id: string }) => {
        setPinnedIds(prev => prev.includes(node.id) ? prev : [...prev, node.id].slice(-MAX_PINS))
        centerOnRef.current = node.id
    }, [])

    const handleUnpin = useCallback((id: string) => {
        setPinnedIds(prev => prev.filter(x => x !== id))
    }, [])

    useEffect(() => {
        if(!centerOnRef.current) return

        let frames = 0
        let raf = 0

        const tryCenter = () => {
            const id = centerOnRef.current
            if(!id) return
            const fg = graphRef.current
            const n = fg?.graphData?.().nodes?.find((x: any) => String(x.id) === id)

            if(n && Number.isFinite(n.x)){
                fg.centerAt(n.x, n.y, 600)
                centerOnRef.current = null
                return
            }
            if(frames++ < 90) raf = requestAnimationFrame(tryCenter)
            else centerOnRef.current = null
        }

        raf = requestAnimationFrame(tryCenter)
        return () => cancelAnimationFrame(raf)
    }, [graphData])    
    const handleAddNode = async (node: GraphNode) => {

        if(!currentSite || !isAuthenticated){
            return
        }
        setIsLoading(true)
        const newNode = await requestAddNode(node, currentSite)
        setRawGraphData({
            nodes: [...rawGraphData.nodes, newNode],
            links: rawGraphData.links,
            scores: rawGraphData.scores,
        })
        setIsLoading(false)
    }

    const handleDeleteNode = async (node: GraphNode) => {
        if(!currentSite || !isAuthenticated || !node.id){
            return
        }
        setIsLoading(true)
        const removed = await requestDeleteNode(node, currentSite)
        const removedLinks = new Set(removed.relations)

        setRawGraphData(prev => ({
            nodes: prev.nodes.filter(n => n.id !== removed.entity),
            links: prev.links.filter(l => !(l.id && removedLinks.has(l.id))),
            scores: prev.scores.filter(s => s.id !== removed.entity)
        }))
        setExpandedIds(prev => prev.filter(id => id !== removed.entity))
        setIsLoading(false)
    }

    const handleUpdateNode = async (node: GraphNode) => {
        if(!currentSite || !isAuthenticated){
            return
        }
        setIsLoading(true)
        const updatedNode = await requestUpdateNode(node, currentSite)
        if(!updatedNode.id){
            setIsLoading(false)
            return
        }
        const mergedNode: GraphNode = {...node, ...updatedNode} 

        setRawGraphData(prev => ({
            nodes: prev.nodes.map(n => n.id === updatedNode.id ? mergedNode : n),
            links: prev.links,
            scores: prev.scores,
        }))
        setExpandedIds(prev => prev.includes(updatedNode.id!) ? prev : [...prev, updatedNode.id])
        setIsLoading(false)
    }

    const handleMergeNode = async () => {
        if(!isAuthenticated || !mergeIds || graphType !== "local" || !currentSite){
            setMergeIds(null)
            return
        }
        setIsLoading(true)

        const { source, target } = mergeIds
        const result = await requestMergeNodes(source, target, currentSite)
        const mergedNode = result.merged
        //const mergedId = mergedNode.id
        const deletedIds = new Set(result.deleted_relations.map(l => String(l.id)))
        const updatedById = new Map(result.updated_relations.map(l => [String(l.id), l]))
        //at this point we removed the source node in backend, updated all sentences and relations of it to target node
        //remove source node in graph, have its link.sources be target
        setRawGraphData(prev => ({
            nodes: prev.nodes
                .filter(n => n.id !== source.id)
                .map(n => n.id === target.id ? {...n, ...mergedNode} : n),
            links: prev.links
                .filter(l => !(l.id && deletedIds.has(String(l.id))))
                .map(l => {
                    const updated = l.id ? updatedById.get(String(l.id)) : undefined
                    if(updated){
                        return {...l, ...updated}
                    }

                    return l
                }),
            scores: prev.scores.filter(s => s.id !== source.id)
        }))
        setExpandedIds(prev => prev.filter(id => id !== source.id))

        dragStartPosRef.current = null
        setMergeIds(null)
        setIsLoading(false)
        setIsDragging(false)
    }

    const handleCancelMerge = () => {
        const start = dragStartPosRef.current
        const draggedNode = mergeIds?.source as any
        if(start && draggedNode){
            draggedNode.x = start.x
            draggedNode.y = start.y
            draggedNode.vx = 0
            draggedNode.vy = 0
            draggedNode.fx = start.fx
            draggedNode.fy = start.fy
        }
        dragStartPosRef.current = null
        setMergeIds(null)
        setIsDragging(false)
    }

    const handleAddLink = async (link: GraphLink) => {
        if(!currentSite || !isAuthenticated){
            return
        }
        try {
            setIsLoading(true)
            const newLink = await requestAddLink(link, currentSite)
            setRawGraphData({
                nodes: rawGraphData.nodes,
                links: [...rawGraphData.links, newLink],
                scores: rawGraphData.scores,
        })
        } catch(error){

        } finally{
            setIsLoading(false)
        }
    }

    const handleUpdateLink = async (link: GraphLink) => {
        if(!currentSite || !isAuthenticated){
            return
        }

        try {
            setIsLoading(true)
            const { updated_relations, deleted_relations } = await requestUpdateLink(link, currentSite)
            const deletedById = new Set(deleted_relations.map(l => String(l.id)))
            const updatedById = new Map(updated_relations.map(l => [String(l.id), l]))
            setRawGraphData(prev => ({
                nodes: prev.nodes,
                links: prev.links
                    .filter(l => !(l.id && deletedById.has(String(l.id))))
                    .map(l => {
                        const updated = l.id ? updatedById.get(String(l.id)) : undefined
                        if(updated){
                            return {...l, ...updated}
                        }
                        return l
                        }),
                scores: prev.scores,
            }))

            } catch(error){
                console.error("Failed to update link:", error)
            } finally {
                setIsLoading(false)
            }
    }
    

    
    return (
        <div className="relative flex flex-col h-[calc(100vh-4rem)] w-full bg-background">
            <div className="absolute top-2 right-2 z-10 w-1/2">
                {graphType === "local" &&
                    <GraphAnnotation
                        className="m-4"
                        currentSite={currentSite ? currentSite : {url: "no url provided", text: ""}}
                        nodes={graphData.nodes}
                        links={graphData.links}
                        addNode={handleAddNode}
                        deleteNode={handleDeleteNode}
                        updateNode={handleUpdateNode}
                        addLink={handleAddLink}
                        updateLink={handleUpdateLink}
                        isLoading={isLoading}>
                    </GraphAnnotation>
                }
            </div>
            {graphType === "global" && (
                <div className="flex flex-col gap-2 px-6 pt-2">
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setSourcesOpen(true)}>
                            <Layers className="mr-1.5 size-4" />
                            {t("sources.title")}
                            {focusedSiteIds.length > 0 && (
                                <span className="ml-1.5 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
                                    {focusedSiteIds.length}
                                </span>
                            )}
                        </Button>

                        <EntitySearch
                            nodes={rawGraphData.nodes}
                            getColor={getNodeColor}
                            rankOf={(id) => prById.get(id) ?? 0}
                            degreeOf={degreeOf}
                            onPick={handlePinEntity}
                        />

                        {isFocusMode && (
                            <Button variant="ghost" size="sm" onClick={() => setFocusedSiteIds([])}>
                                {t("sources.show-all")}
                            </Button>
                        )}
                    </div>

                    {pinnedIds.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1">
                            {pinnedIds.map(id => {
                                const node = rawGraphData.nodes.find(n => String(n.id) === id)
                                if(!node) return null
                                return (
                                    <button
                                        key={id}
                                        type="button"
                                        onClick={() => handleUnpin(id)}
                                        className="flex items-center gap-1 rounded-full border border-border bg-muted/50 py-0.5 pl-1.5 pr-1 text-xs hover:bg-muted"
                                    >
                                        <span
                                            className="size-2 rounded-full"
                                            style={{ backgroundColor: getNodeColor(node.label) }}
                                        />
                                        <span className="max-w-28 truncate">{node.caption}</span>
                                        <X className="size-3 text-muted-foreground" />
                                    </button>
                                )
                            })}
                            <button
                                type="button"
                                onClick={() => setPinnedIds([])}
                                className="px-1.5 text-xs text-muted-foreground hover:text-foreground"
                            >
                                {t("graph.unpin-all")}
                            </button>
                        </div>
                    )}
                </div>
            )}
            <SourcesPanel
                open={sourcesOpen}
                setOpen={setSourcesOpen}
                focusedSiteIds={focusedSiteIds}
                setFocusedSiteIds={setFocusedSiteIds}
            />
            <div className="flex-1 min-h-0 px-6 py-2 flex">
                <div 
                    ref={containerRef}
                    className="relative flex-1 min-h-0"
                    onMouseMove={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect()
                        mousePosRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
                    }}
                >
                    {dims.width > 0 && (
                        <ForceGraph2D
                            ref={graphRef}
                            graphData={graphData}
                            width={dims.width}
                            height={dims.height}
 
                            nodeCanvasObject={(node: any, ctx) => {
                                const s = scaleById.get(String(node.id)) ?? 1
                                const id = String(node.id)
                                const pinned = pinnedSet.has(id)
                                ctx.save()
                                ctx.translate(node.x, node.y)
                                ctx.scale(s, s)                       // legacy group transform
                                const dim = isFocusMode && !focusedIds.has(id) && !pinned

                                const base = 12 + Math.min((node.website_count ?? 1) - 1, 4)
                                const radius = base * (pinned ? 1.5 : 1)

                                ctx.beginPath()
                                ctx.arc(0, 0, radius, 0, 2 * Math.PI)
                                ctx.fillStyle = dim ? "#999999" : getNodeColor(node.label)
                                ctx.fill()
                                if(pinned){
                                    ctx.beginPath()
                                    ctx.arc(node.x!, node.y!, radius + 3, 0, 2 * Math.PI)
                                    ctx.strokeStyle = "#111827"
                                    ctx.lineWidth = 1.5
                                    ctx.stroke()
                                }
                                ctx.strokeStyle = "#FFFFFF"
                                ctx.lineWidth = 1
                                ctx.stroke()

                                ctx.font = "300 12px 'Roboto Condensed', sans-serif"
                                ctx.fillStyle = dim ? "#d7d7d7" : "#FFFFFF"
                                ctx.textAlign = "center"
                                ctx.textBaseline = "middle"

                                const lines = wrapInCircle(ctx, node.caption, labelRadius, 14)
                                lines.forEach((line, i) => {
                                    if (line) ctx.fillText(line, 0, (i - (lines.length - 1) / 2) * 14)
                                })

                                ctx.restore()
                                node.__r = labelRadius * s
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
                            onNodeDrag={(node: any) => {
                                if(!isDragging){
                                    setIsDragging(true)
                                }
                                if(mergeIds){
                                    return
                                }
                                if(!dragStartPosRef.current || dragStartPosRef.current.id !== String(node.id)){
                                    dragStartPosRef.current = { id: String(node.id), x: node.x, y: node.y, fx: node.fx, fy: node.fy }
                                }
                                node.fx = node.x
                                node.fy = node.y
                                handleDrag(node)
                            }}
                            onNodeDragEnd={(node: any) => {
                                setIsDragging(false)
                                node.fx = node.x
                                node.fy = node.y
                                if(!mergeIds){
                                    dragStartPosRef.current = null
                                }

                            }}
                            
                            onNodeHover={(node: any) => setHoverNode(node ??  null)}
                            onLinkHover={(link: any) => setHoverLink(link ?? null)}
                            onNodeClick={(node: any) => {
                                if(!node?.id) return
                                setExpandedIds(prev =>
                                    prev.includes(node.id) ? prev : [...prev, node.id]
                                )
                            }}
                            onBackgroundClick={() => setExpandedIds([])}
                            linkCanvasObject={(link: any, ctx, globalScale) => {
                                const s = link.source, t = link.target
                                if (s?.x == null || t?.x == null) return

                                const bothFocused = isFocusMode && focusedIds.has(String(s.id)) && focusedIds.has(String(t.id))

                                const pts = smoothLinePoints(s, t)
                                ctx.beginPath()
                                ctx.moveTo(pts[0].x, pts[0].y)
                                for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
                                
                                if(isFocusMode && bothFocused){
                                    ctx.strokeStyle = "#009688"
                                    ctx.lineWidth = 2
                                    ctx.setLineDash([])
                                } else if(isFocusMode){
                                    ctx.strokeStyle = "#999999"
                                    ctx.lineWidth = 1
                                    ctx.setLineDash([5, 5])
                                } else {
                                    ctx.strokeStyle = "#999999"
                                    ctx.lineWidth = 1
                                    ctx.setLineDash([])
                                }

                                ctx.stroke()
                                ctx.setLineDash([])

                                if(isFocusMode && !bothFocused){
                                    return
                                }

                                const label = link.relation_type
                                if (!label) return
                                const m = Math.floor(pts.length / 2)
                                const a = pts[m - 1], b = pts[m + 1] ?? pts[m]
                                let angle = Math.atan2(b.y - a.y, b.x - a.x)
                                if (angle > Math.PI / 2 || angle < -Math.PI / 2) angle += Math.PI  // keep upright

                                ctx.save()
                                ctx.translate(pts[m].x, pts[m].y)
                                ctx.rotate(angle)
                                //ctx.font = `${8.4 / globalScale}px 'Roboto Condensed', sans-serif`
                                ctx.textAlign = "center"
                                ctx.textBaseline = "bottom"
                                ctx.fillStyle = "#555555"
                                ctx.fillText(label, 0, -4 / globalScale)
                                ctx.restore()
                            }}
                            linkCanvasObjectMode={() => "replace"}
                            linkPointerAreaPaint={(link: any, color, ctx) => {
                                const s = link.source, t = link.target
                                if (s?.x == null || t?.x == null) return
                                const pts = smoothLinePoints(s, t)
                                ctx.beginPath()
                                ctx.moveTo(pts[0].x, pts[0].y)
                                for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
                                ctx.strokeStyle = color
                                ctx.lineWidth = 8          // legacy .click-target stroke-width: 8px
                                ctx.stroke()
                            }}
                        />
                    )}
                    {hoverItem && (
                        <div
                            className={cn(
                                "absolute z-50 flex w-72 flex-col overflow-hidden rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-lg",
                                isDragging && "pointer-events-none"
                            )}
                            style={{ left: tooltipPos.left, top: tooltipPos.top, bottom: tooltipPos.bottom, maxHeight: TOOLTIP_MAX_HEIGHT }}
                            onMouseEnter={cancelHide}
                            onMouseLeave={hideNow}
                            onWheel={(e) => e.stopPropagation()}
                        >
                            {hoverItem.label === "Node" && (
                                <NodeTooltip node={hoverItem.value as GraphNode} deleteNode={handleDeleteNode} />
                            )}
                            {hoverItem.label === "Link" && (
                                <LinkTooltip link={hoverItem.value as GraphLink} />
                            )}
                        </div>
                    )}
                    </div>
                </div>
                {graphType === "local" && (
                <Button className="m-4 shrink" onClick={handleCreateGraph} disabled={isLoading}>
                    {t("graph.request-graph")}
                </Button>
                )}

                <Dialog open={mergeIds != null} onOpenChange={(open) => { if(!open) handleCancelMerge()}}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t("graph.mergenodes.dialog.title")}</DialogTitle>
                            <DialogDescription>
                                {`${t("graph.mergenodes.dialog.question")} ${mergeIds?.source.caption} - ${mergeIds?.target.caption}`}
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => handleCancelMerge()} disabled={isLoading}>
                                {t("common.cancel")}
                            </Button>
                            <Button onClick={() => {handleMergeNode()}} disabled={isLoading}>
                                {t("common.confirm")}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
    

            </div>
    )
}