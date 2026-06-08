import { Button } from "@/components/ui/button"

export function Popup(){
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
                Storyfinder works best in the side panel for a persistent experience.
            </p>

            <Button 
                onClick={handleOpenSidePanel}
                className="w-full"
            >
                Open Side Panel
            </Button>
        </main>
    )
}