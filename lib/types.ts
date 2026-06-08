

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