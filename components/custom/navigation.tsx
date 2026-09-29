import {
    NavigationMenu,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"

import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu"

import { Button } from "@/components/ui/button"

import { LogOut, Moon, Sun, Maximize2, Minimize2, ChevronDown } from "lucide-react"

import { useAuth } from "@/hooks/authentication-hook"
import { useLanguage } from "@/hooks/language-hook"
import { useTheme } from "@/hooks/theme-hook"
import { logout, isTabView } from "@/lib"
import { useEffect, useRef } from "react"

interface NavigationProps {
    currentView: string,
    currentGraph: string,
    setCurrentView: (value: string) => void,
    setCurrentGraph: (value: string) => void,
    currentUrl: string,
}

export function Navigation({
    currentView,
    currentGraph,
    setCurrentView,
    setCurrentGraph,
    currentUrl,
}: NavigationProps) {
    const { isAuthenticated, checkAuth } = useAuth()
    const { t, language, setLanguageState } = useLanguage()
    const { theme, setThemeState } = useTheme()
    const windowIdRef = useRef<number | null>(null)

    useEffect(() => {
        chrome.windows.getCurrent().then((w) => {
            windowIdRef.current = w.id ?? null
        })     
    }, [])

    const graphButtonLabel =
        currentView !== "graph"
            ? t("navigation.graph")
            : currentGraph === "local"
                ? t("graph.local")
                : currentGraph === "global"
                    ? t("graph.global")
                    : t("navigation.graph")

    const toggleLanguage = () => {
        setLanguageState(language === "de" ? "en" : "de")
    }

    const toggleTheme = () => {
        setThemeState(theme === "light" ? "dark" : "light")
    }

    const handleLogout = async () => {
        try {
            await logout()
            await checkAuth()
            setCurrentView("home")
        } catch(error){
            console.error("Logout failed: ", error)
        }
    }

    const handleSelectGraph = async (isLocalGraphSelected: boolean) => {
        const graphtype = isLocalGraphSelected ? "local" : "global"
        chrome.storage.local.set({"graphtype": graphtype})
        setCurrentView("graph")
        setCurrentGraph(graphtype)
    }

    const handleOpenInTab = async () => {
        try {
            await chrome.runtime.sendMessage({ action: "OPEN_IN_TAB" })

        } catch (error) {
            console.error("Could not open Storyfinder in a tab:", error)
            return
        }
        window.close()
    }

    const handleDockToPanel = () => {
        if(windowIdRef.current == null){
            return
        }

        chrome.sidePanel.open({ windowId: windowIdRef.current})
            .then(() => window.close())
            .catch(error => console.error("Could not open side panel", error))
    }
    

    return (
        <header className="flex flex-col gap-1 border-b p-2">
            <div className="flex flex-wrap items-center justify-between gap-2">            
                <NavigationMenu>
                    <NavigationMenuList>
                        <NavigationMenuItem>
                            <NavigationMenuLink
                                className={`${navigationMenuTriggerStyle()} cursor-pointer`}
                                onClick={() => {
                                    setCurrentView("home")
                                }}
                                active={currentView==="home"}
                            >
                                {t("navigation.home")}
                            </NavigationMenuLink>
                        </NavigationMenuItem>
                        {!isAuthenticated && (
                            <>
                                <NavigationMenuItem>
                                    <NavigationMenuLink
                                        className={`${navigationMenuTriggerStyle()} cursor-pointer`}
                                        onClick={() => setCurrentView("login")}
                                        active={currentView==="login"}
                                    >
                                        {t("navigation.login")}
                                    </NavigationMenuLink>
                                </NavigationMenuItem>

                                <NavigationMenuItem>
                                    <NavigationMenuLink
                                        className={`${navigationMenuTriggerStyle()} cursor-pointer`}
                                        onClick={() => {setCurrentView("register")}}
                                        active={currentView==="register"}
                                    >
                                        {t("navigation.register")}
                                    </NavigationMenuLink>
                                </NavigationMenuItem>
                            </>
                        )}

                        {isAuthenticated && (
                            <>
                                <NavigationMenuItem>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button className={`${navigationMenuTriggerStyle()} cursor-pointer`}>
                                                {graphButtonLabel}
                                                <ChevronDown className="ml-1 size-3.5" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="start" className="min-w-40">
                                            <DropdownMenuItem onSelect={() => handleSelectGraph(true)}>
                                                {t("navigation.localgraph")}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => handleSelectGraph(false)}>
                                                {t("navigation.globalgraph")}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </NavigationMenuItem>

                                <NavigationMenuItem>
                                    <NavigationMenuLink
                                        className={`${navigationMenuTriggerStyle()} cursor-pointer`}
                                        onClick={() => {
                                            setCurrentView("chat")
                                        }}
                                        active={currentView==="chat"}
                                    >
                                        {t("navigation.chat")}
                                    </NavigationMenuLink>
                                </NavigationMenuItem>
                            </>
                        )}
                    </NavigationMenuList>
                </NavigationMenu>
                <div className="flex shrink-0 items-center gap-1">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={toggleLanguage}
                        className="h-9 w-9"
                    >
                        <span>
                            {language === "de" ? "DE" : "EN"}
                        </span>
                        <span className="sr-only">{t("navigation.toggle-language")}</span>
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={toggleTheme}
                        className="h-9 w-9"
                    >
                        {theme === "dark" ? (
                            <Sun className="h-4 w-4" />
                        ): (
                            <Moon className="h-4 w-4" />
                        ) 
                        }
                    </Button>
                    {!isTabView && (
                        <Button
                            variant="ghost"
                            size="icon"
                            title={t("navigation.open-in-tab")}
                            onClick={handleOpenInTab}
                        >
                            <Maximize2 className="size-4" />
                        </Button>
                    )}
                    {isTabView && (
                        <Button
                            variant="ghost"
                            size="icon"
                            title={t("navigation.dock-to-panel")}
                            onClick={handleDockToPanel}
                        >
                            <Minimize2 className="size-4" />
                        </Button>
                    )}
                    {isAuthenticated && (
                        <Button 
                            variant="default"
                            size="sm"
                            className="gap-2"
                            onClick={handleLogout}
                        >
                            <LogOut className="w-4 h-4"/>
                            {t("navigation.logout")}
                        </Button>
                    )}
                </div>
            </div>
            {currentUrl && (
                <p
                    className="trucate px-2 text-xs text-muted-foreground"
                    title={currentUrl}
                >
                    {currentUrl}
                </p>
            )}
        </header>
    )
}
