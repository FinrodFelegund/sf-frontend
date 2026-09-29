import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {  useEffect, useState } from "react"
import { useLanguage } from "@/hooks/language-hook"

export function Options(){
    const [serverUrl, setServerUrl] = useState("http://localhost:8000")
    const { t } = useLanguage()

    const getUrlFromStore = async () => {
        const url = await chrome.storage.local.get(["serverurl"])
        if(url && typeof url.serverurl === "string"){
            setServerUrl(url.serverurl)
        }
    }

    const setUrlInStore = async () => {
        console.log("Setting server url")
        await chrome.storage.local.set({"serverurl": serverUrl})
    }

    useEffect(() => {
        getUrlFromStore()
    }, [])

    return (
        <main className="w-[400px] p-4 flex flex-col items-center text-center bg-background text-foreground">
            <p className="text-sm text-muted-foreground mb-4">
                {t("options.set-serverurl")}
            </p>
            <div>
                <Input
                    value={serverUrl}
                    onChange={e => setServerUrl(e.target.value)}
                    onKeyDown={async (e) => {
                        if(e.key === "Enter"){
                            e.preventDefault()
                            await setUrlInStore()
                        }
                    }}
                    className="h-8 pl-7 pr-7"
                >
                </Input>
                <div className="flex flex-row">
                    <Button
                        variant="outline"
                        onClick={async () => {await setUrlInStore()}}  
                    >
                        {t("common.confirm")}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={async () => {await getUrlFromStore()}}
                    >
                        {t("common.restore")}
                    </Button>
                </div>
            </div>
        </main>
    )
}