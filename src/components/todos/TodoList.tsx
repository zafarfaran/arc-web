// ========================================
// Todo List Component - Sticky Note Board with Drag & Drop
// Supports Grid View and Kanban Column View
// ========================================

import { useState, useMemo, useEffect } from 'react';
import { Plus, ChevronLeft, ChevronRight, LayoutGrid, Columns, Settings } from 'lucide-react';
import {
    DndContext,
    pointerWithin,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
    DragOverlay,
    type DragStartEvent,
    useDroppable,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
} from '@dnd-kit/sortable';
import { useApp } from '../../contexts/AppContext';
import type { Todo, TodoStatus } from '../../types';
import { percentage } from '../../utils/helpers';
import SortableTodoItem from './SortableTodoItem';
import TodoItem from './TodoItem';
import AddTodoForm from './AddTodoForm';
import './TodoList.css';

const DEFAULT_TASKS_PER_PAGE = 12;
const PAGE_SIZE_OPTIONS = [6, 12, 24, 48];

type ViewMode = 'grid' | 'kanban';

// Droppable column component with pagination
function DroppableColumn({
    id,
    title,
    count,
    children,
    currentPage,
    totalPages,
    onPageChange
}: {
    id: TodoStatus;
    title: string;
    count: number;
    children: React.ReactNode;
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}) {
    const { isOver, setNodeRef } = useDroppable({ id });

    return (
        <div
            ref={setNodeRef}
            className={`kanban-column ${isOver ? 'drag-over' : ''}`}
            data-column={id}
        >
            <div className="kanban-column-header">
                <div className="kanban-column-title-row">
                    <span className="kanban-column-title">{title}</span>
                    <span className="kanban-column-count">{count}</span>
                </div>
                {totalPages > 1 && (
                    <div className="kanban-column-pagination">
                        <button
                            className="pagination-btn tiny"
                            onClick={() => onPageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft size={12} />
                        </button>
                        <span className="pagination-text">{currentPage}/{totalPages}</span>
                        <button
                            className="pagination-btn tiny"
                            onClick={() => onPageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                        >
                            <ChevronRight size={12} />
                        </button>
                    </div>
                )}
            </div>
            <div className="kanban-column-content">
                {children}
            </div>
        </div>
    );
}

// Simple droppable area without box styling (for unassigned cards)
function DroppableArea({
    id,
    children,
    currentPage,
    totalPages,
    totalItems,
    onPageChange
}: {
    id: TodoStatus;
    children: React.ReactNode;
    currentPage: number;
    totalPages: number;
    totalItems: number;
    onPageChange: (page: number) => void;
}) {
    const { isOver, setNodeRef } = useDroppable({ id });

    return (
        <div className="unassigned-section">
            {totalItems > 0 && (
                <div className="unassigned-header">
                    <span className="unassigned-label">Unassigned ({totalItems})</span>
                    {totalPages > 1 && (
                        <div className="unassigned-pagination">
                            <button
                                className="pagination-btn tiny"
                                onClick={() => onPageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft size={12} />
                            </button>
                            <span className="pagination-text">{currentPage}/{totalPages}</span>
                            <button
                                className="pagination-btn tiny"
                                onClick={() => onPageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                            >
                                <ChevronRight size={12} />
                            </button>
                        </div>
                    )}
                </div>
            )}
            <div
                ref={setNodeRef}
                className={`unassigned-area ${isOver ? 'drag-over' : ''}`}
            >
                {children}
            </div>
        </div>
    );
}

export default function TodoList() {
    const { state, reorderTodos, updateTodo } = useApp();
    const { todos } = state;
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [showAddForm, setShowAddForm] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
    const [activeDragId, setActiveDragId] = useState<string | null>(null);

    // Pagination state for habit tracker sections
    const [tasksPerPage, setTasksPerPage] = useState(DEFAULT_TASKS_PER_PAGE);
    const [unassignedPage, setUnassignedPage] = useState(1);
    const [todoPage, setTodoPage] = useState(1);
    const [completedPage, setCompletedPage] = useState(1);
    const [showSettings, setShowSettings] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // For Kanban view - categorize todos by status
    const kanbanTodos = useMemo(() => {
        const unassigned: Todo[] = [];
        const todo: Todo[] = [];
        const completed: Todo[] = [];

        todos.forEach((t) => {
            // Use status field, with fallback for legacy items
            const status = t.status || (t.completed ? 'completed' : 'todo');
            if (status === 'pending') unassigned.push(t);
            else if (status === 'completed') completed.push(t);
            else todo.push(t);
        });

        return { unassigned, todo, completed };
    }, [todos]);

    // Paginated data for each section
    const paginatedKanban = useMemo(() => {
        const paginateArray = <T,>(arr: T[], page: number, perPage: number) => {
            const start = (page - 1) * perPage;
            return arr.slice(start, start + perPage);
        };

        return {
            unassigned: paginateArray(kanbanTodos.unassigned, unassignedPage, tasksPerPage),
            todo: paginateArray(kanbanTodos.todo, todoPage, tasksPerPage),
            completed: paginateArray(kanbanTodos.completed, completedPage, tasksPerPage),
        };
    }, [kanbanTodos, unassignedPage, todoPage, completedPage, tasksPerPage]);

    // Total pages for each section
    const totalPagesKanban = useMemo(() => ({
        unassigned: Math.max(1, Math.ceil(kanbanTodos.unassigned.length / tasksPerPage)),
        todo: Math.max(1, Math.ceil(kanbanTodos.todo.length / tasksPerPage)),
        completed: Math.max(1, Math.ceil(kanbanTodos.completed.length / tasksPerPage)),
    }), [kanbanTodos, tasksPerPage]);

    // Auto-adjust pages when they become invalid (e.g., moved all tasks from a page)
    useEffect(() => {
        if (unassignedPage > totalPagesKanban.unassigned) {
            setUnassignedPage(Math.max(1, totalPagesKanban.unassigned));
        }
    }, [unassignedPage, totalPagesKanban.unassigned]);

    useEffect(() => {
        if (todoPage > totalPagesKanban.todo) {
            setTodoPage(Math.max(1, totalPagesKanban.todo));
        }
    }, [todoPage, totalPagesKanban.todo]);

    useEffect(() => {
        if (completedPage > totalPagesKanban.completed) {
            setCompletedPage(Math.max(1, totalPagesKanban.completed));
        }
    }, [completedPage, totalPagesKanban.completed]);

    // Reset pages when tasks per page changes
    const handleTasksPerPageChange = (newSize: number) => {
        setTasksPerPage(newSize);
        setUnassignedPage(1);
        setTodoPage(1);
        setCompletedPage(1);
        setCurrentPage(1);
        setShowSettings(false);
    };

    // For Grid view filtering
    const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

    const filteredTodos = useMemo(() => {
        return todos.filter((todo) => {
            if (filter === 'active') return !todo.completed;
            if (filter === 'completed') return todo.completed;
            return true;
        });
    }, [todos, filter]);

    // Pagination calculations (for grid view)
    const totalPages = Math.ceil(filteredTodos.length / tasksPerPage);
    const startIndex = (currentPage - 1) * tasksPerPage;
    const endIndex = startIndex + tasksPerPage;
    const paginatedTodos = useMemo(() => {
        return filteredTodos.slice(startIndex, endIndex);
    }, [filteredTodos, startIndex, endIndex]);

    // Auto-adjust grid view page when it becomes invalid
    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(Math.max(1, totalPages));
        }
    }, [currentPage, totalPages]);

    const handleFilterChange = (newFilter: 'all' | 'active' | 'completed') => {
        setSlideDirection('right');
        setTimeout(() => {
            setFilter(newFilter);
            setCurrentPage(1);
            setSlideDirection(null);
        }, 150);
    };

    const handlePageChange = (newPage: number) => {
        const direction = newPage > currentPage ? 'left' : 'right';
        setSlideDirection(direction);
        setTimeout(() => {
            setCurrentPage(newPage);
            setSlideDirection(null);
        }, 150);
    };

    const completedCount = todos.filter((t) => t.completed).length;
    const totalCount = todos.length;
    const progressPercent = percentage(completedCount, totalCount);

    const handleDragStart = (event: DragStartEvent) => {
        setActiveDragId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveDragId(null);

        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        // Kanban view: Check if dropped on a column or a card within a column
        if (viewMode === 'kanban') {
            let targetStatus: TodoStatus | null = null;

            // Check if dropped directly on a column/area
            if (['pending', 'todo', 'completed'].includes(overId)) {
                targetStatus = overId as TodoStatus;
            } else {
                // Dropped on a card - find which column that card belongs to
                const overTodo = todos.find(t => t.id === overId);
                if (overTodo) {
                    targetStatus = overTodo.status || (overTodo.completed ? 'completed' : 'todo');
                }
            }

            if (targetStatus) {
                const todo = todos.find(t => t.id === activeId);
                if (!todo) return;

                const currentStatus = todo.status || (todo.completed ? 'completed' : 'todo');
                if (currentStatus === targetStatus) return;

                // Update todo status and completed state
                // Use null instead of undefined so Firestore clears the field
                const updates: Partial<Todo> = {
                    status: targetStatus,
                    completed: targetStatus === 'completed',
                };

                // Only set completedAt when completing, otherwise explicitly clear it
                if (targetStatus === 'completed') {
                    updates.completedAt = new Date();
                }

                updateTodo(activeId, updates, targetStatus !== 'completed');
                return;
            }
        }

        // Grid view: Reorder within the list
        if (active.id !== over.id) {
            const oldIndex = todos.findIndex((todo) => todo.id === active.id);
            const newIndex = todos.findIndex((todo) => todo.id === over.id);

            const newTodos = arrayMove(todos, oldIndex, newIndex);
            reorderTodos(newTodos);
        }
    };

    const activeTodo = activeDragId ? todos.find(t => t.id === activeDragId) : null;

    return (
        <div className="tasks-screen">
            {/* Header */}
            <div className="tasks-header">
                <div className="tasks-brand">
                    <span className="brand-dot" />
                    <span className="brand-name">TASKS</span>
                </div>
                <div className="tasks-header-right">
                    {/* View Toggle */}
                    <div className="view-toggle">
                        <button
                            className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                            onClick={() => setViewMode('grid')}
                            title="Grid View"
                        >
                            <LayoutGrid size={16} />
                        </button>
                        <button
                            className={`view-toggle-btn ${viewMode === 'kanban' ? 'active' : ''}`}
                            onClick={() => setViewMode('kanban')}
                            title="Kanban View"
                        >
                            <Columns size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Minimal Progress Bar */}
            {totalCount > 0 && (
                <div className="progress-section">
                    <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
                    </div>
                    <span className="progress-percent">{progressPercent}%</span>
                </div>
            )}

            {/* Main Content */}
            <div className="tasks-main">
                {/* Controls - Only show for Grid view */}
                {viewMode === 'grid' && (
                    <div className="tasks-controls">
                        <div className="controls-left">
                            <div className="tasks-filters">
                                {(['all', 'active', 'completed'] as const).map((f) => (
                                    <button
                                        key={f}
                                        className={`filter-btn ${filter === f ? 'active' : ''}`}
                                        onClick={() => handleFilterChange(f)}
                                    >
                                        {f.charAt(0).toUpperCase() + f.slice(1)}
                                    </button>
                                ))}
                            </div>

                            {/* Page size settings */}
                            <div className="page-settings">
                                <button
                                    className="settings-btn"
                                    onClick={() => setShowSettings(!showSettings)}
                                    title="Page settings"
                                >
                                    <Settings size={14} />
                                    <span>{tasksPerPage}</span>
                                </button>
                                {showSettings && (
                                    <div className="settings-dropdown">
                                        {PAGE_SIZE_OPTIONS.map((size) => (
                                            <button
                                                key={size}
                                                className={`settings-option ${tasksPerPage === size ? 'active' : ''}`}
                                                onClick={() => handleTasksPerPageChange(size)}
                                            >
                                                {size} per page
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {totalPages > 1 && (
                                <div className="pagination-controls mini">
                                    <button
                                        className="pagination-btn"
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1 || slideDirection !== null}
                                        aria-label="Previous page"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <div className="pagination-info">
                                        <span className="pagination-current">{currentPage}</span>
                                        <span className="pagination-separator">/</span>
                                        <span className="pagination-total">{totalPages}</span>
                                    </div>
                                    <button
                                        className="pagination-btn"
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage === totalPages || slideDirection !== null}
                                        aria-label="Next page"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="controls-right" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                            {totalCount > 0 && (
                                <div className="tasks-progress-mini">
                                    <span className="progress-value">{completedCount}/{totalCount}</span>
                                </div>
                            )}
                            <button className="add-btn-header" onClick={() => setShowAddForm(true)} aria-label="Add task">
                                <Plus size={18} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Kanban Controls */}
                {viewMode === 'kanban' && (
                    <div className="tasks-controls">
                        <div className="controls-left">
                            {/* Page size settings */}
                            <div className="page-settings">
                                <button
                                    className="settings-btn"
                                    onClick={() => setShowSettings(!showSettings)}
                                    title="Page settings"
                                >
                                    <Settings size={14} />
                                    <span>{tasksPerPage} per page</span>
                                </button>
                                {showSettings && (
                                    <div className="settings-dropdown">
                                        {PAGE_SIZE_OPTIONS.map((size) => (
                                            <button
                                                key={size}
                                                className={`settings-option ${tasksPerPage === size ? 'active' : ''}`}
                                                onClick={() => handleTasksPerPageChange(size)}
                                            >
                                                {size} per page
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="controls-right" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                            {totalCount > 0 && (
                                <div className="tasks-progress-mini">
                                    <span className="progress-value">{completedCount}/{totalCount}</span>
                                </div>
                            )}
                            <button className="add-btn-header" onClick={() => setShowAddForm(true)} aria-label="Add task">
                                <Plus size={18} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Task Views */}
                <DndContext
                    sensors={sensors}
                    collisionDetection={pointerWithin}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    {viewMode === 'grid' ? (
                        /* Grid View */
                        <SortableContext
                            items={paginatedTodos.map((t) => t.id)}
                            strategy={rectSortingStrategy}
                        >
                            <div className={`tasks-list ${slideDirection ? `slide-${slideDirection}` : ''}`}>
                                {paginatedTodos.length === 0 ? (
                                    <div className="tasks-empty">
                                        <span>{filter === 'all' ? 'No tasks yet' : `No ${filter} tasks`}</span>
                                    </div>
                                ) : (
                                    paginatedTodos.map((todo: Todo) => (
                                        <SortableTodoItem key={todo.id} todo={todo} />
                                    ))
                                )}
                            </div>
                        </SortableContext>
                    ) : (
                        /* Habit Tracker View */
                        <div className="habit-tracker">
                            {/* Unassigned cards on top */}
                            <DroppableArea
                                id="pending"
                                currentPage={unassignedPage}
                                totalPages={totalPagesKanban.unassigned}
                                totalItems={kanbanTodos.unassigned.length}
                                onPageChange={setUnassignedPage}
                            >
                                <SortableContext
                                    items={paginatedKanban.unassigned.map((t) => t.id)}
                                    strategy={rectSortingStrategy}
                                >
                                    {kanbanTodos.unassigned.length === 0 ? (
                                        <div className="unassigned-empty">Drag tasks here</div>
                                    ) : (
                                        paginatedKanban.unassigned.map((todo) => (
                                            <SortableTodoItem key={todo.id} todo={todo} />
                                        ))
                                    )}
                                </SortableContext>
                            </DroppableArea>

                            {/* Two columns below */}
                            <div className="habit-columns">
                                <DroppableColumn
                                    id="todo"
                                    title="To Do"
                                    count={kanbanTodos.todo.length}
                                    currentPage={todoPage}
                                    totalPages={totalPagesKanban.todo}
                                    onPageChange={setTodoPage}
                                >
                                    <SortableContext
                                        items={paginatedKanban.todo.map((t) => t.id)}
                                        strategy={rectSortingStrategy}
                                    >
                                        {kanbanTodos.todo.length === 0 ? (
                                            <div className="kanban-empty">No tasks to do</div>
                                        ) : (
                                            paginatedKanban.todo.map((todo) => (
                                                <SortableTodoItem key={todo.id} todo={todo} />
                                            ))
                                        )}
                                    </SortableContext>
                                </DroppableColumn>

                                <DroppableColumn
                                    id="completed"
                                    title="Completed"
                                    count={kanbanTodos.completed.length}
                                    currentPage={completedPage}
                                    totalPages={totalPagesKanban.completed}
                                    onPageChange={setCompletedPage}
                                >
                                    <SortableContext
                                        items={paginatedKanban.completed.map((t) => t.id)}
                                        strategy={rectSortingStrategy}
                                    >
                                        {kanbanTodos.completed.length === 0 ? (
                                            <div className="kanban-empty">No completed tasks</div>
                                        ) : (
                                            paginatedKanban.completed.map((todo) => (
                                                <SortableTodoItem key={todo.id} todo={todo} />
                                            ))
                                        )}
                                    </SortableContext>
                                </DroppableColumn>
                            </div>
                        </div>
                    )}

                    {/* Drag Overlay for smooth dragging */}
                    <DragOverlay>
                        {activeTodo ? <TodoItem todo={activeTodo} isDragging /> : null}
                    </DragOverlay>
                </DndContext>
            </div>

            {/* Add Form Modal */}
            {showAddForm && <AddTodoForm onClose={() => setShowAddForm(false)} />}
        </div>
    );
}
