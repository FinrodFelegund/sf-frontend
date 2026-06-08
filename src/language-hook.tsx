import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react"

type Language = "de" | "en"

type LanguageContextType = {
    language: Language
    setLanguageState: (lang: Language) => void
    t: (key: string) => string
}

const translations: Record<Language, Record<string, string>> = {
    de: {
        "common": "Natürlich"
    },
    en: {
        "common": "Common"
    }
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: {children: ReactNode}){
    const [language, setLanguage] = useState<Language>("de")

    const loadLanguage = useCallback(async () => {
        const saved = await chrome.storage.local.get(['language'])
        if(saved.language === "de" || saved.language === "en"){
            setLanguage(saved.language)
        }
    }, [])

    useEffect(() => {
        loadLanguage()
    }, [loadLanguage])

    const setLanguageState = async (lang: Language) => {
        setLanguage(lang)
        await chrome.storage.local.set({"langauge": lang})
    }

    const t = (key: string) => {
        return translations[language][key] || key
    }


    return (
        <LanguageContext.Provider value={{ language, setLanguageState, t}}>
            {children}
        </LanguageContext.Provider>
    )
}

export function useLanguage(){
    const context = useContext(LanguageContext)
    if(!context){
        throw new Error("useLanguage must be used inside LanguageProvider")
    }

    return context
}