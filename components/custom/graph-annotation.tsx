import {
    Card,
    CardContent,
    //CardFooter,
    //CardHeader,
} from "@/components/ui/card"

import {
    Combobox,
    ComboboxContent,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from "@/components/ui/combobox"

import { Button } from "@/components/ui/button"
import { SetStateAction, useState } from "react"
import { GraphLink, GraphNode, Sitedata, cn } from "@/lib"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Plus } from "lucide-react"

type EntityLabel = {
    readable: string,
    spacy: string,
}

const entityTypes: EntityLabel[] = [
    {readable: "Person", spacy:"PERSON"},
    {readable: "Organisations", spacy:"ORG"},
    {readable: "Geopolitical Entities", spacy:"GPE"},
    {readable: "Location", spacy:"LOC"},
    {readable: "Nationalities or political or religious groups", spacy:"NORP"},
]

interface GraphAnnotationProps {
    className: string,
    currentSite: Sitedata,
    addEntity: (entity: GraphNode) => {},
    addRelation: (relation: GraphLink) => {},
    isLoading: boolean
}

export function GraphAnnotation({ className, currentSite, addEntity, addRelation, isLoading }: GraphAnnotationProps){
    currentSite
    const [currentView, setCurrentView] = useState<"Nodes" | "Links">("Nodes")
    const [curEntityType, setCurEntityType] = useState("PERSON")

    
    const setEntityType = (ent: string) => {
        setCurEntityType(ent)
    }

    const setView = (view: SetStateAction<"Nodes" | "Links">) => {
        setCurrentView(view)
    }

    const handleAddEntity = () => {
        const entity = {id: "-1", label: curEntityType, caption: "Fred"}
        addEntity(entity)
    }

    const handleAddRelation = () => {
        const relation = {source: "-1", target: "-2"}
        addRelation(relation)
    }

    return (
        <div className={cn(className, "flex", "flex-row", "gap-6", "items-start")}>
            {/* Left: the form menu */}
            <Card className="flex-1">
                <CardContent>
                    {currentView === "Nodes" ? (
                        <div className="flex flex-col gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="caption">Caption</Label>
                                <Input
                                    id="caption"
                                    type="text"
                                    placeholder="Entity Name"
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="entityType">Entity Type</Label>
                                <Combobox
                                    items={entityTypes}
                                    itemToStringLabel={(enttype: EntityLabel) => {setEntityType(enttype.spacy); return enttype.readable}}
                                >
                                    <ComboboxInput placeholder="Select an Entity Type" />
                                    <ComboboxContent>
                                        <ComboboxList>
                                            {(enttype: EntityLabel) => (
                                                <ComboboxItem key={enttype.spacy} value={enttype}>
                                                    {enttype.readable}
                                                </ComboboxItem>
                                            )}
                                        </ComboboxList>
                                    </ComboboxContent>
                                </Combobox>
                            </div>
                            <div className="grid gap-2">
                                <Button onClick={handleAddEntity} disabled={isLoading} size="icon">
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="source">Source</Label>
                                <Input
                                    id="source"
                                    type="text"
                                    placeholder="Source Entity"
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="target">Target</Label>
                                <Input
                                    id="target"
                                    type="text"
                                    placeholder="Target Entity"
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Button onClick={handleAddRelation} disabled={isLoading} size="icon">
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Right: the toggle buttons */}
            <div className="flex flex-col gap-2">
                <Button
                    type="button"
                    variant={currentView === "Nodes" ? "default" : "outline"}
                    onClick={() => setView("Nodes")}
                >
                    Nodes
                </Button>
                <Button
                    type="button"
                    variant={currentView === "Links" ? "default" : "outline"}
                    onClick={() => setView("Links")}
                >
                    Links
                </Button>
            </div>
        </div>    
    )
}