import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import { getUser, getAuthToken, removeAuthToken, User } from "@/lib"

type AuthContextType = {
    isAuthenticated: boolean,
    user: User | null,
    setIsAuthenticated: (value: boolean) => void,
    setUser: (user: User) => void,
    checkAuth: () => Promise<void>,
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({children} : { children: ReactNode}){
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [user, setUser] = useState<User | null>(null)

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
            removeAuthToken()
            setUser(null)
            setIsAuthenticated(false)
        }

    }, [])

    useEffect(() => {
        checkAuth()
    }, [checkAuth])

    return (
        <AuthContext.Provider
            value={{ isAuthenticated, user, setIsAuthenticated, setUser, checkAuth }}
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

