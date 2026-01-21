// ========================================
// Sortable Todo Item - Wrapper for drag & drop
// ========================================

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Todo } from '../../types';
import TodoItem from './TodoItem';

interface SortableTodoItemProps {
    todo: Todo;
}

export default function SortableTodoItem({ todo }: SortableTodoItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: todo.id });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 100 : 'auto',
        touchAction: 'none',
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <TodoItem todo={todo} isDragging={isDragging} />
        </div>
    );
}
