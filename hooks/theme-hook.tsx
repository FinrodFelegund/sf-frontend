import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light" | "system"

type ThemeContextType = {
    theme: Theme,
    setThemeState: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: {children: ReactNode}){
    const [theme, setCurrentTheme] = useState<Theme>("system")

    const setThemeState = async (t: Theme) => {
        await chrome.storage.local.set({"theme": t})
        setCurrentTheme(t)
    }

    const loadTheme = useCallback(async () => {
        try {
            const currentTheme = await chrome.storage.local.get(["theme"])
            if(!currentTheme){
                setCurrentTheme("light")
            } else if(currentTheme.theme === "dark" || currentTheme.theme === "light"){
                setCurrentTheme(currentTheme.theme)
            }
        } catch(error){
            console.error("Could not load theme: ", error)
        }
    }, [])

    useEffect(() => {
        loadTheme()
        const root = window.document.documentElement
        root.classList.remove("light", "dark")

        if(theme === "system"){
            const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
            root.classList.add(systemTheme)
            return
        }

        root.classList.add(theme)
    }, [theme])

    return (
        <ThemeContext.Provider value={{ theme, setThemeState }}>
            {children}
        </ThemeContext.Provider>
    )
}

export const useTheme = () => {
    const context = useContext(ThemeContext)
    if(!context){
        throw new Error("useTheme must be used inside ThemeProvider")
    }

    return context
}