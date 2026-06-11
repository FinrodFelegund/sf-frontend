import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'

export function MarkdownMessage({ content }: { content: string }){
    const markdown = useMemo(() => content, [content])

    return (
        <div className="text-sm markdown">
            <ReactMarkdown>
                {markdown}
            </ReactMarkdown>
        </div>
    )
}