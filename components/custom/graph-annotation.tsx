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

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { Button } from "@/components/ui/button"
import { useState, useMemo } from "react"
import { GraphLink, GraphNode, Sitedata, cn } from "@/lib"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Plus, Trash, Upload } from "lucide-react"
import { useLanguage } from "@/hooks/language-hook"

type NodeLabel = {
    readable: string,
    spacy: string,
}

const NodeTypes: NodeLabel[] = [
    {readable: "Person", spacy:"PERSON"},
    {readable: "Organisation", spacy:"ORG"},
    {readable: "Geopolitical Entities", spacy:"GPE"},
    {readable: "Location", spacy:"LOC"},
    {readable: "Nationalities or political or religious groups", spacy:"NORP"},
]

interface AddNodeProps {
    isLoading: boolean,
    currentSite: Sitedata,
    handleAddNode: (Node: GraphNode) => void,
}

export function AddNode({ isLoading, handleAddNode}: AddNodeProps){
    const [NodeName, setNodeName] = useState("")
    const [NodeType, setNodeType] = useState("")

    const addNode = async () => {
        const caption = NodeName.trim()
        if(!caption || !NodeType){
            return
        }


        handleAddNode({label: NodeType, caption: caption})
        setNodeName("")
        setNodeType("")
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="grid gap-2">
                <Label htmlFor="caption">Caption</Label>
                <Input
                    id="caption"
                    type="text"
                    onChange={(e) => setNodeName(e.target.value)}
                    placeholder="Node Name"
                    required
                />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="NodeType">Node Type</Label>
                <Combobox
                    items={NodeTypes}
                    itemToStringLabel={(enttype: NodeLabel) => enttype?.readable ?? ""}
                    onValueChange={(enttype: NodeLabel | null) => setNodeType(enttype?.spacy ?? "")}
                >
                    <ComboboxInput placeholder="Select a Node Type" />
                    <ComboboxContent>
                        <ComboboxList>
                            {(enttype: NodeLabel) => (
                                <ComboboxItem key={enttype.spacy} value={enttype}>
                                    {enttype.readable}
                                </ComboboxItem>
                            )}
                        </ComboboxList>
                    </ComboboxContent>
                </Combobox>
            </div>
            <div className="grid gap-2">
                <Button onClick={() => addNode()} disabled={isLoading} size="icon">
                    <Plus className="w-4 h-4" />
                </Button>
            </div>
        </div>
    )
}

interface DeleteNodeProps {
    isLoading: boolean,
    nodes: GraphNode[],
    handleDeleteNode: (node: GraphNode) => void,

}

export function DeleteNode( {isLoading, nodes, handleDeleteNode }: DeleteNodeProps){
    const [searchedNode, setSearchedNode] = useState<string>("")
    const [selected, setSelected] = useState<GraphNode | null>(null)
    const [isOpen, setIsOpen] = useState(false)
    const { t } = useLanguage()
    const max_suggestions = 8

    const suggestions = useMemo(() => {
        const needle = searchedNode.trim().toLowerCase()
        if(!needle){
            return []
        }
        return nodes
                .filter((node) => node.caption.toLowerCase().includes(needle))
                .slice(0, max_suggestions)
    }, [nodes, searchedNode])

    const select = (node: GraphNode) => {
        setSelected(node)
        setSearchedNode(node.caption)
        setIsOpen(false)
    }

    const deleteNode = (node: GraphNode) => {
        handleDeleteNode(node)
    }


    return (
        <div className="flex flex-col gap-2">
            <Label htmlFor="caption">{t("graphannotation.caption")}</Label>
            <Input
                id="caption"
                autoComplete="off"
                disabled={isLoading}
                className="flex-1"
                placeholder={t("graphannotation.node")}
                value={searchedNode}
                onChange={(e) => {
                    setSearchedNode(e.target.value)
                    setSelected(null)
                    setIsOpen(true)
                }}
                onFocus={() => setIsOpen(true)}
                onBlur={() => setIsOpen(false)}
                onKeyDown={(e) => {
                    if(e.key === "Escape"){
                        setIsOpen(false)
                    }
                }}
            >
            </Input>
            {isOpen && suggestions.length > 0 && (
                <div
                    className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto overscroll-contain rounded-md border bg-popover text-popover-foreground shadow-md"
                    onMouseDown={(e) => e.preventDefault()}
                >
                    {suggestions.map((node) => (
                        <button
                            key={node.id}
                            type="button"
                            onClick={() => select(node)}
                            className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                        >
                            <span className="truncate">{node.caption}</span>
                            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                {node.label}
                            </span>

                        </button>
                    ))}

                </div>
            )}
            <Button
                variant="destructive"
                disabled={isLoading || !selected}    
                onClick={() => {
                    if(!selected){
                        return
                    }
                    deleteNode(selected)
                    setSelected(null)
                    setSearchedNode("")
                }}
            >
                <Trash className="w-4 h-4" />
                {t("graphannotation.delete")}
            </Button>
        </div>
    )
}

