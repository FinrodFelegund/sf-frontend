import { useCallback, useEffect, useMemo, useState } from "react"

import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Check, ExternalLink, RefreshCw } from "lucide-react"
import { requestWebsites } from "@/lib/graph"
import type { GraphWebsite } from "@/lib"
import { useLanguage } from "@/hooks/language-hook"
import { cn } from "@/lib/utils"

const hostOf = (url: string) => {
    try { return new URL(url).hostname.replace(/^www\./, "")} catch { return url }
}

const pathOf = (url: string) => {
    try {
        const u = new URL(url)
        return (u.pathname + u.search).replace(/\/+$/, "") || ""
    } catch { return "" }
}

type SourcesPanelProps = {
    open: boolean,
    setOpen: (open: boolean) => void,
    focusedSiteIds: string[],
    setFocusedSiteIds: (ids: string[]) => void,
}

export function SourcesPanel({ open, setOpen, focusedSiteIds, setFocusedSiteIds}: SourcesPanelProps){
    const { t } = useLanguage()
    const [websites, setWebsites] = useState<GraphWebsite[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [query, setQuery] = useState("")

    const load = useCallback(async () => {
        setIsLoading(true)
        try {
            setWebsites(await requestWebsites())
        } catch(error){
            console.error("Request to load websites failed:", error)
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        if(open){
            load()
        }
    }, [open, load])

    const focused = useMemo(() => {
        return new Set(focusedSiteIds)
    }, [focusedSiteIds])

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase()
        if(!q){
            return websites
        }
        return websites.filter(w => 
            w.title?.toLowerCase().includes(q) || w.url.toLowerCase().includes(q)
        )
    }, [websites, query])

    const toggle = (id: string) => {
        setFocusedSiteIds(
            focused.has(id) ? focusedSiteIds.filter(x => x !== id) : [...focusedSiteIds, id]
        )
    }
    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetContent side="left" className="w-[88%] sm:max-w-md">
                <SheetHeader className="pb-0">
                    <SheetTitle>{t("sources.title")}</SheetTitle>
                    <SheetDescription>{t("sources.description")}</SheetDescription>
                </SheetHeader>

                <div className="flex items-center gap-2 px-4">
                    <Input
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder={t("sources.filter")}
                        className="h-8"
                    />
                    <Button variant="ghost" size="sm" onClick={load} disabled={isLoading}>
                        <RefreshCw className={cn("size-4", isLoading && "animate-spin")} />
                    </Button>
                </div>

                <div className="flex items-center justify-between px-4 text-xs text-muted-foreground">
                    <span>
                        {focusedSiteIds.length > 0
                            ? `${focusedSiteIds.length} / ${websites.length} ${t("sources.focused")}`
                            : `${websites.length} ${t("sources.count")}`}
                    </span>
                    {focusedSiteIds.length > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2"
                            onClick={() => setFocusedSiteIds([])}
                        >
                            {t("sources.clear")}
                        </Button>
                    )}
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
                    {filtered.length === 0 && !isLoading && (
                        <p className="py-8 text-center text-sm text-muted-foreground">
                            {t("sources.empty")}
                        </p>
                    )}

                    <ul className="flex flex-col gap-1">
                        {filtered.map(site => {
                            const active = focused.has(site.id)
                            return (
                                <li key={site.id} className="flex items-start gap-1">
                                    <button
                                        type="button"
                                        onClick={() => toggle(site.id)}
                                        aria-pressed={active}
                                        className={cn(
                                            "flex min-w-0 flex-1 items-start gap-2 rounded-md border p-2 text-left transition-colors",
                                            active
                                                ? "border-primary bg-primary/10"
                                                : "border-transparent hover:bg-muted"
                                        )}
                                    >
                                        <span className={cn(
                                            "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm border",
                                            active
                                                ? "border-primary bg-primary text-primary-foreground"
                                                : "border-muted-foreground/40"
                                        )}>
                                            {active && <Check className="size-3" />}
                                        </span>

                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-medium">
                                                {site.title || hostOf(site.url)}
                                            </span>
                                            <span className="block truncate text-xs text-muted-foreground">
                                                {hostOf(site.url)}{pathOf(site.url)}
                                            </span>
                                            <span className="mt-0.5 block text-[10px] uppercase tracking-wide text-muted-foreground">
                                                {site.entity_count} {t("sources.entities")}
                                                {" · "}
                                                {new Date(site.updated_at!).toLocaleDateString()}
                                            </span>
                                        </span>
                                    </button>

                                    <a
                                        href={site.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="mt-2.5 shrink-0 p-1 text-muted-foreground hover:text-foreground"
                                        title={site.url}
                                    >
                                        <ExternalLink className="size-3.5" />
                                    </a>
                                </li>
                            )
                        })}
                    </ul>
                </div>
            </SheetContent>
        </Sheet>
    )
}