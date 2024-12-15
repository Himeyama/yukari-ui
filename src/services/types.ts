export interface User {
    label: string;
}

export interface Conversation {
    uuid: string;
    user: string;
    assistant: string;
}

export interface HistoryItem {
    user: string;
    assistant: string;
    uuid: string;
}