interface UpdateNodeProps {
    isLoading: boolean,
    nodes: GraphNode[],
    handleUpdateNode: (node: GraphNode) => void,
}

export function UpdateNode({ isLoading, nodes, handleUpdateNode}: UpdateNodeProps){
    const [searchedNode, setSearchedNode] = useState("")
    const [selected, setSelected] = useState<GraphNode | null>(null)
    const [newCaption, setNewCaption] = useState("")
    const [newLabel, setNewLabel] = useState("")
    const [isOpen, setIsOpen] = useState(false)
    const { t } = useLanguage()
    const max_suggestions = 8

    const suggestions = useMemo(() => {
        const needle = searchedNode.trim().toLowerCase()
        if(!needle){
            return []
        }

        return nodes
                .filter((n) => n.caption.trim().toLowerCase().includes(needle))
                .slice(0, max_suggestions)

    }, [nodes, searchedNode])

    const select = (node: GraphNode) => {
        setSelected(node)
        setSearchedNode(node.caption)
        setIsOpen(false)
    }

    const updateNode = (node: GraphNode) => {
        handleUpdateNode(node)
    }

    return (
        <div className="flex flex-col gap-2">
            <Label htmlFor="caption">{t("graphannotation.caption")}</Label>
            <Input
                id="caption"
                autoComplete="off"
                disabled={isLoading}
                className="flex-1"
                placeholder={t("graphannotation.node")}
                value={searchedNode}
                onChange={(e) => {
                    setSearchedNode(e.target.value)
                    setSelected(null)
                    setIsOpen(true)
                }}
                onFocus={() => setIsOpen(true)}
                onBlur={() => setIsOpen(false)}
                onKeyDown={(e) => {
                    if(e.key === "Escape"){
                        setIsOpen(false)
                    }
                }}
            >
            </Input>
            <Label htmlFor="newCaption">{t("annotation.newcaption")}</Label>
            <Input
                id="newCaption"
                type="text"
                onChange={(e) => setNewCaption(e.target.value)}
                placeholder={t("annotation.newcaption")}
                required
            ></Input>
            
            <Label htmlFor="newLabel">{t("annotation.newlabel")}</Label>
            <Combobox
                id="newLabel"
                items={NodeTypes}
                itemToStringLabel={(enttype: NodeLabel) => enttype?.readable ?? ""}
                onValueChange={(enttype: NodeLabel | null) => setNewLabel(enttype?.spacy ?? "")}
            >
                <ComboboxInput placeholder="Select a Node Type" />
                <ComboboxContent>
                    <ComboboxList>
                        {(enttype: NodeLabel) => (
                            <ComboboxItem key={enttype.spacy} value={enttype}>
                                {enttype.readable}
                            </ComboboxItem>
                        )}
                    </ComboboxList>
                </ComboboxContent>
            </Combobox>
            {isOpen && suggestions.length > 0 && (
                <div
                    className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto overscroll-contain rounded-md border bg-popover text-popover-foreground shadow-md"
                    onMouseDown={(e) => e.preventDefault()}
                >
                    {suggestions.map((node) => (
                        <button
                            key={node.id}
                            type="button"
                            onClick={() => select(node)}
                            className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                        >
                            <span className="truncate">{node.caption}</span>
                            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                {node.label}
                            </span>

                        </button>
                    ))}

                </div>
            )}
            <Button
                variant="outline"
                disabled={isLoading || !selected}    
                onClick={() => {
                    if(!selected){
                        return
                    }

                    updateNode({id: selected.id, caption: newCaption, label: newLabel})
                    setSelected(null)
                    setSearchedNode("")
                    setNewCaption("")
                    setNewLabel("")
                }}
            >
                <Upload className="w-4 h-4" />
                {t("graphannotation.update")}
            </Button>
        </div>
    )
}

interface AddLinkProps {
    isLoading: boolean,
    nodes: GraphNode[],
    handleAddLink: (link: GraphLink) => void,
}

