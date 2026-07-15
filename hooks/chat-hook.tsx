import { useState, useEffect } from "react"
import { ChatMessage, fetchChatHistoryByUrl, sendChatStream, type Message, type Sitedata } from "@/lib"


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
            const history = await fetchChatHistoryByUrl(currentSite.url)
            const chatMessages = history.messages.map((m: Message) => ({
                id: Date.now().toString(),
                role: m.role,
                content: m.content,
                timestamp: new Date(Date.now()),
            }
            ))

            setMessages([...initialMessages, ...chatMessages])
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
                if(chunk.content){
                    fullContent += chunk.content
                    setMessages(prev => prev.map(msg => 
                        msg.chat_message_id === assistantPlaceholder.chat_message_id ? { ...msg, content: fullContent } : msg
                    ))
                }

                if(chunk.done){
                    break
                }
            }
        } catch(error){
            console.error("Streaming error:", error)
            setMessages(prev => prev.filter(msg => msg.chat_message_id !== assistantPlaceholder.chat_message_id))
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