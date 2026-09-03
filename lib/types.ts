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
    done: boolean,
}

export type Message = {
    chat_message_id: string,
    role: 'user' | 'assistant',
    content: string,
    timestamp: Date,
    citations?: string[],
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
    unlockcode: Array<number>;
    user?: {
        id: number;
        username: string;
    }
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
    done: boolean,
}




