import { Users, Lightbulb, BookOpen } from "lucide-react"

const APP_VERSION = "3.0.1"

export function Home(){
    return (
        <div className="text-center space-y-6 mb-12">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
                {"Storyfinder"} 
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                {"home.subtitle"}
            </p>
            <div className="inline-flex items-center justify-center">
                <span className="text-xs font-medium px-2.5 py-1 rounded-full border bg-muted text-muted-foreground">
                    v{APP_VERSION}
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full mt-16">
                <div className="flex flex-col items-center text-center p-6 rounded-lg border bg-card hover:shadow-lg transition-shadow">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        <Users className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{"home.teamwork"}</h3>
                    <p className="text-sm text-muted-foreground">
                        {"home.teamwork.desc"}
                    </p>
                </div>
                <div className="flex flex-col items-center text-center p-6 rounded-lg border bg-card hover:shadow-lg transition-shadow">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        <Lightbulb className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{"home.problemsolving"}</h3>
                    <p className="text-sm text-muted-foreground">
                        {"home.problemsolving.desc"}
                    </p>
                </div>
                <div className="flex flex-col items-center text-center p-6 rounded-lg border bg-card hover:shadow-lg transition-shadow">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        <BookOpen className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{"home.knowledge"}</h3>
                    <p className="text-sm text-muted-foreground">
                        {"home.knowledge.desc"}
                    </p>
                </div>
            </div>
        </div>
    )
    
}