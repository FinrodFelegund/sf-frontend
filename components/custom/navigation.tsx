import {
    NavigationMenu,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    navigationMenuTriggerStyle
    } from "@/components/ui/navigation-menu"

import { Button } from "@/components/ui/button"

import { LogOut, Moon, Sun } from "lucide-react"

import { useAuth } from "@/src/authentication-hook"
import { useLanguage } from "@/src/language-hook"
import { useTheme } from "@/src/theme-hook"
import { logout } from "@/lib"

interface NavigationProps {
    currentView: string,
    setCurrentView: (value: string) => void
}

export function Navigation({
    currentView,
    setCurrentView
}: NavigationProps) {
    const { isAuthenticated, checkAuth } = useAuth()
    const { language, setLanguageState } = useLanguage()
    const { theme, setThemeState } = useTheme()

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

    return (
        <header className="flex items-center justify-between p-2 border-b">
            <NavigationMenu>
                <NavigationMenuList>
                    <NavigationMenuItem>
                        <NavigationMenuLink
                            className={`${navigationMenuTriggerStyle()} cursor-pointer`}
                            onClick={() => setCurrentView("home")}
                            active={currentView==="home"}
                        >
                            Home
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
                                    Login
                                </NavigationMenuLink>
                            </NavigationMenuItem>

                            <NavigationMenuItem>
                                <NavigationMenuLink
                                    className={`${navigationMenuTriggerStyle()} cursor-pointer`}
                                    onClick={() => {setCurrentView("signup")}}
                                    active={currentView==="signup"}
                                >
                                    Sign Up
                                </NavigationMenuLink>
                            </NavigationMenuItem>
                        </>
                    )}

                    {isAuthenticated && (
                        <>
                            <NavigationMenuItem>
                                <NavigationMenuLink
                                    className={`${navigationMenuTriggerStyle()} cursor-pointer`}
                                    onClick={() => setCurrentView("graph")}
                                    active={currentView==="graph"}
                                >
                                    Graph
                                </NavigationMenuLink>
                            </NavigationMenuItem>

                            <NavigationMenuItem>
                                <NavigationMenuLink
                                    className={`${navigationMenuTriggerStyle()} cursor-pointer`}
                                    onClick={() => {setCurrentView("chat")}}
                                    active={currentView==="chat"}
                                >
                                    Chat
                                </NavigationMenuLink>
                            </NavigationMenuItem>
                        </>
                    )}
                </NavigationMenuList>
            </NavigationMenu>
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={toggleLanguage}
                    className="h-9 w-9"
                >
                    <span>
                        {language === "de" ? "DE" : "EN"}
                    </span>
                    <span className="sr-only">Toggle Language</span>
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
                {isAuthenticated && (
                    <Button 
                        variant="default"
                        size="sm"
                        className="gap-2"
                        onClick={handleLogout}
                    >
                        <LogOut className="w-4 h-4"/>
                        Log Out
                    </Button>
                )}
            </div>
        </header>
    )
}
