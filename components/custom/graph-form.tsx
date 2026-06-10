import { Button } from "@/components/ui/button"


export function Graph({currentUrl}: {currentUrl: string}){
    return (
        <Button>
            {currentUrl}
        </Button>
    )
}