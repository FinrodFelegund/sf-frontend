import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react"

type Language = "de" | "en"

type LanguageContextType = {
    language: Language
    setLanguageState: (lang: Language) => void
    t: (key: string) => string
}

const translations: Record<Language, Record<string, string>> = {
    de: {
        // common
        "common.cancel": "Abbrechen",
        "common.confirm": "Bestätigen",
        "common.dismiss": "Schließen",
        "common.restore": "Änderungen zurück nehmen",

        // popup
        "popup.description": "Öffne Storyfinder im Side Panel für die beste Ansicht.",
        "popup.open": "Öffne Side Panel",

        // navigation
        "navigation.home": "Start",
        "navigation.login": "Anmelden",
        "navigation.register": "Registrieren",
        "navigation.graph": "Graph",
        "navigation.chat": "Chat",
        "navigation.localgraph": "Seiten-Graph",
        "navigation.globalgraph": "Gesamt-Graph",
        "navigation.open-in-tab": "In neuem Tab öffnen",
        "navigation.dock-to-panel": "Zurück in die Seitenleiste",
        "navigation.toggle-language": "Sprache wechseln",
        "navigation.toggle-theme": "Darstellung wechseln",
        "navigation.logout": "Abmelden",

        // home
        "home.subtitle": "Behalte den Überblick über Personen, Organisationen und Orte bei allen Seiten, die du sammelst.",
        "home.chat": "Chatte mit der Website",
        "home.chat.desc": "Stelle Fragen an ein Sprachmodel und erhalten Antworten zur Website.",
        "home.teamwork.desc": "Teile Entitäten und Beziehungen über Quellen hinweg.",
        "home.problemsolving": "Zusammenhänge erkennen",
        "home.problemsolving.desc": "Sieh, wie Akteure über mehrere Artikel hinweg verbunden sind.",
        "home.knowledge": "Wissen sichern",
        "home.knowledge.desc": "Jede Beziehung bleibt mit dem Satz verknüpft, der sie belegt.",

        // auth
        "auth.session-expired": "Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.",
        "login.title": "Anmelden",
        "login.subtitle": "Melde dich an, um deinen Graphen zu öffnen.",
        "login.username": "Benutzername",
        "login.username.placeholder": "Benutzername",
        "login.password": "Passwort",
        "login.password.placeholder": "Passwort",
        "login.button": "Anmelden",
        "login.button.loading": "Wird angemeldet …",
        "login.error": "Anmeldung fehlgeschlagen. Bitte prüfe deine Eingaben.",

        "register.title": "Konto erstellen",
        "register.subtitle": "Registriere dich, um Seiten zu sammeln.",
        "register.username": "Benutzername",
        "register.username.placeholder": "Benutzername",
        "register.email": "E-Mail",
        "register.email.placeholder": "name@uni-hamburg.de",
        "register.firstname": "Vorname",
        "register.firstname.placeholder": "Vorname",
        "register.lastname": "Nachname",
        "register.lastname.placeholder": "Nachname",
        "register.password": "Passwort",
        "register.password.placeholder": "Mindestens 8 Zeichen",
        "register.button": "Registrieren",
        "register.button.loading": "Wird erstellt …",
        "register.unlock.title": "Konto freischalten",
        "register.unlock.description": "Gib den Code ein, den wir dir per E-Mail geschickt haben.",
        "register.unlock.description.failure": "Der Code ist ungültig oder abgelaufen.",
        "register.unlock.confirm": "Freischalten",
        "register.unlock.cancel": "Abbrechen",

        // entity types
        "entity.person": "Person",
        "entity.org": "Organisation",
        "entity.gpe": "Land, Stadt oder Region",
        "entity.loc": "Ort",
        "entity.norp": "Nationalität, Religion oder politische Gruppe",

        // graph
        "graph.local": "Lokal",
        "graph.global": "Global",
        "graph.request-graph": "Graph erstellen",
        "graph.relayout": "Neu anordnen",
        "graph.annotation.show": "Annotieren",
        "graph.annotation.hide": "Werkzeuge ausblenden",
        "graph.expand": "Mehr anzeigen",
        "graph.collapse": "Weniger anzeigen",
        "graph.of": "von",
        "graph.search": "Entität suchen …",
        "graph.search-degree": "Verbindungen",
        "graph.search-empty": "Keine Treffer",
        "graph.unpin-all": "Alle lösen",
        "graph.stream-failed": "Der Graph konnte nicht erstellt werden.",
        "graph.mergenodes.dialog.title": "Knoten zusammenführen",
        "graph.mergenodes.dialog.question": "Diese beiden Knoten zusammenführen?",
        "graph.error.add-node": "Knoten konnte nicht hinzugefügt werden.",
        "graph.error.delete-node": "Knoten konnte nicht entfernt werden.",
        "graph.error.updated-node": "Knoten konnte nicht geändert werden.",
        "graph.error.add-link": "Beziehung konnte nicht hinzugefügt werden.",
        "graph.error.update-link": "Beziehung konnte nicht geändert werden.",
        "graph.error.merge": "Zusammenführen fehlgeschlagen.",
        "graph.error.duplicate": "Gibt es bereits.",
        "graph.error.gone": "Existiert nicht mehr.",
        "graph.error.invalid": "Eingabe ungültig.",

        // node and link tooltips
        "tooltip.found-on": "Gefunden auf",
        "tooltip.sentences": "Sätze",

        // annotation
        "annotation.nodes": "Knoten",
        "annotation.links": "Beziehungen",
        "annotation.add": "Hinzufügen",
        "annotation.delete": "Entfernen",
        "annotation.update": "Ändern",
        "annotation.caption": "Bezeichnung",
        "annotation.node": "Knotenname",
        "annotation.newcaption": "Neue Bezeichnung",
        "annotation.newlabel": "Typ",
        "annotation.select-type": "Typ wählen",
        "annotation.relation": "Beziehung",
        "annotation.sentence": "Belegsatz",

        // sources
        "sources.title": "Quellen",
        "sources.description": "Wähle Seiten, um den Graphen darauf einzuschränken.",
        "sources.filter": "Filtern …",
        "sources.count": "Seiten",
        "sources.focused": "im Fokus",
        "sources.entities": "Entitäten",
        "sources.clear": "Zurücksetzen",
        "sources.show-all": "Alle anzeigen",
        "sources.empty": "Noch keine Seiten gesammelt.",
        "sources.delete": "Seite entfernen",
        "sources.delete-confirm": "Entfernen",

        // entity detail
        "detail.loading": "Wird geladen …",
        "detail.error": "Details konnten nicht geladen werden.",
        "detail.sites": "Seiten",
        "detail.also-known-as": "Auch bekannt als",
        "detail.tab.relations": "Beziehungen",
        "detail.tab.sources": "Quellen",
        "detail.no-relations": "Keine Beziehungen.",
        "detail.no-sources": "Keine Quellen.",
        "detail.mentions": "Erwähnungen",
        "detail.more-sentences": "weitere Sätze",
        "detail.less": "Weniger",
        "detail.show-neighbours": "Nachbarn einblenden",
        "detail.hide-neighbours": "Nachbarn ausblenden",

        // chat
        "chat.initial-message": "Frag mich etwas über diese Seite.",
        "chat.placeholder": "Nachricht schreiben …",
        "chat.error.connection": "Verbindung unterbrochen.",
        "chat.delete.title": "Verlauf löschen",
        "chat.delete.description": "Der gesamte Chatverlauf für diese Seite wird gelöscht.",
        "chat.delete.confirm": "Löschen",
        "chat.delete.cancel": "Abbrechen",
    },
    en: {
        "common.cancel": "Cancel",
        "common.confirm": "Confirm",
        "common.dismiss": "Dismiss",
        "common.restore": "Revert changes",

        // popup
        "popup.description": "Open Storyfinder in the side panel for best user experience.",
        "popup.open": "open side panel",

        "navigation.home": "Home",
        "navigation.login": "Log in",
        "navigation.register": "Sign up",
        "navigation.graph": "Graph",
        "navigation.chat": "Chat",
        "navigation.localgraph": "This page",
        "navigation.globalgraph": "All pages",
        "navigation.open-in-tab": "Open in a new tab",
        "navigation.dock-to-panel": "Back to the side panel",
        "navigation.toggle-language": "Switch language",
        "navigation.toggle-theme": "Switch appearance",
        "navigation.logout": "Log out",

        "home.subtitle": "Keep track of the people, organisations and places across every page you collect.",
        "home.chat": "Chat with each website you visit",
        "home.chat.desc": "Ask questions to a Language Model and receive answers about the current website.",
        "home.problemsolving": "See the connections",
        "home.problemsolving.desc": "Watch how actors link up across many articles.",
        "home.knowledge": "Keep the evidence",
        "home.knowledge.desc": "Every relation stays tied to the sentence that supports it.",

        "auth.session-expired": "Your session expired. Please sign in again.",
        "login.title": "Log in",
        "login.subtitle": "Sign in to open your graph.",
        "login.username": "Username",
        "login.username.placeholder": "Username",
        "login.password": "Password",
        "login.password.placeholder": "Password",
        "login.button": "Log in",
        "login.button.loading": "Signing in …",
        "login.error": "Login failed. Please check your details.",

        "register.title": "Create an account",
        "register.subtitle": "Sign up to start collecting pages.",
        "register.username": "Username",
        "register.username.placeholder": "Username",
        "register.email": "Email",
        "register.email.placeholder": "name@uni-hamburg.de",
        "register.firstname": "First name",
        "register.firstname.placeholder": "First name",
        "register.lastname": "Last name",
        "register.lastname.placeholder": "Last name",
        "register.password": "Password",
        "register.password.placeholder": "At least 8 characters",
        "register.button": "Sign up",
        "register.button.loading": "Creating …",
        "register.unlock.title": "Unlock your account",
        "register.unlock.description": "Enter the code we emailed you.",
        "register.unlock.description.failure": "That code is invalid or has expired.",
        "register.unlock.confirm": "Unlock",
        "register.unlock.cancel": "Cancel",

        "entity.person": "Person",
        "entity.org": "Organisation",
        "entity.gpe": "Country, city or region",
        "entity.loc": "Location",
        "entity.norp": "Nationality, religion or political group",

        "graph.local": "Local",
        "graph.global": "Global",
        "graph.request-graph": "Build graph",
        "graph.relayout": "Re-arrange layout",
        "graph.annotation.show": "Annotate",
        "graph.annotation.hide": "Hide tools",
        "graph.expand": "Show more",
        "graph.collapse": "Show less",
        "graph.of": "of",
        "graph.search": "Find an entity …",
        "graph.search-degree": "Connections",
        "graph.search-empty": "No matches",
        "graph.unpin-all": "Unpin all",
        "graph.stream-failed": "The graph could not be built.",
        "graph.mergenodes.dialog.title": "Merge entities",
        "graph.mergenodes.dialog.question": "Merge these two entities?",
        "graph.error.add-node": "Could not add the entity.",
        "graph.error.delete-node": "Could not remove the entity.",
        "graph.error.updated-node": "Could not update the entity.",
        "graph.error.add-link": "Could not add the relation.",
        "graph.error.update-link": "Could not update the relation.",
        "graph.error.merge": "Merge failed.",
        "graph.error.duplicate": "That already exists.",
        "graph.error.gone": "That no longer exists.",
        "graph.error.invalid": "That input isn't valid.",

        "tooltip.found-on": "Found on",
        "tooltip.sentences": "Sentences",

        "annotation.nodes": "Entities",
        "annotation.links": "Relations",
        "annotation.add": "Add",
        "annotation.delete": "Remove",
        "annotation.update": "Update",
        "annotation.caption": "Name",
        "annotation.node": "Entity name",
        "annotation.newcaption": "New name",
        "annotation.newlabel": "Type",
        "annotation.select-type": "Choose a type",
        "annotation.relation": "Relation",
        "annotation.sentence": "Supporting sentence",

        "sources.title": "Sources",
        "sources.description": "Pick pages to narrow the graph down to them.",
        "sources.filter": "Filter …",
        "sources.count": "pages",
        "sources.focused": "in focus",
        "sources.entities": "entities",
        "sources.clear": "Clear",
        "sources.show-all": "Show all",
        "sources.empty": "No pages collected yet.",
        "sources.delete": "Remove page",
        "sources.delete-confirm": "Remove",

        "detail.loading": "Loading …",
        "detail.error": "Could not load the details.",
        "detail.sites": "pages",
        "detail.also-known-as": "Also known as",
        "detail.tab.relations": "Relations",
        "detail.tab.sources": "Sources",
        "detail.no-relations": "No relations.",
        "detail.no-sources": "No sources.",
        "detail.mentions": "mentions",
        "detail.more-sentences": "more sentences",
        "detail.less": "Less",
        "detail.show-neighbours": "Show neighbours",
        "detail.hide-neighbours": "Hide neighbours",

        "chat.initial-message": "Ask me anything about this page.",
        "chat.placeholder": "Write a message …",
        "chat.error.connection": "Connection lost.",
        "chat.delete.title": "Delete history",
        "chat.delete.description": "This clears the whole chat history for this page.",
        "chat.delete.confirm": "Delete",
        "chat.delete.cancel": "Cancel",
    }
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: {children: ReactNode}){
    const [language, setLanguage] = useState<Language>("de")

    const loadLanguage = useCallback(async () => {
        const saved = await chrome.storage.local.get(['language'])
        if(saved.language === "de" || saved.language === "en"){
            setLanguage(saved.language)
        }
    }, [])

    useEffect(() => {
        loadLanguage()
    }, [loadLanguage])

    const setLanguageState = async (lang: Language) => {
        setLanguage(lang)
        await chrome.storage.local.set({"language": lang})
    }

    const t = useCallback((key: string) => {
        const value = translations[language][key]
        if(value === undefined){
            if(import.meta.env.DEV){
                console.warn(`[i18n] missong key: ${key} (${language})`)
                return key
            }
        }
        return value
    }, [language])


    return (
        <LanguageContext.Provider value={{ language, setLanguageState, t}}>
            {children}
        </LanguageContext.Provider>
    )
}

export function useLanguage(){
    const context = useContext(LanguageContext)
    if(!context){
        throw new Error("useLanguage must be used inside LanguageProvider")
    }

    return context
}