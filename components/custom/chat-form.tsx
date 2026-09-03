import { Bot, User, Send, Trash } from "lucide-react"

import { MarkdownMessage } from "@/components/custom/markdown-message"
import { useLanguage } from "@/hooks/language-hook"
import { useChatSession } from "@/hooks/chat-hook"
import { useState, useEffect, useRef } from "react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { highlightSources, clearSourceHighlights, type Sitedata, type Message } from "@/lib"


export function Chat({currentSite, initialMessages}: {currentSite: Sitedata, initialMessages: Message[]}){
    const { t } = useLanguage()
    const [input, setInput] = useState("")
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    const { messages, isLoading, sendMessage } = useChatSession({currentSite, initialMessages})

    const hoverTimer = useRef<number | null>(null)

    const handleMessageEnter = (message: Message) => {
        if(message.role !== "assistant" || !message.citations?.length){
            return
        }
        if(hoverTimer.current !== null){
            window.clearTimeout(hoverTimer.current)
        }
        hoverTimer.current = window.setTimeout(
            () => highlightSources(message.citations ?? []),
            120
        )
    }

    const handleMessageLeave = () => {
        if(hoverTimer.current !== null){
            window.clearTimeout(hoverTimer.current)
            hoverTimer.current = null
        }
        clearSourceHighlights()
    }

    useEffect(() => {
        if(hoverTimer.current !== null){
            window.clearTimeout(hoverTimer.current)
        }
        clearSourceHighlights()
    }, [])

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if(e.key === "Enter" && !e.shiftKey){
            e.preventDefault()
            handleSend()
        }
    }

    const  handleSend = async () => {
        if(!input.trim() || isLoading){
            return
        }
        setInput("")
        sendMessage(input.trim())
    } 

    const handleDelete = () => {
        if(isLoading){
            return
        }
        console.log("Deleting chat")
        setInput("")
    }

    useEffect(() => {
        scrollToBottom()
        //setIsLoading(false)
    }, [messages])

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] w-full bg-background">
            {/* Header */}
            <div className="border p-4 resize-y overflow-auto min-h-[100px] max-h-[200px]">
                <div className="flex flex-col gap-2 min-w-0">
                    {/* Some information about the url or w/e */}
                    <div className="flex items-center w-full">
                        <p className="text-sm text-muted-foreground">
                            {currentSite ? currentSite.url : ""}
                        </p>
                    </div>
                </div>
            </div>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {messages.map((message) => (
                    <div key={message.chat_message_id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {message.role === 'assistant' && (
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                                <Bot className="w-5 h-5 text-primary-foreground" />
                            </div>
                        )}
                        <div 
                            onMouseEnter={() => handleMessageEnter(message)}
                            onMouseLeave={handleMessageLeave}
                            className={`max-w-[70%] rounded-lg px-4 py-2 transition-shadow ${
                                message.role === 'user'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted'
                            } ${
                                message.role === 'assistant' && message.citations?.length 
                                    ? 'cursor-help ring-1 ring-transparent hover:ring-primary/40'
                                    : ''
                            }`}
                        >
                            {message.content ? (
                                <>
                                    {message.role === 'assistant' ? <MarkdownMessage content={message.content} /> : <p className="text-sm whitespace-pre-wrap">{message.content}</p>}
                                    <span className="text-xs opacity-70 mt-1 block">
                                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' })}
                                    </span>
                                </>
                            ) : (
                                <div className="flex gap-1 py-1">
                                    <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            )}
                        </div>
                        {message.role === 'user' && (
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                                <User className="w-5 h-5 text-secondary-foreground"/>
                            </div>
                        )}
                    </div>
                ))}
                <div ref={messagesEndRef}/>
            </div>
            <div className="border-t px-6 py-4 flex-shrink-0">
                <div className="flex gap-2">
                    <Input 
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyUp={handleKeyPress}
                        placeholder={t("chat.placholder")}
                        disabled={isLoading}
                        className="flex-1"
                    />
                    <Button onClick={handleSend} disabled={isLoading} size="icon">
                        <Send className="w-4 h-4" />
                    </Button>
                    <Button onClick={() => setDeleteDialogOpen(true)} disabled={isLoading} size="icon">
                        <Trash className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("chat.delete.title")}</DialogTitle>
                        <DialogDescription>
                            {t("chat.delete.dicription")}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                            {t("chat.delete.cancel")}
                        </Button>
                        <Button onClick={() => { setDeleteDialogOpen(false); handleDelete()}}>
                            {t("chat.delete.confirm")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>

    )
}