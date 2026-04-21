
export type Message = {
    message: string;
    direction: 'incoming' | 'outgoing';
    sender: string;
    created?: number;
};
