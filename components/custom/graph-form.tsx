import { useEffect, useState, useRef, useMemo, useCallback } from "react"
import { Button } from "../ui/button"
import { requestAddNode, requestDeleteNode, requestUpdateNode, requestMergeNodes, requestAddLink, requestUpdateLink, requestGraph, sendGraphStream, requestFocus } from "@/lib/graph"
import { GraphResponse, isAuthError, type GraphLink, type GraphNode, type Sitedata } from "@/lib"
import { GraphAnnotation } from "@/components/custom/graph-annotation"
import { EntitySearch } from "@/components/custom/entity-search"
import { SourcesPanel } from "@/components/custom/sources-panel"
import { EntityDetailPanel } from "@/components/custom/entity-detail-panel"
import { useLanguage } from "@/hooks/language-hook"
import ForceGraph2D from "react-force-graph-2d"
import { useAuth } from "@/hooks/authentication-hook"
import { LinkTooltip, NodeTooltip } from "./tooltips"
import { smoothLinePoints, layoutNodeLabel, linkLabelAnchor, collideForce} from "@/lib"
import { Layers, X, TriangleAlert, SquarePen, ChevronUp, RefreshCcw } from "lucide-react"
import { cn, ApiError } from "@/lib"

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
const FOCUS_NEIGHBOURS = 2
const FOCUS_TOP_N = 24
const DEFAULT_TOP_N = 50
const MAX_PINS = 8
const PIN_NEIGHBOURS = 2
const EXPAND_LIMIT = 25

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

