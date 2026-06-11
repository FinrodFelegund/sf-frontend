import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { GraduationCap } from "lucide-react"
import { useLanguage } from "@/src/language-hook"
import { register } from "@/lib"

interface RegisterProps {
    setCurrentView: (view: string) => void
}

export function Register({
    setCurrentView
}: RegisterProps){
    const [userName, setUserName] = useState("")
    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")

    const [error, setError] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [showUnlockModal, setShowUnlockModal] = useState(false)
    const [unlockCode, setUnlockCode] = useState<Array<number>>([])
    
    const { t } = useLanguage()

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setIsLoading(true)

        try {
            const registerResponse = await register({
                username: userName,
                firstname: firstName,
                lastname: lastName,
                password: password,
                email: email
            })
            setUnlockCode(registerResponse)
            setShowUnlockModal(true)
        } catch(error){
            console.error("Could not register user: ", error)
        }
    }

    const handleConfirmRegister = () => {
        unlockCode
        setCurrentView
    }


    return (
        <div className="flex flex-col gap-6">
            <Card className="overflow-hidden p-0">
                <CardContent className="grid p-0">
                    <form className="p-6 md:p-8" onSubmit={handleRegister}>
                        <FieldGroup>
                            <div className="flex flex-col items-center gap-2 text-center">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2">
                                    <GraduationCap className="w-8 h-8 text-primary" />
                                </div>
                                <h1 className="text-2xl font-bold">{t("register.title")}</h1>
                                <p className="text-muted-foreground text-balance">
                                    {t("register.subtitle")}
                                </p>
                            </div>
                            {error && (
                                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                                    {error}
                                </div>
                            )}
                            <Field>
                                <FieldLabel htmlFor="username">{t("register.firstname")}</FieldLabel>
                                <Input
                                    id="firstname"
                                    type="text"
                                    placeholder={t("register.firstname.placeholder")}
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    required
                                    disabled={isLoading}
                                />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="username">{t("register.lastname")}</FieldLabel>
                                <Input
                                    id="lastname"
                                    type="text"
                                    placeholder={t("register.lastname.placeholder")}
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    required
                                    disabled={isLoading}
                                />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="username">{t("register.email")}</FieldLabel>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder={t("register.email.placeholder")}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={isLoading}
                                />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="username">{t("register.username")}</FieldLabel>
                                <Input
                                    id="username"
                                    type="text"
                                    placeholder={t("register.username.placeholder")}
                                    value={userName}
                                    onChange={(e) => setUserName(e.target.value)}
                                    required
                                    disabled={isLoading}
                                />
                            </Field>
                            <Field>
                                <div className="flex items-center">
                                    <FieldLabel htmlFor="password">{t("register.password")}</FieldLabel>
                                </div>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder={t("register.password.placeholder")}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={isLoading}
                                />
                            </Field>
                            <Field>
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading ? t("register.button.loading") : t("register.button")}
                                </Button>
                            </Field>
                        </FieldGroup>
                    </form>
                </CardContent>
            </Card>

            <Dialog open={showUnlockModal} onOpenChange={setShowUnlockModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("chat.delete.title")}</DialogTitle>
                        <DialogDescription>
                            {t("chat.delete.dicription")}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowUnlockModal(false)}>
                            {t("register.unlock.cancel")}
                        </Button>
                        <Button onClick={() => { handleConfirmRegister()}}>
                            {t("register.unlock.confirm")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}