import { useEffect, useMemo, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { Search, X } from "lucide-react"
import type { GraphNode } from "@/lib"
import { useLanguage } from "@/hooks/language-hook"
import { cn } from "@/lib"

const MAX_RESULTS = 8
const MIN_QUERY = 2

type EntitySearchProps = {
    nodes: GraphNode[],
    getColor: (label: string) => string,
    rankOf: (id: string) => number,
    degreeOf: (id: string) => number,
    onPick: (node: GraphNode & { id: string }) => void,
}

export function EntitySearch({ nodes, getColor, rankOf, degreeOf, onPick }: EntitySearchProps){
    const { t } = useLanguage()
    const [query, setQuery] = useState("")
    const [open, setOpen] = useState(false)
    const [active, setActive] = useState(0)
    const boxRef = useRef<HTMLDivElement>(null)

    const results = useMemo(() => {
        const q = query.trim().toLowerCase()
        if(q.length < MIN_QUERY) return []

        return nodes
            .filter((n): n is GraphNode & { id: string } =>
                !!n.id && n.caption.toLowerCase().includes(q))
            .sort((a, b) => {
                // prefix matches first, then by structural importance
                const pa = a.caption.toLowerCase().startsWith(q) ? 1 : 0
                const pb = b.caption.toLowerCase().startsWith(q) ? 1 : 0
                if(pa !== pb) return pb - pa
                return rankOf(b.id) - rankOf(a.id)
            })
            .slice(0, MAX_RESULTS)
    }, [nodes, query, rankOf])

    useEffect(() => { setActive(0) }, [query])

    useEffect(() => {
        const onDown = (e: MouseEvent) => {
            if(boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener("mousedown", onDown)
        return () => document.removeEventListener("mousedown", onDown)
    }, [])

    const pick = (node: GraphNode & { id: string }) => {
        onPick(node)
        setQuery("")
        setOpen(false)
    }

    return (
        <div ref={boxRef} className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
                value={query}
                onChange={e => { setQuery(e.target.value); setOpen(true) }}
                onFocus={() => setOpen(true)}
                onKeyDown={e => {
                    if(e.key === "ArrowDown"){
                        e.preventDefault(); setActive(i => Math.min(i + 1, results.length - 1))
                    } else if(e.key === "ArrowUp"){
                        e.preventDefault(); setActive(i => Math.max(i - 1, 0))
                    } else if(e.key === "Enter" && results[active]){
                        e.preventDefault(); pick(results[active])
                    } else if(e.key === "Escape"){
                        setOpen(false); setQuery("")
                    }
                }}
                placeholder={t("graph.search")}
                className="h-8 pl-7 pr-7"
            />
            {query && (
                <button
                    type="button"
                    onClick={() => { setQuery(""); setOpen(false) }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                    <X className="size-3.5" />
                </button>
            )}

            {open && results.length > 0 && (
                <ul className="absolute left-0 right-0 top-9 z-50 overflow-hidden rounded-md border border-border bg-popover shadow-lg">
                    {results.map((node, i) => (
                        <li key={node.id}>
                            <button
                                type="button"
                                onMouseEnter={() => setActive(i)}
                                onClick={() => pick(node)}
                                className={cn(
                                    "flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm",
                                    i === active ? "bg-muted" : "hover:bg-muted/60"
                                )}
                            >
                                <span
                                    className="size-2.5 shrink-0 rounded-full"
                                    style={{ backgroundColor: getColor(node.label) }}
                                />
                                <span className="min-w-0 flex-1 truncate">{node.caption}</span>
                                <span
                                    className="shrink-0 text-[10px] tabular-nums text-muted-foreground"
                                    title={t("graph.search-degree")}
                                >
                                    {degreeOf(node.id)}
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {open && query.trim().length >= MIN_QUERY && results.length === 0 && (
                <div className="absolute left-0 right-0 top-9 z-50 rounded-md border border-border bg-popover px-2 py-2 text-sm text-muted-foreground shadow-lg">
                    {t("graph.search-empty")}
                </div>
            )}
        </div>
    )
}