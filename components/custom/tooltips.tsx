import { type GraphLink, type GraphNode, type GraphSentence } from "@/lib"
import { Button } from "@/components/ui/button"
import { Trash } from "lucide-react"

const HEAD_WORDS = 5
const TAIL_WORDS = 5

export function truncateMiddle(text: string): string {
    const words = text.trim().split(/\s+/)
    if(words.length <= HEAD_WORDS + TAIL_WORDS){
        return text.trim()
    }
    return `${words.slice(0, HEAD_WORDS).join(" ")} ... ${words.slice(-TAIL_WORDS).join(" ")}`
}

export function hostname(url: string): string {
    try {
        return new URL(url).hostname.replace(/^www\./, "")
    } catch {
        return url
    }
}

const endCaption = (end: string | GraphNode): string =>
    typeof end === "string" ? end : end.caption

export function NodeTooltip({ node, deleteNode }: { node: GraphNode, deleteNode: (node: GraphNode) => Promise<void>}) {
    const websites = node.websites ?? []

    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex flex-row items-start justify-between gap-4">
                <div className="flex flex-col gap-1.5">
                    <p className="text-sm font-medium leading-tight">
                        {node.caption}
                    </p>
                    <span className="w-fit rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {node.label}
                    </span>
                </div>
                {websites.length === 0 && (
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteNode(node)}
                    >
                        <Trash className="w-4 h-4" />
                    </Button>
                )}
            </div>

            {websites.length > 0 && (
                <>
                    <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
                        <span>Found on</span>
                        <span>{websites.length}</span>
                    </div>
                    <div className="max-h-24 overflow-y-auto overscroll-contain rounded-md border border-border">
                        {websites.map(site => (
                            <p
                                key={site.id}
                                title={site.url}
                                className="truncate border-b border-border/50 px-2 py-1 text-xs last:border-b-0"
                            >
                                {hostname(site.url)}
                            </p>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}

export function LinkTooltip({ link }: { link: GraphLink }){
    const sentences = link.sentences ?? []

    const groups = new Map<string, GraphSentence[]>()
    for(const sentence of sentences){
        const key = sentence.website ? hostname(sentence.website) : ""
        if(!groups.has(key)){
            groups.set(key, [])
        }
        groups.get(key)!.push(sentence)
    }

    return (
        <div className="flex flex-col gap-2">
            <p className="text-sm leading-tight">
                <span className="font-medium">{endCaption(link.source)}</span>
                <span className="mx-1 text-muted-foreground">{link.relation_type ?? "-"}</span>
                <span className="font-medium">{endCaption(link.target)}</span>
            </p>

            {sentences.length > 0 && (
                <>
                    <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
                        <span>Sentences</span>
                        <span>{sentences.length}</span>
                    </div>

                    <div className="max-h-32 overflow-y-auto overscroll-contain rounded-md border border-border">
                        {[...groups.entries()].map(([site, items]) => (
                            <div key={site || "ungrouped"}>
                                {site && (
                                    <p className="sticky top-0 truncate bg-muted px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                        {site}
                                    </p>
                                )}
                                {items.map((sentence, i) => (
                                    <p
                                        key={sentence.id ?? i}
                                        title={sentence.text}
                                        className="border-b border-border/50 px-2 py-1.5 text-xs leading-snug last:border-b-0"
                                    >
                                        {truncateMiddle(sentence.text)}
                                    </p>
                                ))}
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}