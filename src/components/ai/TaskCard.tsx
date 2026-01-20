// ========================================
// Task Card - Sticky Note Style for AI Chat
// ========================================

import { Check, Calendar, Flag } from 'lucide-react';
import './TaskCard.css';

// Define Tag interface locally
interface Tag {
    id: string;
    name: string;
    color: string;
}

interface TaskCardProps {
    id: string;
    text: string;
    completed: boolean;
    priority?: 'high' | 'medium' | 'low';
    dueDate?: string;
    tags?: string[];
    userTags?: Tag[];
    onComplete?: (id: string) => void;
}

export default function TaskCard({ id, text, completed, priority, dueDate, tags, userTags = [], onComplete }: TaskCardProps) {
    const handleComplete = () => {
        if (onComplete && !completed) {
            onComplete(id);
        }
    };

    // Helper to get tag details from user's tags
    const getTagDisplay = (tagId: string) => {
        const found = userTags.find(t => t.id === tagId);
        if (found) return { name: found.name, color: found.color };

        // Fallback defaults
        const defaults: Record<string, string> = {
            work: '#FF6D1F',
            study: '#00D4FF',
            personal: '#34D399',
            health: '#F87171',
            creative: '#A78BFA'
        };
        return {
            name: tagId.charAt(0).toUpperCase() + tagId.slice(1),
            color: defaults[tagId.toLowerCase()] || 'var(--primary)'
        };
    };

    return (
        <div className={`task-card ${completed ? 'completed' : ''} priority-${priority || 'medium'}`}>
            <div className="task-card-header">
                <button
                    className={`task-check ${completed ? 'checked' : ''}`}
                    onClick={handleComplete}
                    disabled={completed}
                >
                    {completed && <Check size={12} />}
                </button>
                {priority && (
                    <span className="task-priority">
                        <Flag size={10} />
                        {priority}
                    </span>
                )}
            </div>
            <p className={`task-text ${completed ? 'done' : ''}`}>{text}</p>

            {tags && tags.length > 0 && (
                <div className="task-tags">
                    {tags.slice(0, 2).map((tagId, idx) => {
                        const tag = getTagDisplay(tagId);
                        return (
                            <span
                                key={idx}
                                className="task-tag"
                                style={{ background: tag.color }}
                            >
                                {tag.name}
                            </span>
                        );
                    })}
                    {tags.length > 2 && (
                        <span className="task-tag-more">+{tags.length - 2}</span>
                    )}
                </div>
            )}

            {dueDate && (
                <div className="task-due">
                    <Calendar size={10} />
                    <span>{new Date(dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </div>
            )}
        </div>
    );
}

// Container for multiple task cards
interface TaskCardsContainerProps {
    tasks: Array<{
        id: string;
        text: string;
        completed: boolean;
        priority?: 'high' | 'medium' | 'low';
        due_date?: string;
        tags?: string[];
    }>;
    userTags?: Tag[];
    hasMore?: boolean;
    onComplete?: (id: string) => void;
}

const MAX_DISPLAY_TASKS = 20;

export function TaskCardsContainer({ tasks, userTags, hasMore, onComplete }: TaskCardsContainerProps) {
    if (!tasks || tasks.length === 0) return null;

    const displayedTasks = tasks.slice(0, MAX_DISPLAY_TASKS);
    const showViewMore = hasMore || tasks.length > MAX_DISPLAY_TASKS;

    return (
        <div className="task-cards-container">
            {displayedTasks.map(task => (
                <TaskCard
                    key={task.id}
                    id={task.id}
                    text={task.text}
                    completed={task.completed}
                    priority={task.priority}
                    dueDate={task.due_date}
                    tags={task.tags}
                    userTags={userTags}
                    onComplete={onComplete}
                />
            ))}
            {showViewMore && (
                <a href="/tasks" className="task-view-more-link">
                    View all tasks →
                </a>
            )}
        </div>
    );
}
