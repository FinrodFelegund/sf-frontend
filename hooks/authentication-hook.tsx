import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import { getUser, getAuthToken, removeAuthToken, User, UNAUTHORIZED_EVENT, removeUser } from "@/lib"

type AuthContextType = {
    isAuthenticated: boolean,
    isReady: boolean,
    user: User | null,
    setIsAuthenticated: (value: boolean) => void,
    setUser: (user: User) => void,
    checkAuth: () => Promise<void>,
    sessionExpired: boolean,
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({children} : { children: ReactNode}){
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [isReady, setIsReady] = useState(false)
    const [user, setUser] = useState<User | null>(null)
    const [sessionExpired, setSessionExpired] = useState(false)

    const checkAuth = useCallback(async () => {

        try {
            const token = await getAuthToken()
            if(!token){
                throw new Error("No authentication token")
            }
            const user = await getUser()
            if(!user){
                throw new Error("No active user")
            }

            setUser(user)
            setIsAuthenticated(true)

        } catch {
            await removeAuthToken()
            await removeUser()
            setUser(null)
            setIsAuthenticated(false)
            setSessionExpired(true)
        } finally {
            setIsReady(true)
        }

    }, [])

    useEffect(() => {
        checkAuth()
    }, [checkAuth])

    useEffect(() => {
        const onUnautherized = () => {
            setUser(null)
            setIsAuthenticated(false)
            setSessionExpired(true)
            setIsReady(true)
        }
        window.addEventListener(UNAUTHORIZED_EVENT, onUnautherized)
        return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnautherized)
    }, [])

    return (
        <AuthContext.Provider
            value={{ isAuthenticated, isReady, user, setIsAuthenticated, setUser, checkAuth, sessionExpired }}
        >
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth(){
    const context = useContext(AuthContext)
    if(!context){
        throw new Error("useAuth must be used within AuthProvider")
    }

    return context
}

