import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Habit } from '../../types';
import HabitCard from './HabitCard';

interface SortableHabitCardProps {
    habit: Habit;
    today: string;
    onToggle: (id: string, date: string) => void;
    onClick: () => void;
    variant?: 'full' | 'summary';
    completionRate?: number;
}

export default function SortableHabitCard({
    habit,
    today,
    onToggle,
    onClick,
    variant = 'full',
    completionRate
}: SortableHabitCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: habit.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 100 : 'auto',
        position: 'relative' as const,
        touchAction: 'none',
    };

    return (
        <div ref={setNodeRef} style={style}>
            <HabitCard
                habit={habit}
                today={today}
                onToggle={onToggle}
                onClick={onClick}
                attributes={attributes}
                listeners={listeners}
                variant={variant}
                completionRate={completionRate}
            />
        </div>
    );
}