const darken = (hex: string, amount: number) => {
    const value = hex.replace("#", "")
    const full = value.length === 3 ? value.split("").map(c => c + c).join("") : value
    const num = parseInt(full, 16)
    return `rgb(${Math.round(((num >> 16) & 255) * (1 - amount))}, ${Math.round(((num >> 8) & 255) * (1 - amount))}, ${Math.round((num & 255) * (1 - amount))})`
}

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
    const [streamError, setStreamError] = useState<string | null>(null)
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
    const [annotationOpen, setAnnotationOpen] = useState(false)
    const globalCache = useRef<GraphResponse | null>(null)
    const [corpusVersion, setCorpusVersion] = useState(0)

    const [pinnedIds, setPinnedIds] = useState<string[]>([])
    const pinnedSet = useMemo(() => new Set(pinnedIds), [pinnedIds])
    const centerOnRef = useRef<string | null>(null)
    const lastApplied = useRef("")

    const [detailNodeId, setDetailNodeId] = useState<string | null>(null)
    const [selectedId, setSelectedId] = useState<string | null>(null)

    const invalidateCorpus = useCallback(() => {
        globalCache.current = null
        if(graphType === "global"){
            setCorpusVersion(v => v + 1)
        }
    }, [graphType])

    useEffect(() => {
        setSelectedId(null)
    }, [graphType])

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if(e.key === "Escape"){
                setSelectedId(null)
            }
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [])

    const handleToggleExpand = useCallback((id: string) => {
        setExpandedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        )
    }, [])

    const expandedSet = useMemo(() => { 
        return new Set(expandedIds)
    }, [expandedIds])

    useEffect(() => { setPinnedIds([]) }, [graphType])

    const focusedIds = useMemo(() => {
        return new Set(tfidfById.keys())
    }, [tfidfById])


    const describeError = useCallback((error: unknown, fallback: string) => {
        if(error instanceof ApiError){
            if(error.status === 409) return t("graph.error.duplicate")
            if(error.status === 404) return t("graph.error.gone")
            if(error.status === 400) return t("graph.error.invalid")
        }
        return fallback
    }, [t])

    const reportError = useCallback((error: unknown, fallback: string) => {
        if(isAuthError(error)){
            return
        }
        console.error(fallback, error)
        setStreamError(describeError(error, fallback))
    }, [describeError])

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



        if(!dragNode || !graphRef || mergeIds){
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
    }, [currentSite, graphType, isAuthenticated, corpusVersion])

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

    /*
    const rankOf = useCallback((id?: string) => {
        if(!id) return 0
        if(isFocusMode && focusedIds.has(id)) return tfidfById.get(id) ?? 0
        return prById.get(id) ?? 0
    }, [isFocusMode, focusedIds, tfidfById, prById])
    */



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


    /*const scaleById = useMemo(() => {
        const m = new Map<string, number>()
        for(const n of rawGraphData.nodes) if(n.id) m.set(n.id, rankOf(n.id) / 2 + 0.75)
        return m
    }, [rawGraphData.nodes, rankOf])
    */

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
            pull(ids, id, EXPAND_LIMIT)
        }

        for(const id of pinnedIds){
            ids.add(id)
            pull(ids, id, PIN_NEIGHBOURS)
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

    const selection = useMemo(() => {
        if(!selectedId){
            return null
        }

        const node = graphData.nodes.find(n => String(n.id) === selectedId)
        if(!node){
            return null
        }

        const neighbours = new Set<string>()
        for(const link of graphData.links){
            const s = endId(link.source)
            const t = endId(link.target)
            if(s === selectedId){
                neighbours.add(t)
            } else if(t === selectedId){
                neighbours.add(s)
            }
        }

        const colour = getNodeColor(node.label)
        return { id: selectedId, neighbours, colour, accent: darken(colour, 0.3)}

    }, [selectedId, graphData])

    const graphSignature = useMemo(() => {
        const nodes = graphData.nodes.map(n => String(n.id)).join(",")
        const links = graphData.links.map(l => `${endId(l.source)}>${endId(l.target)}`).join(",")
        return `${nodes}${links}`
    }, [graphData])

    useEffect(() => {
        const fg = graphRef.current
        if(!fg || !dims.width) return

        const key = `${graphSignature}@${dims.width}`
        if(key === lastApplied.current) return
        lastApplied.current = key

        const apply = () => {
            fg.d3Force("link")
                ?.distance((l: any) => (l.source.__r ?? 20) + (l.target.__r ?? 20) + LINK_DISTANCE)
                .strength(1)
            fg.d3Force("charge")?.strength(CHARGE_STRENGTH)
            fg.d3Force("collide", collideForce((n: any) => n.__r ?? 20, 12, 0.9))
            fg.d3ReheatSimulation()
        }

        apply()
        let inner = 0
        const outer = requestAnimationFrame(() => { inner = requestAnimationFrame(apply) })
        return () => { cancelAnimationFrame(outer); cancelAnimationFrame(inner) }
    }, [graphData, dims.width])

    const hiddenById = useMemo(() => {
        const counts = new Map<string, number>()

        for(const id of visibleIds){
            let hidden = 0
            for(const neighbour of neighborsById.get(id) ?? []){
                if(!visibleIds.has(neighbour)){
                    hidden++
                }
            }
            counts.set(id, hidden)
        }
        return counts
    }, [visibleIds, neighborsById])

    const handleCreateGraph = async () => {
        if(!currentSite || !isAuthenticated){
            return
        }

        setIsLoading(true)
        setExpandedIds([])
        setRawGraphData({"nodes": [], "links": [], "scores": []})
        setStreamError(null)

        try {
            const stream = sendGraphStream(currentSite)
            //let fullContent = ""
            for await (const chunk of stream){
                if(chunk.error){
                    setStreamError(chunk.error)
                    continue
                }
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
            reportError(error, t("graph.stream-failed"))
        } finally {
            setIsLoading(false)
            invalidateCorpus()
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

      useEffect(() => { 
        setPinnedIds([])
        setExpandedIds([])
        setSelectedId(null)
      }, [graphType])

    const degreeOf = useCallback(
        (id: string) => neighborsById.get(id)?.size ?? 0,
        [neighborsById]
    )

    const handlePinEntity = useCallback((node: GraphNode & { id: string }) => {
        setSelectedId(String(node.id))
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
        setStreamError(null)

        try{
            const newNode = await requestAddNode(node, currentSite)
            setRawGraphData(prev => ({
                nodes: [...prev.nodes, newNode],
                links: prev.links,
                scores: prev.scores,
            }))
        } catch(error){
            console.error("Adding node failed:", error)
            reportError(error, t("graph.error.add-node"))
        } finally {
            setIsLoading(false)
            invalidateCorpus()
        }

    }

    const handleDeleteNode = async (node: GraphNode) => {
        if(!currentSite || !isAuthenticated || !node.id){
            return
        }
        setIsLoading(true)
        setStreamError(null)

        try {
            const removed = await requestDeleteNode(node, currentSite)
            const removedLinks = new Set(removed.relations)
            
            setRawGraphData(prev => ({
                nodes: prev.nodes.filter(n => n.id !== removed.entity),
                links: prev.links.filter(l => !(l.id && removedLinks.has(l.id))),
                scores: prev.scores.filter(s => s.id !== removed.entity)
            }))
            setExpandedIds(prev => prev.filter(id => id !== removed.entity))
        } catch(error){
            console.error("Deleting node failed:", error)
            reportError(error, t("graph.error.delete-node"))
        } finally {
            setIsLoading(false)
            invalidateCorpus()
        }
    }

    const handleUpdateNode = async (node: GraphNode) => {
        if(!isAuthenticated){
            return
        }
        setIsLoading(true)
        setStreamError(null)

        try {

            const updatedNode = await requestUpdateNode(node, currentSite ?? undefined)
            if(!updatedNode.id){
                return
            }
            const mergedNode: GraphNode = {...node, ...updatedNode} 
    
            setRawGraphData(prev => ({
                nodes: prev.nodes.map(n => n.id === updatedNode.id ? mergedNode : n),
                links: prev.links,
                scores: prev.scores,
            }))
            setExpandedIds(prev => prev.includes(updatedNode.id!) ? prev : [...prev, updatedNode.id!])
        } catch(error){
            console.error("Updating node failed:", error)
            reportError(error, t("graph.error.updated-node"))
        } finally {
            setIsLoading(false)
            invalidateCorpus()
        }
    }

    const handleMergeNode = async () => {
        if(!isAuthenticated || !mergeIds){
            setMergeIds(null)
            return
        }

        setIsLoading(true)
        setStreamError(null)

        try {

            const { source, target } = mergeIds
            const result = await requestMergeNodes(source, target, currentSite ?? undefined)
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
        } catch(error){
            reportError(error, t("graph.error.merge"))
            handleCancelMerge()
            return
        } finally {
            dragStartPosRef.current = null
            setMergeIds(null)
            setIsLoading(false)
            setIsDragging(false)
            invalidateCorpus()
        }
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
            setRawGraphData(prev => ({
                nodes: prev.nodes,
                links: [...prev.links, newLink],
                scores: prev.scores,
        }))
        } catch(error){
            reportError(error, t("graph.error.add-link"))
        } finally{
            setIsLoading(false)
            invalidateCorpus()
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
                reportError(error, t("grad.error.update-link"))
            } finally {
                setIsLoading(false)
                invalidateCorpus()
            }
    }

    const handleRelayout = useCallback(() => {
        for(const node of graphData.nodes as any[]){
            node.fx = undefined
            node.fy = undefined
        }
        lastApplied.current = ""
        graphRef.current?.d3ReheatSimulation()
    }, [graphData])

    return (
        <div className="relative flex flex-col h-[calc(100vh-4rem)] w-full bg-background">

            <div className="flex flex-col gap-2 px-6 pt-2">
                <div className="flex flex-wrap items-center gap-2">
                    {graphType === "global" && (
                        <>
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
                        </>
                    )}

                    <Button
                        variant={annotationOpen ? "secondary" : "outline"}
                        size="sm"
                        className="ml-auto"
                        onClick={() => setAnnotationOpen(open => !open)}
                        aria-expanded={annotationOpen}
                        aria-controls="graph-annotation-panel"
                    >
                        {annotationOpen
                            ? <ChevronUp className="mr-1.5 size-4" />
                            : <SquarePen className="mr-1.5 size-4" />}
                        {t(annotationOpen ? "graph.annotation.hide" : "graph.annotation.show")}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="ml-auto"
                        onClick={handleRelayout}
                        title={t("graph.relayout")}
                        
                    >
                        <RefreshCcw className="mr-1.5 size-4" />
                    </Button>
                </div>

                {graphType === "global" && pinnedIds.length > 0 && (
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

            {annotationOpen && (
                <div
                    id="graph-annotation-panel"
                    className="absolute right-6 top-14 z-20 max-h-[calc(100%-5rem)] w-[min(22rem,calc(100%-3rem))] overflow-y-auto rounded-lg border border-border bg-popover shadow-lg"
                >
                    <GraphAnnotation
                        className="m-4"
                        currentSite={currentSite ?? { url: "", text: ""}}
                        graphType={graphType}
                        nodes={graphData.nodes}
                        links={graphData.links}
                        addNode={handleAddNode}
                        deleteNode={handleDeleteNode}
                        updateNode={handleUpdateNode}
                        addLink={handleAddLink}
                        updateLink={handleUpdateLink}
                        isLoading={isLoading}>
                    </GraphAnnotation>
                </div>
            )}
            <SourcesPanel
                open={sourcesOpen}
                setOpen={setSourcesOpen}
                focusedSiteIds={focusedSiteIds}
                setFocusedSiteIds={setFocusedSiteIds}
                onDeleted={() => {
                    setPinnedIds([])
                    setSelectedId(null)
                    setDetailNodeId(null)
                    invalidateCorpus()
                }}
            />
            <EntityDetailPanel
                entityId={detailNodeId}
                onClose={() => setDetailNodeId(null)}
                onOpenEntity={(id) => setDetailNodeId(id)}
                onToggleExpand={handleToggleExpand}
                isExpanded={detailNodeId != null && expandedSet.has(detailNodeId)}
                getColor={getNodeColor}

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
                            cooldownTicks={300}
                            onEngineStop={() => {
                                for(const node of graphData.nodes as any[]){
                                    if(node.x == null){
                                        continue
                                    }
                                    node.fx = node.x
                                    node.fy = node.y
                                }
                            }}
                            nodeCanvasObject={(node: any, ctx) => {
                                const id = String(node.id)
                                const pinned = pinnedSet.has(id)
                                const isSelected = selection?.id === id
                                const isNeighbour = selection != null && selection.neighbours.has(id)

                                const exempt = pinned || (isFocusMode && focusedIds.has(id)) || isSelected || isNeighbour

                                const dim = (isFocusMode || selection != null) && !exempt
                                const hidden = hiddenById.get(id) ?? 0

                                ctx.font ="500 11px 'Inter', system-ui, sans-serif"

                                // layout is expensive and only depends on the caption — cache it on the node
                                if(node.__labelKey !== node.caption){
                                    node.__label = layoutNodeLabel(ctx, node.caption, {
                                        fontSize: 11,
                                        minRadius: 14 + Math.min((node.website_count ?? 1) - 1, 4),
                                        maxLines: 4,
                                        maxChars: 8,
                                    })
                                    node.__labelKey = node.caption
                                }

                                const label = node.__label
                                const radius = label.radius * (pinned ? 1.15 : 1)
                                const colour = dim ? "#999999" : getNodeColor(node.label)

                                if(hidden > 0){
                                    ctx.beginPath()
                                    ctx.arc(node.x - radius * 0.19, node.y - radius * 0.13, radius * 0.9, 0, 2 * Math.PI)
                                    ctx.fillStyle = dim ? "#7d7d7d" : darken(colour, 0.35)
                                    ctx.fill()

                                    ctx.beginPath()
                                    ctx.arc(node.x - radius * 0.09, node.y - radius * 0.06, radius * 0.95, 0, 2 * Math.PI)
                                    ctx.fillStyle = dim ? "#8c8c8c" : darken(colour, 0.18)
                                    ctx.fill()
                                }

                                ctx.beginPath()
                                ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI)
                                ctx.fillStyle = colour
                                ctx.fill()
                                ctx.strokeStyle = isSelected ? selection!.accent : isNeighbour ? selection!.accent : pinned ? "#111827" : "#FFFFFF"
                                ctx.lineWidth = isSelected ? 3 : isNeighbour ? 2 : 1
                                ctx.stroke()

                                ctx.fillStyle = dim ? "#efefef" : "#FFFFFF"
                                ctx.textAlign = "center"
                                ctx.textBaseline = "middle"
                                label.lines.forEach((line: string, i: number) => {
                                    ctx.fillText(line, node.x, node.y + (i - (label.lines.length - 1) / 2) * label.lineHeight)
                                })

                                if(hidden > 0){
                                    const bx = node.x + radius * 0.72
                                    const by = node.y - radius * 0.72
                                    const br = Math.min(Math.max(7, radius * 0.3), 12)

                                    ctx.beginPath()
                                    ctx.arc(bx, by, br, 0, 2 * Math.PI)
                                    ctx.fillStyle = "#FFFFFF"
                                    ctx.fill()
                                    ctx.strokeStyle = dim ? "#b0b0b0" : colour
                                    ctx.lineWidth = 1.25
                                    ctx.stroke()

                                    ctx.font = `600 ${Math.round(br * 1.05)}px 'Inter', system-ui, sans-serif`
                                    ctx.fillStyle = dim ? "#9a9a9a" : "#222222"
                                    ctx.fillText(hidden > 99 ? "99+" : `+${hidden}`, bx, by)
                                }

                                node.__r = radius
                            }}
                            
                            nodePointerAreaPaint={(node: any, color, ctx) => {
                                const radius = node.__r ?? 6
                                ctx.fillStyle = color

                                ctx.beginPath()
                                ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI)
                                ctx.fill()

                                // the +N badge is part of the node's click target
                                ctx.beginPath()
                                ctx.arc(node.x + radius * 0.78, node.y - radius * 0.78, Math.max(6, radius * 0.4) * 1.4, 0, 2 * Math.PI)
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
                            onNodeClick={(node: any, event: MouseEvent) => {
                                if(!node?.id) return

                                const fg = graphRef.current
                                const radius = node.__r ?? 14
                                const br = Math.max(6, radius * 0.4)
                                const point = fg?.screen2GraphCoords?.(event.offsetX, event.offsetY)

                                const onBadge = point != null && Math.hypot(
                                    point.x - (node.x + radius * 0.78),
                                    point.y - (node.y - radius * 0.78),
                                ) <= br * 1.4

                                if(onBadge){
                                    setExpandedIds(prev =>
                                        prev.includes(node.id) ? prev.filter(x => x !== node.id) : [...prev, node.id]
                                    )
                                    return
                                }
                                setSelectedId(String(node.id))
                                setDetailNodeId(String(node.id))
                            }}
                            onBackgroundClick={() => {
                                setExpandedIds(prev => prev.length ? [] : prev)
                                setSelectedId(prev => prev === null ? prev : null)
                            }}
                            linkCanvasObject={(link: any, ctx) => {
                                const s = link.source, t = link.target
                                if (s?.x == null || t?.x == null) return

                                const bothFocused = isFocusMode && focusedIds.has(String(s.id)) && focusedIds.has(String(t.id))
                                const touchesSelection = selection != null && (String(s.id) === selection.id || String(t.id) === selection.id)
                                const text = link.relation_type

                                const pts = smoothLinePoints(s, t)
                                ctx.beginPath()
                                ctx.moveTo(pts[0].x, pts[0].y)
                                for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
                                if(selection != null){
                                    if(touchesSelection){
                                        ctx.strokeStyle = selection.accent
                                        ctx.lineWidth = 2
                                    } else {
                                        ctx.strokeStyle = "#d7d7d7"
                                        ctx.lineWidth = 1
                                    }
                                    ctx.setLineDash(text ? [] : [2, 3])
                                } else if(isFocusMode && bothFocused){
                                    ctx.strokeStyle = "#009688"
                                    ctx.lineWidth = 2
                                    ctx.setLineDash(text ? [] : [2, 3])
                                } else if(isFocusMode){
                                    ctx.strokeStyle = "#999999"
                                    ctx.lineWidth = 1
                                    ctx.setLineDash([5, 5])
                                } else {
                                    ctx.strokeStyle = "#999999"
                                    ctx.lineWidth = 1
                                    ctx.setLineDash(text ? [] : [2, 3])
                                }

                                ctx.stroke()
                                ctx.setLineDash([])
                            }}
                            onRenderFramePost={(ctx: CanvasRenderingContext2D) => {
                                ctx.save()
                                ctx.font = "400 9px 'Inter', system-ui, sans-serif"
                                ctx.textAlign = "center"
                                ctx.textBaseline = "middle"
                                ctx.lineJoin = "round"

                                const drawn: { x: number, y: number, w: number, h: number }[] = []
                                const links = [...(graphData.links as any[])].sort((a, b) => {
                                    const A = selection != null && (String(a.source?.id) === selection.id || String(a.target?.id) === selection.id) ? 1 : 0
                                    const B = selection != null && (String(b.source?.id) === selection.id || String(b.target?.id) === selection.id) ? 1: 0
                                    return A - B
                                })
                                for(const link of links){
                                    const s = link.source, t = link.target
                                    if(s?.x == null || t?.x == null) continue

                                    const text = link.relation_type
                                    if(!text) continue

                                    const touchesSelection = selection != null && (String(s.id) === selection.id || String(t.id) === selection.id)
                                    const faded = selection != null ? !touchesSelection : isFocusMode && !(focusedIds.has(String(s.id)) && focusedIds.has(String(t.id)))

                                    const a = linkLabelAnchor(smoothLinePoints(s, t), s, t)

                                    // skip a caption that would sit on top of one already drawn
                                    const w = ctx.measureText(text).width + 4
                                    const h = 11
                                    if(drawn.some(r => Math.abs(r.x - a.x) < (r.w + w) / 2 && Math.abs(r.y - a.y) < (r.h + h) / 2)) continue
                                    drawn.push({ x: a.x, y: a.y, w, h })

                                    ctx.save()
                                    ctx.translate(a.x, a.y)
                                    ctx.rotate(a.angle)
                                    ctx.lineWidth = 3.5
                                    ctx.strokeStyle = "#FFFFFF"
                                    ctx.strokeText(text, 0, 0)
                                    ctx.fillStyle = faded ? "#d7d7d7": (touchesSelection ? selection!.accent : "#333333")
                                    ctx.fillText(text, 0, 0)
                                    ctx.restore()
                                }

                                ctx.restore()
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
                                <NodeTooltip 
                                    node={hoverItem.value as GraphNode}
                                    deleteNode={handleDeleteNode}
                                    canDelete={graphType==="local"}
                                    expanded={expandedSet.has(String((hoverItem.value as GraphNode).id))}
                                    hidden={hiddenById.get(String((hoverItem.value as GraphNode).id)) ?? 0}
                                    onToggleExpand={handleToggleExpand}
                                />
                            )}
                            {hoverItem.label === "Link" && (
                                <LinkTooltip link={hoverItem.value as GraphLink} />
                            )}
                        </div>
                    )}
                    </div>
                </div>
                {graphType === "local" && (
                    <div className="m-4 flex flex-col gap-2">
                        {streamError && (
                            <div
                                role="alert"
                                className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200"
                            >
                                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                                <span className="flex-1">{streamError}</span>
                                <button
                                    type="button"
                                    onClick={() => setStreamError(null)}
                                    className="shrink-0 opacity-60 hover:opacity-100"
                                    aria-label={t("common.dismiss")}
                                >
                                    <X className="size-4" />
                                </button>
                            </div>
                        )}
                        <Button className="shrink" onClick={handleCreateGraph} disabled={isLoading}>
                            {t("graph.request-graph")}
                        </Button>
                    </div>
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