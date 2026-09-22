import { useCallback, useEffect, useMemo, useState } from "react"
import {
    Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ExternalLink, Network, Quote } from "lucide-react"
import { requestEntityDetail } from "@/lib/graph"
import type { EntityDetail } from "@/lib"
import { useLanguage } from "@/hooks/language-hook"
import { cn } from "@/lib"

const hostOf = (url: string) => {
    try { return new URL(url).hostname.replace(/^www\./, "") } catch { return url }
}

type Tab = "relations" | "sources"

type EntityDetailPanelProps = {
    entityId: string | null,
    onClose: () => void,
    onOpenEntity: (id: string) => void,
    getColor: (label: string) => string,
    onToggleExpand: (id: string) => void,
    isExpanded: boolean,
}

export function EntityDetailPanel({
    entityId, onClose, onOpenEntity, getColor, onToggleExpand, isExpanded
}: EntityDetailPanelProps){
    const { t } = useLanguage()
    const [tab, setTab] = useState<Tab>("relations")
    const [detail, setDetail] = useState<EntityDetail | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [expandedSources, setExpandedSources] = useState<string[]>([])

    useEffect(() => {
        if(!entityId){
            setDetail(null)
            return
        }

        let cancelled = false
        setIsLoading(true)
        setError(null)
        setDetail(null)
        setExpandedSources([])

        requestEntityDetail(entityId)
            .then(result => { if(!cancelled) setDetail(result) })
            .catch(err => {
                console.error("Loading entity detail failed:", err)
                if(!cancelled) setError(t("detail.error"))
            })
            .finally(() => { if(!cancelled) setIsLoading(false) })

        return () => { cancelled = true }
    }, [entityId, t])

    const toggleSource = useCallback((id: string) => {
        setExpandedSources(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        )
    }, [])

    const accent = useMemo(
        () => detail ? getColor(detail.entity.label) : "#999999",
        [detail, getColor]
    )

    return (
        <Sheet open={entityId != null} onOpenChange={(open) => { if(!open) onClose() }}>
            <SheetContent side="right" className="w-[92%] sm:max-w-md">
                <SheetHeader className="pb-0">
                    <div className="flex items-start gap-2">
                        <span
                            className="mt-1.5 size-3 shrink-0 rounded-full"
                            style={{ backgroundColor: accent }}
                        />
                        <div className="min-w-0 flex-1">
                            <SheetTitle className="truncate">
                                {detail?.entity.caption ?? t("detail.loading")}
                            </SheetTitle>
                            <SheetDescription>
                                {detail
                                    ? `${detail.entity.label} · ${detail.entity.website_count} ${t("detail.sites")} · ${detail.entity.occurrence_count}×`
                                    : "\u00A0"}
                            </SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                {detail && detail.entity.aliases.length > 0 && (
                    <div className="px-4 pb-1">
                        <p className="text-xs text-muted-foreground">
                            {t("detail.also-known-as")}{" "}
                            {detail.entity.aliases.map(a => a.caption).join(", ")}
                        </p>
                    </div>
                )}

                <div className="flex gap-1 border-b border-border px-4">
                    {(["relations", "sources"] as Tab[]).map(name => (
                        <button
                            key={name}
                            type="button"
                            onClick={() => setTab(name)}
                            className={cn(
                                "-mb-px border-b-2 px-2 py-1.5 text-sm transition-colors",
                                tab === name
                                    ? "border-foreground font-medium text-foreground"
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                            aria-selected={tab === name}
                            role="tab"
                        >
                            {t(`detail.tab.${name}`)}
                            {detail && (
                                <span className="ml-1.5 text-xs tabular-nums text-muted-foreground">
                                    {name === "relations" ? detail.relations.length : detail.sources.length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
                    {isLoading && (
                        <div className="flex flex-col gap-2 pt-3">
                            {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-9 w-full" />)}
                        </div>
                    )}

                    {error && <p role="alert" className="pt-6 text-sm text-destructive">{error}</p>}

                    {detail && tab === "relations" && (
                        detail.relations.length === 0
                            ? <p className="pt-6 text-center text-sm text-muted-foreground">{t("detail.no-relations")}</p>
                            : (
                                <ul className="flex flex-col divide-y divide-border">
                                    {detail.relations.map(relation => (
                                        <li key={relation.id}>
                                            <button
                                                type="button"
                                                onClick={() => onOpenEntity(relation.neighbour.id)}
                                                className="flex w-full items-center gap-2.5 py-2 text-left hover:bg-muted/60"
                                            >
                                                {/* legacy's strength bar, laid on its side for a narrow panel */}
                                                <span
                                                    className="h-6 w-1 shrink-0 rounded-sm bg-muted"
                                                    title={`${relation.count} ${t("detail.mentions")}`}
                                                >
                                                    <span
                                                        className="block w-full rounded-sm"
                                                        style={{
                                                            height: `${Math.max(relation.score, 6)}%`,
                                                            backgroundColor: getColor(relation.neighbour.label),
                                                        }}
                                                    />
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-sm font-medium">
                                                        {relation.neighbour.caption}
                                                    </span>
                                                    <span className="block truncate text-xs text-muted-foreground">
                                                        {relation.relation_type || "—"}
                                                    </span>
                                                </span>
                                                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                                                    {relation.count}
                                                </span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )
                    )}

                    {detail && tab === "sources" && (
                        detail.sources.length === 0
                            ? <p className="pt-6 text-center text-sm text-muted-foreground">{t("detail.no-sources")}</p>
                            : (
                                <ul className="flex flex-col gap-3 pt-3">
                                    {detail.sources.map(source => {
                                        const open = expandedSources.includes(source.id)
                                        const hidden = source.sentence_count - source.sentences.length

                                        return (
                                            <li key={source.id} className="rounded-md border border-border p-2.5">
                                                <div className="flex items-start gap-2">
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-medium">
                                                            {source.title || hostOf(source.url)}
                                                        </p>
                                                        <p className="truncate text-xs text-muted-foreground">
                                                            {hostOf(source.url)} · {source.occurrences}× ·{" "}
                                                            {new Date(source.updated_at).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                    <a
                                                        href={source.url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="shrink-0 p-0.5 text-muted-foreground hover:text-foreground"
                                                        title={source.url}
                                                    >
                                                        <ExternalLink className="size-3.5" />
                                                    </a>
                                                </div>

                                                {source.sentences.length > 0 && (
                                                    <div className={cn("mt-2 flex flex-col gap-1.5", !open && "max-h-40 overflow-hidden")}>
                                                        {source.sentences.map(sentence => (
                                                            <p key={sentence.id} className="flex gap-1.5 text-xs leading-relaxed text-muted-foreground">
                                                                <Quote className="mt-0.5 size-3 shrink-0 opacity-50" />
                                                                <span>{sentence.text}</span>
                                                            </p>
                                                        ))}
                                                    </div>
                                                )}

                                                {hidden > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleSource(source.id)}
                                                        className="mt-1.5 text-xs text-muted-foreground underline-offset-2 hover:underline"
                                                    >
                                                        {open ? t("detail.less") : `+${hidden} ${t("detail.more-sentences")}`}
                                                    </button>
                                                )}
                                            </li>
                                        )
                                    })}
                                </ul>
                            )
                    )}
                </div>

                {detail && (
                    <div className="border-t border-border px-4 py-3">
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => { onToggleExpand(detail.entity.id); onClose() }}
                        >
                            <Network className="mr-1.5 size-4" />
                            {isExpanded ? t("detail.hide-neighbours") : t("detail.show-neighbours")}
                        </Button>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    )
}