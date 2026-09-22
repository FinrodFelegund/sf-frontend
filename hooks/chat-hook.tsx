import { useState, useEffect } from "react"
import { ChatMessage, fetchChatHistoryByUrl, sendChatStream, ApiError, type Message, type Sitedata } from "@/lib"


interface chatSessionProps {
    currentSite: Sitedata,
    initialMessages?: Message[],
}

export function useChatSession({
    currentSite,
    initialMessages = []
}: chatSessionProps){
    const [messages, setMessages] = useState<Message[]>(initialMessages)
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        async function loadChatHistory(){
            if(!currentSite.url){
                return
            }
            try {
                const history = await fetchChatHistoryByUrl(currentSite.url)
                const chatMessages = history.messages.map((m: Message, i: number) => ({
                    chat_message_id: `history-${i}`,
                    role: m.role,
                    content: m.content,
                    citations: m.citations ?? [],
                    timestamp: new Date(),
                }))
                setMessages([...initialMessages, ...chatMessages])
            } catch(error){
                if(!(error instanceof ApiError && error.status === 401)){
                    console.error("Failed to load chat history:", error)
                }
            }
        }

        loadChatHistory()
    }, [currentSite])

    const sendMessage = async (input: string) => {
        if(!input.trim() || isLoading){
            return
        }

        if(!currentSite){
            return
        }

        const userMessage: ChatMessage = {
            text: currentSite.text,
            url: currentSite.url,
            message: {
                chat_message_id: Date.now().toString(),
                role: 'user',
                content: input.trim(),
                timestamp: new Date(),
            }
        }

        setMessages(prev => [...prev, userMessage.message])
        setIsLoading(true)

        const assistantPlaceholder : Message = {
            chat_message_id: (Date.now() + 1).toString(),
            role: "assistant",
            content: "",
            timestamp: new Date(),
        }

        setMessages(prev => [...prev, assistantPlaceholder])
        try {
            const stream = sendChatStream(userMessage)

            let fullContent = ""
            for await (const chunk of stream){
                if(chunk.error){
                    setMessages(prev => prev.map(msg =>
                        msg.chat_message_id === assistantPlaceholder.chat_message_id
                            ? { ...msg, error: chunk.error }
                            : msg
                    ))
                    continue
                }
                if(chunk.content){
                    fullContent += chunk.content
                    setMessages(prev => prev.map(msg => 
                        msg.chat_message_id === assistantPlaceholder.chat_message_id ? { ...msg, content: fullContent } : msg
                    ))
                }

                if(chunk.citations){
                    setMessages(prev => prev.map(msg =>
                        msg.chat_message_id === assistantPlaceholder.chat_message_id
                        ? { ...msg, citations: chunk.citations}
                        : msg
                    ))
                }

                if(chunk.done){
                    break
                }
            }
        } catch(error){
            console.error("Streaming error:", error)
            setMessages(prev => prev.flatMap(msg => {
                if(msg.chat_message_id !== assistantPlaceholder.chat_message_id){
                    return [msg]
                }
                return msg.content ? [{ ...msg, error: "connection-lost" }] : []
            }))
        } finally {
            setIsLoading(false)
        }
    }


    return {
        messages,
        isLoading,
        sendMessage,
    }
}