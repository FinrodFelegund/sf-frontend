export type Sitedata = {
  url: string,
  text: string,
}

export type RuntimeMessage = {
    action: string,
    data: Sitedata,
}


export type GraphResponse = {
    src: string
}


export type ChatHistory = {

    messages: Message[];
}

export type ChatMessage = {
    url: string,
    text: string,
    message: Message
}

export type SSEChunk = {
    content: string;
    chat_history_id?: number;
    done: boolean;
}

export type Message = {
    chat_message_id: string,
    role: 'user' | 'assistant',
    content: string
    timestamp: Date
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