export function AddLink({ isLoading, nodes, handleAddLink }: AddLinkProps){
    const [node1, setNode1] = useState<GraphNode | null>(null)
    const [node2, setNode2] = useState<GraphNode | null>(null)
    const [searchedNode1, setSearchedNode1] = useState("")
    const [searchedNode2, setSearchedNode2] = useState("")
    const [sentence, setSentence] = useState("")
    const [relationType, setRelationType] = useState("")
    const [isOpen1, setIsOpen1] = useState(false)
    const [isOpen2, setIsOpen2] = useState(false)
    const { t } = useLanguage()
    const max_suggestions = 8

    const suggestions = useMemo(() => {
        const needle = isOpen1 ? searchedNode1.trim().toLowerCase() : searchedNode2.trim().toLowerCase() 
        if(!needle){
            return []
        }

        return nodes
                .filter((n) => n.caption.trim().toLowerCase().includes(needle))
                .slice(0, max_suggestions)

    }, [nodes, searchedNode1, searchedNode2])

    const select = (node: GraphNode, first: boolean) => {
        first ? setNode1(node) : setNode2(node)
        first ? setSearchedNode1(node.caption) : setSearchedNode2(node.caption)
        first ? setIsOpen1(false) : setIsOpen2(false)
    }


    const addLink = () => {
        if(!sentence || !relationType || !node1 || !node2 || isLoading){
            return
        }
        const link: GraphLink = {sentences: [{text: sentence}], relation_type: relationType, source: node1, target: node2}
        handleAddLink(link)
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="grid gap-2">
                <Label htmlFor="node1">{t("annotation.node")}</Label>
                <Input
                    id="node1"
                    autoComplete="off"
                    disabled={isLoading}
                    className="flex-1"
                    placeholder={t("graphannotation.node")}
                    value={searchedNode1}
                    onChange={(e) => {
                        setSearchedNode1(e.target.value)
                        setNode1(null)
                        setIsOpen1(true)
                    }}
                    onFocus={() => setIsOpen1(true)}
                    onBlur={() => setIsOpen1(false)}
                    onKeyDown={(e) => {
                        if(e.key === "Escape"){
                            setIsOpen1(false)
                        }
                    }}
                    >

                    </Input>
                <Label htmlFor="node2">{t("annotation.node")}</Label>
                <Input
                    id="node2"
                    autoComplete="off"
                    disabled={isLoading}
                    className="flex-1"
                    placeholder={t("graphannotation.node")}
                    value={searchedNode2}
                    onChange={(e) => {
                        setSearchedNode2(e.target.value)
                        setNode2(null)
                        setIsOpen2(true)
                    }}
                    onFocus={() => setIsOpen2(true)}
                    onBlur={() => setIsOpen2(false)}
                    onKeyDown={(e) => {
                        if(e.key === "Escape"){
                            setIsOpen2(false)
                        }
                    }}
                    >
                </Input>
                <Label htmlFor="relation">{t("annotation.relation")}</Label>
                <Input
                    id="relation"
                    autoComplete="off"
                    disabled={isLoading}
                    className="flex-1"
                    placeholder={t("graphannotation.relation")}
                    value={relationType}
                    onChange={(e) => setRelationType(e.target.value)}
                >
                </Input>
                <Label htmlFor="sentence">{t("annotation.sentence")}</Label>
                <Input
                    id="sentence"
                    autoComplete="off"
                    disabled={isLoading}
                    className="flex-1"
                    placeholder={t("graphannotation.sentence")}
                    value={sentence}
                    onChange={(e) => setSentence(e.target.value)}
                >
                </Input>
                {(isOpen1 || isOpen2) && suggestions.length > 0 && (
                    <div
                        className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto overscroll-contain rounded-md border bg-popover text-popover-foreground shadow-md"
                        onMouseDown={(e) => e.preventDefault()}
                    >
                    {suggestions.map((node) => (
                        <button
                            key={node.id}
                            type="button"
                            onClick={() => select(node, isOpen1 ? true : false)}
                            className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                        >
                            <span className="truncate">{node.caption}</span>
                            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                {node.label}
                            </span>

                        </button>
                    ))}
                    </div>
            )}
            </div>
            <div className="grid gap-2">
                <Button onClick={() => addLink()} disabled={isLoading} size="icon">
                    <Plus className="w-4 h-4" />
                </Button>
            </div>
        </div>
    )
}

interface UpdateLinkProps {
    isLoading: boolean,
    links: GraphLink[],
    handleUpdateLink: (link: GraphLink) => void,
}

