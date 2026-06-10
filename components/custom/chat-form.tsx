
import { Button } from "@/components/ui/button"


export function Chat({currentUrl}: {currentUrl: string}){
    return (
        <Button>
            {currentUrl}
        </Button>
    )
}