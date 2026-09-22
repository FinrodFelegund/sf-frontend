export type Sitedata = {
  url: string,
  text: string,
}

export type RuntimeMessage = {
    action: string,
    data: Sitedata,
}


export type ChatHistory = {

    messages: Message[];
}

export type ChatMessage = {
    chat_history_id?: number,
    url: string,
    text: string,
    message: Message
}

export type SSEChunkChat = {
    content: string,
    citations?: string[],
    chat_history_id?: number,
    error?: string,
    done: boolean,
}

export type Message = {
    chat_message_id: string,
    role: 'user' | 'assistant',
    content: string,
    timestamp: Date,
    citations?: string[],
    error?: string,
}


export type LoginRequest = {
    username: string;
    password: string;
};
    
export type LoginResponse = {
    token?: string;
    user_id?: number;
    user_name?: string;
    user?: {
        id: number;
        user_name: string;
        email: string;
        first_name: string;
        last_name: string;
    };
};

export type RegisterRequest = {
    username: string;
    firstname: string;
    lastname: string;
    password: string;
    email: string;
}

export type UnlockRequest = {
    id: string;
    unlockCode: string;
}


export type User = {
    token: string;
    user: {
        id: string;
        username: string;
        email: string;
        first_name: string;
        last_name: string;
        is_active: boolean;
        date_joined: string;
        last_login: string;
    };
};


/* Graph Types */

export type GraphWebsite = {
    id: string,
    url: string,
    title?: string,
    entity_count?: number,
    updated_at?: string,
}

export type GraphFocus = {
    website_ids: string[],
    tfidf: Record<string, number>,
}

export type GraphNode = {
    id?: string,
    label: string,
    caption: string,
    website_count?: number,
    websites?: GraphWebsite[],
}

export type GraphSentence = {
    id?: string,
    text: string,
    website?: string,
}

export type GraphLink = {
    id?: string,
    sentences: GraphSentence[],
    relation_type?: string,
    source: GraphNode,
    target: GraphNode,
}

export type GraphScore = {
    id: string,
    score: number,
}


export type GraphResponse = {
    nodes: GraphNode[],
    links: GraphLink[],
    scores: GraphScore[],
}

export type GraphData = {
    nodes: GraphNode[],
    links: GraphLink[],
}


export type SSEChunkGraph = {
    nodes: GraphNode[],
    links: GraphLink[],
    scores: GraphScore[],
    snapshot?: boolean,
    error?: string,
    done: boolean,
}


export type EntityNeighbour = { id: string, caption: string, label: string }

export type EntityRelation = {
    id: string,
    relation_type: string | null,
    neighbour: EntityNeighbour,
    count: number,
    score: number,
}

export type EntitySource = {
    id: string,
    url: string,
    title: string,
    updated_at: string,
    occurrences: number,
    sentence_count: number,
    sentences: GraphSentence[],
}

export type EntityDetail = {
    entity: EntityNeighbour & { 
        website_count: number,
        occurrence_count: number,
        aliases: EntityNeighbour[],
    },
    relations: EntityRelation[],
    sources: EntitySource[],
}