export function UpdateLink({ isLoading, links, handleUpdateLink}: UpdateLinkProps){
    const [searchedLink, setSearchedLink] = useState("")
    const [selected, setSelected] = useState<GraphLink | null>(null)
    const [newRelation, setNewRelation] = useState("")
    const [isOpen, setIsOpen] = useState(false)
    const { t } = useLanguage()
    const max_suggestions = 8

    const suggestions = useMemo(() => {
        const needle = searchedLink.trim().toLowerCase()
        if(!needle){
            return []
        }

        return links
                .filter((n) => n.relation_type!.trim().toLowerCase().includes(needle))
                .slice(0, max_suggestions)

    }, [links, searchedLink])

    const select = (link: GraphLink) => {
        setSelected(link)
        setSearchedLink(link.relation_type!)
        setIsOpen(false)
    }

    const updateLink = () => {
        if(!selected || !newRelation){
            return
        }
        const link: GraphLink = {
            id: selected.id,
            sentences: selected.sentences,
            relation_type: newRelation,
            source: selected.source,
            target: selected.target,
        }


        handleUpdateLink(link)
        setSelected(null)
        setSearchedLink("")
        setNewRelation("")
    }

    return (
        <div className="flex flex-col gap-2">
            <Label htmlFor="caption">{t("graphannotation.caption")}</Label>
            <Input
                id="caption"
                autoComplete="off"
                disabled={isLoading}
                className="flex-1"
                placeholder={t("graphannotation.node")}
                value={searchedLink}
                onChange={(e) => {
                    setSearchedLink(e.target.value)
                    setSelected(null)
                    setIsOpen(true)
                }}
                onFocus={() => setIsOpen(true)}
                onBlur={() => setIsOpen(false)}
                onKeyDown={(e) => {
                    if(e.key === "Escape"){
                        setIsOpen(false)
                    }
                }}
            >
            </Input>
            <Label htmlFor="newCaption">{t("graphannotation.newcaption")}</Label>
            <Input
                id="newCaption"
                type="text"
                onChange={(e) => setNewRelation(e.target.value)}
                placeholder={t("annotation.newcaption")}
                required
            ></Input>
            
            {isOpen && suggestions.length > 0 && (
                <div
                    className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto overscroll-contain rounded-md border bg-popover text-popover-foreground shadow-md"
                    onMouseDown={(e) => e.preventDefault()}
                >
                    {suggestions.map((link) => (
                        <button
                            key={link.id}
                            type="button"
                            onClick={() => select(link)}
                            className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                        >
                            <span className="truncate">{link.relation_type}</span>
                        </button>
                    ))}

                </div>
            )}
            <Button
                variant="outline"
                disabled={isLoading || !selected}    
                onClick={updateLink}
            >
                <Upload className="w-4 h-4" />
                {t("graphannotation.update")}
            </Button>
        </div>
    )
}

interface GraphAnnotationProps {
    className: string,
    currentSite: Sitedata,
    nodes: GraphNode[],
    links: GraphLink[],
    addNode: (node: GraphNode) => {},
    deleteNode: (node: GraphNode) => {},
    updateNode: (node: GraphNode) => {},
    addLink: (link: GraphLink) => {},
    updateLink: (link: GraphLink) => {},
    isLoading: boolean
}

export function GraphAnnotation({ className, currentSite, nodes, links, addNode, deleteNode, updateNode, addLink, updateLink, isLoading }: GraphAnnotationProps){
    const [currentView, setCurrentView] = useState("nodeAdd")
    

    return (
        currentSite.url && (
            <div className={cn(className, "flex", "flex-row", "gap-6", "items-start")}>
                {/* Left: the form menu */}
                <Card className="flex-1">
                    <CardContent>
                        {currentView === "nodeAdd" && (
                            <AddNode isLoading={isLoading} currentSite={currentSite} handleAddNode={addNode}></AddNode>
                        )}
                        {currentView === "nodeDelete" && (
                            <DeleteNode isLoading={isLoading} nodes={nodes} handleDeleteNode={deleteNode}></DeleteNode>
                        )}
                        {currentView === "nodeUpdate" && (
                            <UpdateNode isLoading={isLoading} nodes={nodes} handleUpdateNode={updateNode}></UpdateNode>
                        )}
                        {currentView === "linkAdd" && (
                            <AddLink isLoading={isLoading} nodes={nodes} handleAddLink={addLink}></AddLink>
                        )}
                        {currentView === "linkUpdate" && (
                            <UpdateLink isLoading={isLoading} links={links} handleUpdateLink={updateLink}></UpdateLink>
                        )}
                    </CardContent>
                </Card>

                {/* Right: the toggle buttons */}
                <div className="flex flex-col gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline">Nodes</Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => setCurrentView("nodeAdd")}>
                                    Add
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setCurrentView("nodeDelete")}>
                                    Delete
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setCurrentView("nodeUpdate")}>
                                    Update
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline">Links</Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => setCurrentView("linkAdd")}>
                                    Add
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setCurrentView("linkUpdate")}>
                                    Update
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                </div>
            </div>    
        )
    )
}