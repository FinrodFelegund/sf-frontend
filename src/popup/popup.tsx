import { Button } from "@/components/ui/button"
import { useLanguage } from "@/hooks/language-hook"

export function Popup(){
    const { t } = useLanguage()
    const handleOpenSidePanel= async () => {
        try {
  
                const currentWindow = await chrome.windows.getCurrent()
                if(currentWindow.id){
                    await chrome.sidePanel.open({ windowId: currentWindow.id})
                }
    
                window.close()

        } catch(error) {
            console.error("Error opening side panel: ", error)
        }
    }
    
    return (
        <main className="w-[250px] p-4 flex flex-col items-center text-center bg-background text-foreground">
            <p className="text-sm text-muted-foreground mb-4">
                {t("popup.description")}
            </p>

            <Button 
                onClick={() => handleOpenSidePanel()}
                className="w-full"
            >
                {t("popup.open")}
            </Button>
        </main>
    )
}