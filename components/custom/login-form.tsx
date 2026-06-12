import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { GraduationCap } from "lucide-react"
import { useLanguage } from "@/hooks/language-hook"
import { useAuth } from "@/hooks/authentication-hook"
import { login } from "@/lib"

interface LoginProps {
    setCurrentView: (view: string) => void
}

export function Login({
    setCurrentView
}: LoginProps){
    const [userName, setUserName] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    const { t } = useLanguage()
    const { checkAuth } = useAuth()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setIsLoading(true)
        
        try {
            await login({ username: userName, password: password})
            checkAuth()
            setCurrentView("home")
        } catch(error){
            console.error("Could not Login User: ", error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <Card className="overflow-hidden p-0">
                <CardContent className="grid p-0">
                    <form className="p-6 md:p-8" onSubmit={handleLogin}>
                        <FieldGroup>
                            <div className="flex flex-col items-center gap-2 text-center">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2">
                                    <GraduationCap className="w-8 h-8 text-primary" />
                                </div>
                                <h1 className="text-2xl font-bold">{t("login.title")}</h1>
                                <p className="text-muted-foreground text-balance">
                                    {t("login.subtitle")}
                                </p>
                            </div>
                            {error && (
                                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                                    {error}
                                </div>
                            )}
                            <Field>
                                <FieldLabel htmlFor="username">{t("login.username")}</FieldLabel>
                                <Input
                                    id="username"
                                    type="text"
                                    placeholder={t("login.username.placeholder")}
                                    value={userName}
                                    onChange={(e) => setUserName(e.target.value)}
                                    required
                                    disabled={isLoading}
                                />
                            </Field>
                            <Field>
                                <div className="flex items-center">
                                    <FieldLabel htmlFor="password">{t("login.password")}</FieldLabel>
                                </div>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder={t("login.password.placeholder")}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={isLoading}
                                />
                            </Field>
                            <Field>
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading ? t("login.button.loading") : t("login.button")}
                                </Button>
                            </Field>
                        </FieldGroup>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}