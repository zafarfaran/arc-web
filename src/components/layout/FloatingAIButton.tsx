// ========================================
// Floating AI Chat Button Component
// ========================================

import { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, Bot, Maximize2, Minimize2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { aiService } from '../../services/aiService';
import { TaskCardsContainer } from '../ai/TaskCard';
import { GoalCardsContainer } from '../ai/GoalCardsContainer';
import { HabitCardsContainer } from '../ai/HabitCardsContainer';
import { useApp } from '../../contexts/AppContext';
import './FloatingAIButton.css';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'assistant';
    toolData?: Array<{
        tool: string;
        data: any;
    }>;
}

export default function FloatingAIButton() {
    const { state } = useApp();
    const [isOpen, setIsOpen] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', text: 'Hi there! I am Arc AI. How can I help you boost your productivity today?', sender: 'assistant' }
    ]);
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const toggleChat = () => setIsOpen(!isOpen);
    const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen, isFullscreen, isTyping]);

    // Extract visuals (tasks or goals) from tool data
    const extractToolVisuals = (toolData?: Array<{ tool: string; data: any }>) => {
        if (!toolData) return null;

        const todoResult = toolData.find(t => t.tool === 'get_todos');
        if (todoResult?.data?.todos && todoResult.data.todos.length > 0) {
            return {
                type: 'tasks',
                tasks: todoResult.data.todos,
                hasMore: todoResult.data.has_more || false
            };
        }

        const goalResult = toolData.find(t => t.tool === 'get_goals');
        if (goalResult?.data?.goals && goalResult.data.goals.length > 0) {
            return {
                type: 'goals',
                goals: goalResult.data.goals
            };
        }

        const habitResult = toolData.find(t => t.tool === 'get_habits');
        if (habitResult?.data?.habits && habitResult.data.habits.length > 0) {
            return {
                type: 'habits',
                habits: habitResult.data.habits
            };
        }

        return null;
    };

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputValue.trim() || isTyping) return;

        const userText = inputValue;
        const newUserMsg: Message = {
            id: Date.now().toString(),
            text: userText,
            sender: 'user'
        };

        setMessages(prev => [...prev, newUserMsg]);
        setInputValue('');
        setIsTyping(true);

        try {
            // Convert messages to OpenAI format (exclude toolData from history)
            // Inject current date as context
            const currentDate = new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            const chatHistory = messages.map(m => ({
                role: m.sender === 'user' ? 'user' as const : 'assistant' as const,
                content: m.text
            }));

            chatHistory.push({ role: 'user', content: userText });

            // Prepend system context with date
            chatHistory.unshift({
                role: 'system',
                content: `Context: Today is ${currentDate}.`
            } as any);


            const response = await aiService.getChatResponse(chatHistory);

            const botMsg: Message = {
                id: (Date.now() + 1).toString(),
                text: response.content,
                sender: 'assistant',
                toolData: response.toolData
            };
            setMessages(prev => [...prev, botMsg]);
        } catch (error) {
            console.error('Chat error:', error);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <>
            {/* Main Toggle Button */}
            {!isOpen && (
                <button
                    className="floating-ai-btn"
                    onClick={toggleChat}
                    aria-label="AI Chat"
                >
                    <Sparkles size={22} strokeWidth={2.5} />
                </button>
            )}

            {/* Chat Modal */}
            {isOpen && (
                <div className={`ai-chat-modal ${isFullscreen ? 'fullscreen' : ''}`}>
                    <div className="ai-chat-header">
                        <div className="ai-chat-title">
                            <div className="ai-bot-icon">
                                <Bot size={18} />
                            </div>
                            <span>Arc Assistant</span>
                        </div>
                        <div className="ai-header-controls">
                            <button className="ai-icon-btn" onClick={toggleFullscreen} title={isFullscreen ? "Minimize" : "Maximize"}>
                                {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                            </button>
                            <button className="ai-icon-btn" onClick={toggleChat} title="Close">
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="ai-chat-body">
                        {messages.length === 1 && messages[0].sender === 'assistant' && (
                            <div className="ai-welcome-view">
                                <div className="welcome-icon">
                                    <Sparkles size={32} />
                                </div>
                                <h3 className="welcome-title">How can I help you today?</h3>
                                <p className="welcome-subtitle">
                                    I can help you manage your tasks, track habits, <br />
                                    and reach your productivity goals.
                                </p>
                            </div>
                        )}

                        {messages.length > 1 && messages.map((msg) => {
                            const visualData = msg.sender === 'assistant' ? extractToolVisuals(msg.toolData) : null;

                            return (
                                <div key={msg.id} className={`ai-message-wrapper ${msg.sender}`}>
                                    <div className={`ai-message ${msg.sender}`}>
                                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                                    </div>

                                    {visualData?.type === 'tasks' && visualData.tasks.length > 0 && (
                                        <TaskCardsContainer
                                            tasks={visualData.tasks}
                                            userTags={state.tags}
                                            hasMore={visualData.hasMore}
                                        />
                                    )}

                                    {visualData?.type === 'goals' && visualData.goals.length > 0 && (
                                        <GoalCardsContainer
                                            goals={visualData.goals}
                                        />
                                    )}

                                    {visualData?.type === 'habits' && visualData.habits.length > 0 && (
                                        <HabitCardsContainer
                                            habits={visualData.habits}
                                        />
                                    )}
                                </div>
                            );
                        })}

                        {isTyping && (
                            <div className="ai-message assistant typing">
                                <span className="typing-dot"></span>
                                <span className="typing-dot"></span>
                                <span className="typing-dot"></span>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <form className="ai-chat-input-area" onSubmit={handleSend}>
                        <div className="ai-chat-input-wrapper">
                            <input
                                type="text"
                                className="ai-chat-input"
                                placeholder={isTyping ? "Arc is thinking..." : "Ask me anything..."}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                disabled={isTyping}
                                autoFocus
                            />
                            <button
                                type="submit"
                                className="ai-send-btn"
                                disabled={isTyping || !inputValue.trim()}
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </>
    );
}
