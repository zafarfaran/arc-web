import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Goal } from '../../types';
import GoalCard from './GoalCard';

interface SortableGoalCardProps {
    goal: Goal;
    onClick: () => void;
}

export default function SortableGoalCard({ goal, onClick }: SortableGoalCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: goal.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 100 : 'auto',
        position: 'relative' as const,
    };

    return (
        <div ref={setNodeRef} style={style}>
            <GoalCard
                goal={goal}
                onClick={onClick}
                attributes={attributes}
                listeners={listeners}
            />
        </div>
    );
}
