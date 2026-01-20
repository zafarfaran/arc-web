import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../lib/firebase';

interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

interface ChatResponse {
    content: string;
    toolCallsMade?: boolean;
    toolData?: Array<{
        tool: string;
        data: any;
    }>;
}

const functions = getFunctions(app, 'us-central1');
const chatWithAI = httpsCallable(functions, 'chatWithAI');

export const aiService = {
    async getChatResponse(messages: ChatMessage[]): Promise<ChatResponse> {
        // Explicitly check for current user first
        const { getAuth } = await import('firebase/auth');
        const auth = getAuth(app);
        const user = auth.currentUser;

        if (!user) {
            console.warn('AI Chat blocked: User is not logged in.');
            return { content: "You must be logged in to use the AI assistant." };
        }

        try {
            const result = await chatWithAI({ messages });
            const data = result.data as { content: string; tool_calls_made?: boolean; tool_data?: any[] };

            return {
                content: data.content || "I'm sorry, I couldn't get a response.",
                toolCallsMade: data.tool_calls_made,
                toolData: data.tool_data
            };
        } catch (error: any) {
            console.error('Error in AI Chat (Functions):', error);

            // If the error message indicates the function isn't deployed yet
            if (error.code === 'not-found') {
                return { content: "The AI backend hasn't been deployed yet. Please run 'firebase deploy --only functions' to start using it securely." };
            }

            if (error.code === 'unauthenticated' || error.message?.includes("Unauthenticated")) {
                return { content: "You need to sign in again to verify your identity." };
            }

            return { content: "I'm having trouble connecting to my central brain. Please check your internet or try again later." };
        }
    }
};

