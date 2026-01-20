// ========================================
// App Context - State Management
// ========================================

import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import {
    type Todo,
    type TodoStatus,
    type Tag,
    type Habit,
    type Goal,
    type GoalMilestone,
    type GoalProgressSnapshot,
    type PomodoroSession,
    type TimerSettings,
    type AppStats,

    DEFAULT_TIMER_SETTINGS,
    DEFAULT_TAGS,
    DEFAULT_USER_XP,
    XP_VALUES,
    type User,
} from '../types';
import { generateId, storage } from '../utils/helpers';
import { addLocationJitter, encryptLocation, decryptLocation } from '../utils/securityUtils';
import { awardXP } from '../services/xpService';

import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
    doc,
    setDoc,
    updateDoc,
    deleteDoc,
    getDocs,
    collection,
    query,
    orderBy,
    getDoc,
    writeBatch
} from 'firebase/firestore';

// State interface
interface AppState {
    todos: Todo[];
    habits: Habit[];
    goals: Goal[];
    tags: Tag[];
    sessions: PomodoroSession[];
    stats: AppStats;
    timerSettings: TimerSettings;
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    processingIds: string[]; // Track items currently being toggled
}

// Action types
type AppAction =
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_TODOS'; payload: Todo[] }
    | { type: 'ADD_TODO'; payload: Todo }
    | { type: 'UPDATE_TODO'; payload: { id: string; updates: Partial<Todo> } }
    | { type: 'DELETE_TODO'; payload: string }
    | { type: 'TOGGLE_TODO'; payload: string }
    | { type: 'SET_HABITS'; payload: Habit[] }
    | { type: 'ADD_HABIT'; payload: Habit }
    | { type: 'UPDATE_HABIT'; payload: { id: string; updates: Partial<Habit> } }
    | { type: 'DELETE_HABIT'; payload: string }
    | { type: 'TOGGLE_HABIT_DAY'; payload: { id: string; date: string } }
    | { type: 'SET_GOALS'; payload: Goal[] }
    | { type: 'ADD_GOAL'; payload: Goal }
    | { type: 'UPDATE_GOAL'; payload: { id: string; updates: Partial<Goal> } }
    | { type: 'DELETE_GOAL'; payload: string }
    | { type: 'UPDATE_GOAL_PROGRESS'; payload: { id: string; value: number; note?: string } }
    | { type: 'TOGGLE_GOAL_MILESTONE'; payload: { goalId: string; milestoneId: string } }
    | { type: 'SET_TAGS'; payload: Tag[] }
    | { type: 'ADD_TAG'; payload: Tag }
    | { type: 'UPDATE_TAG'; payload: { id: string; updates: Partial<Tag> } }
    | { type: 'DELETE_TAG'; payload: string }
    | { type: 'ADD_SESSION'; payload: PomodoroSession }
    | { type: 'UPDATE_SESSION'; payload: { id: string; updates: Partial<PomodoroSession> } }
    | { type: 'SET_SESSIONS'; payload: PomodoroSession[] }
    | { type: 'UPDATE_STATS'; payload: Partial<AppStats> }
    | { type: 'SET_TIMER_SETTINGS'; payload: Partial<TimerSettings> }
    | { type: 'LOGIN'; payload: User }
    | { type: 'LOGOUT' }
    | { type: 'SET_USER'; payload: User } // New action type for updating user profile
    | { type: 'UPDATE_USER_XP'; payload: { totalXp: number; rank: import('../types').Rank; xpHistory: any[] } }
    | { type: 'START_PROCESSING'; payload: string }
    | { type: 'STOP_PROCESSING'; payload: string };

// Initial state
const initialState: AppState = {
    todos: [],
    habits: [],
    goals: [],
    tags: DEFAULT_TAGS,
    sessions: [],
    stats: {
        totalSessions: 0,
        totalFocusTime: 0,
        updatedAt: new Date(),
    },
    timerSettings: DEFAULT_TIMER_SETTINGS,
    user: null,
    isAuthenticated: false,
    isLoading: true,
    processingIds: [],
};

// Helper function to calculate streak
function calculateStreak(completedDates: string[]): number {
    if (completedDates.length === 0) return 0;

    const sorted = [...completedDates].sort().reverse();
    const today = new Date().toISOString().split('T')[0];

    // Check if today or yesterday is in the list
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (sorted[0] !== today && sorted[0] !== yesterdayStr) {
        return 0; // Streak broken
    }

    let streak = 1;
    for (let i = 1; i < sorted.length; i++) {
        const current = new Date(sorted[i]);
        const previous = new Date(sorted[i - 1]);
        const diffDays = Math.floor((previous.getTime() - current.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            streak++;
        } else {
            break;
        }
    }

    return streak;
}

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
    switch (action.type) {
        case 'SET_LOADING':
            return { ...state, isLoading: action.payload };

        case 'SET_TODOS':
            return { ...state, todos: action.payload };

        case 'ADD_TODO':
            return { ...state, todos: [action.payload, ...state.todos] };

        case 'UPDATE_TODO':
            return {
                ...state,
                todos: state.todos.map((todo) =>
                    todo.id === action.payload.id
                        ? { ...todo, ...action.payload.updates }
                        : todo
                ),
            };

        case 'DELETE_TODO':
            return {
                ...state,
                todos: state.todos.filter((todo) => todo.id !== action.payload),
            };

        case 'TOGGLE_TODO':
            return {
                ...state,
                todos: state.todos.map((todo) =>
                    todo.id === action.payload
                        ? {
                            ...todo,
                            completed: !todo.completed,
                            completedAt: !todo.completed ? new Date() : undefined,
                            status: !todo.completed ? 'completed' : 'todo' as TodoStatus,
                        }
                        : todo
                ),
            };

        case 'SET_HABITS':
            return { ...state, habits: action.payload };

        case 'ADD_HABIT':
            return { ...state, habits: [action.payload, ...state.habits] };

        case 'UPDATE_HABIT':
            return {
                ...state,
                habits: state.habits.map((habit) =>
                    habit.id === action.payload.id
                        ? { ...habit, ...action.payload.updates }
                        : habit
                ),
            };

        case 'DELETE_HABIT':
            return {
                ...state,
                habits: state.habits.filter((habit) => habit.id !== action.payload),
            };

        case 'TOGGLE_HABIT_DAY':
            return {
                ...state,
                habits: state.habits.map((habit) => {
                    if (habit.id === action.payload.id) {
                        const dateStr = action.payload.date;
                        const isCompleted = habit.completedDates.includes(dateStr);
                        const newCompletedDates = isCompleted
                            ? habit.completedDates.filter(d => d !== dateStr)
                            : [...habit.completedDates, dateStr].sort();

                        // Calculate streak
                        const streak = calculateStreak(newCompletedDates);

                        return {
                            ...habit,
                            completedDates: newCompletedDates,
                            streakCount: streak,
                        };
                    }
                    return habit;
                }),
            };

        case 'SET_GOALS':
            return { ...state, goals: action.payload };

        case 'ADD_GOAL':
            return { ...state, goals: [action.payload, ...state.goals] };

        case 'UPDATE_GOAL':
            return {
                ...state,
                goals: state.goals.map((goal) =>
                    goal.id === action.payload.id
                        ? { ...goal, ...action.payload.updates }
                        : goal
                ),
            };

        case 'DELETE_GOAL':
            return {
                ...state,
                goals: state.goals.filter((goal) => goal.id !== action.payload),
            };

        case 'UPDATE_GOAL_PROGRESS':
            return {
                ...state,
                goals: state.goals.map((goal) => {
                    if (goal.id === action.payload.id) {
                        const newValue = action.payload.value;
                        let percentage: number;
                        if (goal.goalType === 'trackable') {
                            const totalDelta = goal.targetDirection === 'decrease'
                                ? goal.startingValue - goal.targetValue
                                : goal.targetValue - goal.startingValue;
                            const currentDelta = goal.targetDirection === 'decrease'
                                ? goal.startingValue - newValue
                                : newValue - goal.startingValue;
                            percentage = totalDelta === 0 ? 100 : Math.round((currentDelta / totalDelta) * 100);
                        } else {
                            percentage = Math.round((newValue / (goal.targetValue || 1)) * 100);
                        }

                        const snapshot: GoalProgressSnapshot = {
                            value: newValue,
                            date: new Date(),
                            percentage,
                        };

                        const progressHistory = [...(goal.progressHistory || []), snapshot];
                        const isCompleted = goal.targetDirection === 'decrease'
                            ? newValue <= goal.targetValue
                            : newValue >= goal.targetValue;

                        return {
                            ...goal,
                            currentValue: newValue,
                            progressHistory,
                            completedAt: isCompleted && !goal.completedAt ? new Date() : goal.completedAt,
                        };
                    }
                    return goal;
                }),
            };

        case 'TOGGLE_GOAL_MILESTONE':
            return {
                ...state,
                goals: state.goals.map((goal) => {
                    if (goal.id === action.payload.goalId && goal.milestones) {
                        const updatedMilestones = goal.milestones.map((m) => {
                            if (m.id === action.payload.milestoneId) {
                                const isCompleting = !m.completed;
                                return {
                                    ...m,
                                    completed: isCompleting,
                                    completedAt: isCompleting ? new Date() : undefined,
                                    xpAwarded: m.xpAwarded || isCompleting // Set to true on first completion
                                };
                            }
                            return m;
                        });
                        const completedCount = updatedMilestones.filter(m => m.completed).length;
                        const allComplete = completedCount === updatedMilestones.length;
                        return {
                            ...goal,
                            milestones: updatedMilestones,
                            completedAt: allComplete && !goal.completedAt ? new Date() : (allComplete ? goal.completedAt : undefined),
                        };
                    }
                    return goal;
                }),
            };

        case 'SET_TAGS':
            return { ...state, tags: action.payload };

        case 'ADD_TAG':
            return { ...state, tags: [...state.tags, action.payload] };

        case 'UPDATE_TAG':
            return {
                ...state,
                tags: state.tags.map((tag) =>
                    tag.id === action.payload.id
                        ? { ...tag, ...action.payload.updates }
                        : tag
                ),
            };

        case 'DELETE_TAG':
            return {
                ...state,
                tags: state.tags.filter((tag) => tag.id !== action.payload),
            };

        case 'ADD_SESSION':
            return { ...state, sessions: [action.payload, ...state.sessions] };

        case 'UPDATE_SESSION':
            return {
                ...state,
                sessions: state.sessions.map((session) =>
                    session.id === action.payload.id
                        ? { ...session, ...action.payload.updates }
                        : session
                ),
            };

        case 'SET_SESSIONS':
            return { ...state, sessions: action.payload };

        case 'UPDATE_STATS':
            return {
                ...state,
                stats: { ...state.stats, ...action.payload, updatedAt: new Date() },
            };

        case 'SET_TIMER_SETTINGS':
            return {
                ...state,
                timerSettings: { ...state.timerSettings, ...action.payload },
            };

        case 'LOGIN':
            return {
                ...state,
                user: action.payload,
                isAuthenticated: true,
            };

        case 'LOGOUT':
            return {
                ...state,
                user: null,
                isAuthenticated: false,
            };

        case 'SET_USER': // Handle the new SET_USER action
            return {
                ...state,
                user: action.payload,
            };

        case 'UPDATE_USER_XP':
            if (!state.user) return state;
            return {
                ...state,
                user: {
                    ...state.user,
                    xp: {
                        ...state.user.xp,
                        totalXp: action.payload.totalXp,
                        rank: action.payload.rank,
                        xpHistory: action.payload.xpHistory,
                    }
                }
            };

        case 'START_PROCESSING':
            return {
                ...state,
                processingIds: [...state.processingIds, action.payload]
            };

        case 'STOP_PROCESSING':
            return {
                ...state,
                processingIds: state.processingIds.filter(id => id !== action.payload)
            };

        default:
            return state;
    }
}

// Context interface
interface AppContextType {
    state: AppState;
    addTodo: (text: string, priority?: 'high' | 'medium' | 'low', tags?: string[]) => Promise<Todo>;
    updateTodo: (id: string, updates: Partial<Todo>, clearCompletedAt?: boolean) => Promise<void>;
    deleteTodo: (id: string) => Promise<void>;
    toggleTodo: (id: string) => Promise<void>;
    reorderTodos: (newTodos: Todo[]) => void;
    reorderHabits: (newHabits: Habit[]) => void;
    reorderGoals: (newGoals: Goal[]) => void;
    addHabit: (name: string, icon: string, color: string, targetDays: number[], tags?: string[]) => Promise<Habit>;
    updateHabit: (id: string, updates: Partial<Habit>) => Promise<void>;
    deleteHabit: (id: string) => Promise<void>;
    toggleHabitDay: (id: string, date: string) => Promise<void>;
    addGoal: (data: Omit<Goal, 'id' | 'currentValue' | 'createdAt' | 'completedAt' | 'progressHistory'>) => Promise<Goal>;
    updateGoal: (id: string, updates: Partial<Goal>) => Promise<void>;
    deleteGoal: (id: string) => Promise<void>;
    updateGoalProgress: (id: string, value: number, note?: string) => Promise<void>;
    toggleGoalMilestone: (goalId: string, milestoneId: string) => Promise<void>;
    createSession: (mode: PomodoroSession['mode'], duration: number, goal?: string, tags?: string[], preGeneratedId?: string) => Promise<PomodoroSession>;
    updateSession: (id: string, updates: Partial<PomodoroSession>) => Promise<void>;
    completeSession: (id: string, actualDuration: number) => Promise<void>;
    cancelSession: (id: string, actualDuration: number) => Promise<void>;
    addTag: (name: string, color: string) => Promise<void>;
    updateTag: (id: string, updates: Partial<Tag>) => Promise<void>;
    deleteTag: (id: string) => Promise<void>;
    updateTimerSettings: (settings: Partial<TimerSettings>) => Promise<void>;
    updateUserProfile: (updates: { isPublic?: boolean; location?: { lat: number; lng: number } }) => Promise<void>;
    login: (user: User) => void;
    logout: () => Promise<void>;
}

// Create context
const AppContext = createContext<AppContextType | undefined>(undefined);

// Storage keys
const STORAGE_KEYS = {
    TODOS: 'arc_todos',
    HABITS: 'arc_habits',
    GOALS: 'arc_goals',
    TAGS: 'arc_tags',
    SESSIONS: 'arc_sessions',
    STATS: 'arc_stats',
    TIMER_SETTINGS: 'arc_timer_settings',
    USER: 'arc_user',
};

// Provider component
export function AppProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(appReducer, initialState);

    // Helper to convert Firestore Timestamp to Date
    const convertDates = (data: any, dateFields: string[]) => {
        const newItem = { ...data };
        dateFields.forEach(field => {
            if (newItem[field] && typeof newItem[field].toDate === 'function') {
                newItem[field] = newItem[field].toDate();
            } else if (newItem[field] && typeof newItem[field] === 'string') {
                newItem[field] = new Date(newItem[field]);
            }
        });
        return newItem;
    };

    // Listen for Auth Changes & Load Data
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // Fetch User Doc for XP and settings
                const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
                const userData = userDoc.exists() ? userDoc.data() : {};

                let location = userData.location || undefined;
                if (typeof location === 'string') {
                    const decrypted = decryptLocation(location);
                    if (decrypted) {
                        location = decrypted;
                    }
                }

                // Convert xpHistory timestamps if they exist
                let userXp = userData.xp || DEFAULT_USER_XP;
                if (userXp.xpHistory && Array.isArray(userXp.xpHistory)) {
                    userXp = {
                        ...userXp,
                        xpHistory: userXp.xpHistory.map((event: any) => ({
                            ...event,
                            timestamp: event.timestamp?.toDate ? event.timestamp.toDate() : new Date(event.timestamp),
                        })),
                        lastDailyBonus: userXp.lastDailyBonus?.toDate
                            ? userXp.lastDailyBonus.toDate()
                            : userXp.lastDailyBonus ? new Date(userXp.lastDailyBonus) : undefined,
                    };
                }

                const user: User = {
                    ...userData, // Spread existing userData to include other fields
                    id: firebaseUser.uid,
                    name: firebaseUser.displayName || 'User',
                    email: firebaseUser.email || '',
                    isPro: false, // Assuming isPro is not in Firestore or defaults to false
                    avatar: firebaseUser.photoURL || undefined,
                    xp: userXp,
                    isPublic: userData.isPublic || false,
                    location: location, // Use the potentially decrypted location
                };
                dispatch({ type: 'LOGIN', payload: user });

                // Load Collections from Firestore
                try {
                    const userId = user.id;

                    // 1. Todos - fetch and sort by orderIndex (or createdAt as fallback)
                    const todosSnapshot = await getDocs(query(collection(db, 'users', userId, 'todos')));
                    const todos = todosSnapshot.docs
                        .map(doc => ({ id: doc.id, ...convertDates(doc.data(), ['createdAt', 'dueDate', 'completedAt']) }))
                        .sort((a: any, b: any) => {
                            // Sort by orderIndex if it exists, otherwise by createdAt (desc)
                            if (a.orderIndex !== undefined && b.orderIndex !== undefined) {
                                return a.orderIndex - b.orderIndex;
                            }
                            // Fallback to createdAt descending for items without orderIndex
                            const aTime = a.createdAt?.getTime?.() || 0;
                            const bTime = b.createdAt?.getTime?.() || 0;
                            return bTime - aTime;
                        }) as Todo[];
                    dispatch({ type: 'SET_TODOS', payload: todos });

                    // 2. Habits (and completions)
                    const habitsSnapshot = await getDocs(query(collection(db, 'users', userId, 'habits')));
                    const habits = (await Promise.all(habitsSnapshot.docs.map(async (docSnap) => {
                        const habitId = docSnap.id;
                        // Fetch completions subcollection
                        const completionsParams = await getDocs(collection(db, 'users', userId, 'habits', habitId, 'completions'));
                        const completedDates = completionsParams.docs.map(d => d.id); // dateString is ID

                        // Dynamically calculate streak to ensure accuracy
                        const streakCount = calculateStreak(completedDates);

                        return {
                            id: habitId,
                            ...convertDates(docSnap.data(), ['createdAt']),
                            completedDates,
                            streakCount, // Override stored value with dynamic calculation
                        } as Habit;
                    }))).sort((a: any, b: any) => {
                        if (a.orderIndex !== undefined && b.orderIndex !== undefined) return a.orderIndex - b.orderIndex;
                        return b.createdAt.getTime() - a.createdAt.getTime();
                    });
                    dispatch({ type: 'SET_HABITS', payload: habits });

                    // 3. Goals
                    const goalsSnapshot = await getDocs(query(collection(db, 'users', userId, 'goals')));
                    const goals = goalsSnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...convertDates(doc.data(), ['createdAt', 'deadline', 'completedAt']),
                        progressHistory: doc.data().progressHistory?.map((p: any) => ({ ...p, date: p.date.toDate() })) || []
                    }))
                        .sort((a: any, b: any) => {
                            if (a.orderIndex !== undefined && b.orderIndex !== undefined) return a.orderIndex - b.orderIndex;
                            return b.createdAt.getTime() - a.createdAt.getTime();
                        }) as Goal[];
                    dispatch({ type: 'SET_GOALS', payload: goals });

                    // 4. Sessions
                    const sessionsSnapshot = await getDocs(query(collection(db, 'users', userId, 'sessions'), orderBy('startedAt', 'desc')));
                    const sessions = sessionsSnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...convertDates(doc.data(), ['startedAt', 'completedAt'])
                    })) as PomodoroSession[];
                    dispatch({ type: 'SET_SESSIONS', payload: sessions });

                    // 5. Tags
                    const tagsSnapshot = await getDocs(collection(db, 'users', userId, 'tags'));
                    const tags = tagsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Tag[];
                    dispatch({ type: 'SET_TAGS', payload: tags });

                    // 6. Stats
                    const statsDoc = await getDoc(doc(db, 'users', userId, 'stats', 'summary'));
                    if (statsDoc.exists()) {
                        dispatch({ type: 'UPDATE_STATS', payload: convertDates(statsDoc.data(), ['lastSessionAt', 'updatedAt']) });
                    }

                    // 7. Timer Settings
                    const timerSettingsDoc = await getDoc(doc(db, 'users', userId, 'settings', 'timer'));
                    if (timerSettingsDoc.exists()) {
                        dispatch({ type: 'SET_TIMER_SETTINGS', payload: timerSettingsDoc.data() });
                    }

                } catch (error) {
                    console.error("Error loading Firestore data:", error);
                }
            } else {
                dispatch({ type: 'LOGOUT' });
            }
            dispatch({ type: 'SET_LOADING', payload: false });
        });
        return () => unsubscribe();
    }, []);

    // Load data from localStorage on mount
    useEffect(() => {
        const loadData = () => {
            const todos = storage.get<Todo[]>(STORAGE_KEYS.TODOS, []).map((todo) => ({
                ...todo,
                createdAt: new Date(todo.createdAt),
                dueDate: todo.dueDate ? new Date(todo.dueDate) : undefined,
                completedAt: todo.completedAt ? new Date(todo.completedAt) : undefined,
            }));

            const habits = storage.get<Habit[]>(STORAGE_KEYS.HABITS, []).map((habit) => ({
                ...habit,
                createdAt: new Date(habit.createdAt),
            })); // We trust array order from LS

            const goals = storage.get<Goal[]>(STORAGE_KEYS.GOALS, []).map((goal) => ({
                ...goal,
                createdAt: new Date(goal.createdAt),
                deadline: goal.deadline ? new Date(goal.deadline) : undefined,
                completedAt: goal.completedAt ? new Date(goal.completedAt) : undefined,
                progressHistory: (goal.progressHistory || []).map((snap) => ({
                    ...snap,
                    date: new Date(snap.date),
                })),
            }));

            const tags = storage.get<Tag[]>(STORAGE_KEYS.TAGS, DEFAULT_TAGS);

            const sessions = storage.get<PomodoroSession[]>(STORAGE_KEYS.SESSIONS, []).map((session) => ({
                ...session,
                startedAt: new Date(session.startedAt),
                completedAt: session.completedAt ? new Date(session.completedAt) : undefined,
            }));

            const stats = storage.get<AppStats>(STORAGE_KEYS.STATS, initialState.stats);
            const timerSettings = storage.get<TimerSettings>(STORAGE_KEYS.TIMER_SETTINGS, DEFAULT_TIMER_SETTINGS);
            const user = storage.get<User | null>(STORAGE_KEYS.USER, null);
            if (user && !user.xp) {
                user.xp = DEFAULT_USER_XP;
            }

            // Only dispatch if not authenticated, otherwise Firestore data takes precedence
            if (!state.isAuthenticated) {
                dispatch({ type: 'SET_TODOS', payload: todos });
                dispatch({ type: 'SET_HABITS', payload: habits });
                dispatch({ type: 'SET_GOALS', payload: goals });
                dispatch({ type: 'SET_TAGS', payload: tags });
                dispatch({ type: 'SET_SESSIONS', payload: sessions });
                dispatch({ type: 'UPDATE_STATS', payload: stats });
                dispatch({ type: 'SET_TIMER_SETTINGS', payload: timerSettings });
                if (user) dispatch({ type: 'LOGIN', payload: user });
            }
            dispatch({ type: 'SET_LOADING', payload: false });
        };

        loadData();
    }, [state.isAuthenticated]); // Rerun if auth state changes to potentially load local data if logged out

    // Persist data to localStorage on changes
    useEffect(() => {
        if (!state.isLoading) {
            storage.set(STORAGE_KEYS.TODOS, state.todos);
        }
    }, [state.todos, state.isLoading]);

    useEffect(() => {
        if (!state.isLoading) {
            storage.set(STORAGE_KEYS.HABITS, state.habits);
        }
    }, [state.habits, state.isLoading]);

    useEffect(() => {
        if (!state.isLoading) {
            storage.set(STORAGE_KEYS.GOALS, state.goals);
        }
    }, [state.goals, state.isLoading]);

    useEffect(() => {
        if (!state.isLoading) {
            storage.set(STORAGE_KEYS.TAGS, state.tags);
        }
    }, [state.tags, state.isLoading]);

    useEffect(() => {
        if (!state.isLoading) {
            storage.set(STORAGE_KEYS.SESSIONS, state.sessions);
        }
    }, [state.sessions, state.isLoading]);

    useEffect(() => {
        if (!state.isLoading) {
            storage.set(STORAGE_KEYS.STATS, state.stats);
        }
    }, [state.stats, state.isLoading]);

    useEffect(() => {
        if (!state.isLoading) {
            storage.set(STORAGE_KEYS.TIMER_SETTINGS, state.timerSettings);
        }
    }, [state.timerSettings, state.isLoading]);

    useEffect(() => {
        if (!state.isLoading) {
            storage.set(STORAGE_KEYS.USER, state.user);
        }
    }, [state.user, state.isLoading]);

    // Todo actions
    const addTodo = async (text: string, priority?: 'high' | 'medium' | 'low', tags: string[] = []): Promise<Todo> => {
        const newTodo: Todo = {
            id: generateId(),
            text,
            completed: false,
            status: 'pending', // New tasks start as unassigned
            createdAt: new Date(),
            priority,
            tags,
        };
        dispatch({ type: 'ADD_TODO', payload: newTodo }); // Optimistic Update

        if (state.user) {
            try {
                await setDoc(doc(db, 'users', state.user.id, 'todos', newTodo.id), newTodo);
            } catch (e) { console.error("Firestore Error adding todo:", e); }
        }
        return newTodo;
    };

    const updateTodo = async (id: string, updates: Partial<Todo>, clearCompletedAt?: boolean) => {
        // For local state, set completedAt to undefined when clearing
        const localUpdates = clearCompletedAt
            ? { ...updates, completedAt: undefined }
            : updates;
        dispatch({ type: 'UPDATE_TODO', payload: { id, updates: localUpdates } });

        if (state.user) {
            try {
                // For Firestore, use null to explicitly clear the field
                const firestoreUpdates = clearCompletedAt
                    ? { ...updates, completedAt: null }
                    : updates;
                await updateDoc(doc(db, 'users', state.user.id, 'todos', id), firestoreUpdates);
            } catch (e) { console.error("Firestore Error updating todo:", e); }
        }
    };

    const deleteTodo = async (id: string) => {
        dispatch({ type: 'DELETE_TODO', payload: id });
        if (state.user) {
            try {
                await deleteDoc(doc(db, 'users', state.user.id, 'todos', id));
            } catch (e) { console.error("Firestore Error deleting todo:", e); }
        }
    };

    const toggleTodo = async (id: string) => {
        if (state.processingIds.includes(id)) return;

        const todo = state.todos.find(t => t.id === id);
        if (!todo) return;

        dispatch({ type: 'START_PROCESSING', payload: id });

        try {
            const isCompleting = !todo.completed;
            const newStatus = isCompleting ? 'completed' : 'todo';
            const updates = {
                completed: isCompleting,
                status: newStatus,
                completedAt: isCompleting ? new Date() : undefined
            };

            dispatch({ type: 'TOGGLE_TODO', payload: id });

            if (state.user) {
                await updateDoc(doc(db, 'users', state.user.id, 'todos', id),
                    updates.completed
                        ? { completed: true, status: 'completed', completedAt: updates.completedAt }
                        : { completed: false, status: 'todo', completedAt: null }
                );

                // Award or Deduct XP for completing/uncompleting a todo
                const xpAmount = todo.priority === 'high' ? XP_VALUES.todoHighPriority : XP_VALUES.todo;
                const finalAmount = isCompleting ? xpAmount : -xpAmount;
                const description = isCompleting ? `Completed: ${todo.text}` : `Uncompleted: ${todo.text}`;

                const updatedXp = await awardXP(state.user.id, finalAmount, 'todo', description, state.user.xp);
                dispatch({ type: 'UPDATE_USER_XP', payload: updatedXp });
            }
        } catch (e) {
            console.error("Firestore Error toggling todo:", e);
        } finally {
            dispatch({ type: 'STOP_PROCESSING', payload: id });
        }
    };

    // Habit actions
    const addHabit = async (name: string, icon: string, color: string, targetDays: number[], tags: string[] = []): Promise<Habit> => {
        const newHabit: Habit = {
            id: generateId(),
            name,
            icon,
            color,
            targetDays,
            completedDates: [],
            streakCount: 0,
            tags,
            createdAt: new Date(),
        };
        dispatch({ type: 'ADD_HABIT', payload: newHabit });

        if (state.user) {
            try {
                await setDoc(doc(db, 'users', state.user.id, 'habits', newHabit.id), newHabit);
            } catch (e) { console.error("Firestore Error adding habit:", e); }
        }
        return newHabit;
    };

    const updateHabit = async (id: string, updates: Partial<Habit>) => {
        dispatch({ type: 'UPDATE_HABIT', payload: { id, updates } });
        if (state.user) {
            try {
                await updateDoc(doc(db, 'users', state.user.id, 'habits', id), updates);
            } catch (e) { console.error("Firestore Error updating habit:", e); }
        }
    };

    const deleteHabit = async (id: string) => {
        dispatch({ type: 'DELETE_HABIT', payload: id });
        if (state.user) {
            try {
                await deleteDoc(doc(db, 'users', state.user.id, 'habits', id));
            } catch (e) { console.error("Firestore Error deleting habit:", e); }
        }
    };

    const toggleHabitDay = async (id: string, date: string) => {
        const lockId = `${id}-${date}`;
        if (state.processingIds.includes(lockId)) return;

        const habit = state.habits.find(h => h.id === id);
        if (!habit) return;

        dispatch({ type: 'START_PROCESSING', payload: lockId });

        try {
            const isCompleted = habit.completedDates.includes(date);
            dispatch({ type: 'TOGGLE_HABIT_DAY', payload: { id, date } });

            if (state.user) {
                const completionRef = doc(db, 'users', state.user.id, 'habits', id, 'completions', date);
                if (isCompleted) {
                    await deleteDoc(completionRef);
                } else {
                    await setDoc(completionRef, { completedAt: new Date() });
                }

                // Recalculate streak to update persistence
                const newCompletedDates = isCompleted
                    ? habit.completedDates.filter(d => d !== date)
                    : [...habit.completedDates, date].sort();
                const newStreak = calculateStreak(newCompletedDates);

                // Update streak count in Firestore
                await updateDoc(doc(db, 'users', state.user.id, 'habits', id), {
                    streakCount: newStreak
                });

                // Award or Deduct XP for completing/uncompleting a habit
                const hasStreakBonus = habit.streakCount >= 7;
                const xpAmount = XP_VALUES.habit + (hasStreakBonus ? XP_VALUES.habitStreakBonus : 0);
                const finalAmount = isCompleted ? -xpAmount : xpAmount;
                const description = isCompleted ? `Uncompleted: ${habit.name}` : `Completed: ${habit.name}`;

                const updatedXp = await awardXP(state.user.id, finalAmount, 'habit', description, state.user.xp);
                dispatch({ type: 'UPDATE_USER_XP', payload: updatedXp });
            }
        } catch (e) {
            console.error("Firestore Error toggling habit day:", e);
        } finally {
            dispatch({ type: 'STOP_PROCESSING', payload: lockId });
        }
    };

    // Goal actions
    const addGoal = async (data: Omit<Goal, 'id' | 'currentValue' | 'createdAt' | 'completedAt' | 'progressHistory'>): Promise<Goal> => {
        const initialValue = data.startingValue ?? 0;
        const newGoal: Goal = {
            id: generateId(),
            ...data,
            currentValue: initialValue,
            createdAt: new Date(),
            progressHistory: [{
                date: new Date(),
                value: initialValue,
                percentage: 0,
            }],
        };
        dispatch({ type: 'ADD_GOAL', payload: newGoal });
        if (state.user) {
            try {
                const goalForFirestore = Object.fromEntries(
                    Object.entries(newGoal).filter(([_, v]) => v !== undefined)
                );
                await setDoc(doc(db, 'users', state.user.id, 'goals', newGoal.id), goalForFirestore);
            } catch (e) { console.error("Firestore Error adding goal:", e); }
        }
        return newGoal;
    };

    const updateGoal = async (id: string, updates: Partial<Goal>) => {
        dispatch({ type: 'UPDATE_GOAL', payload: { id, updates } });
        if (state.user) {
            try {
                const updatesForFirestore = Object.fromEntries(
                    Object.entries(updates).filter(([_, v]) => v !== undefined)
                );
                await updateDoc(doc(db, 'users', state.user.id, 'goals', id), updatesForFirestore);
            } catch (e) { console.error("Firestore Error updating goal:", e); }
        }
    };

    const deleteGoal = async (id: string) => {
        dispatch({ type: 'DELETE_GOAL', payload: id });
        if (state.user) {
            try {
                await deleteDoc(doc(db, 'users', state.user.id, 'goals', id));
            } catch (e) { console.error("Firestore Error deleting goal:", e); }
        }
    };

    const updateGoalProgress = async (id: string, value: number, note?: string) => {
        dispatch({ type: 'UPDATE_GOAL_PROGRESS', payload: { id, value, note } });

        if (state.user) {
            const goal = state.goals.find(g => g.id === id);
            if (!goal) return;

            // Calculate new history snapshot
            const percentage = Math.min(100, Math.round((value / goal.targetValue) * 100));
            const snapshot = { value, date: new Date(), percentage };
            const newHistory = [...(goal.progressHistory || []), snapshot];

            const isComplete = value >= goal.targetValue;
            const wasAlreadyComplete = goal.completedAt !== undefined;

            try {
                await updateDoc(doc(db, 'users', state.user.id, 'goals', id), {
                    currentValue: value,
                    progressHistory: newHistory,
                    completedAt: (isComplete && !goal.completedAt) ? new Date() : (goal.completedAt || null),
                });

                // Award XP for completing a goal (only once)
                if (isComplete && !wasAlreadyComplete) {
                    const updatedXp = await awardXP(state.user.id, XP_VALUES.goalComplete, 'goal', `Achieved: ${goal.name}`, state.user.xp);
                    dispatch({ type: 'UPDATE_USER_XP', payload: updatedXp });
                }
            } catch (e) { console.error("Firestore Error updating goal progress:", e); }
        }
    };

    const toggleGoalMilestone = async (goalId: string, milestoneId: string) => {
        if (state.processingIds.includes(milestoneId)) return;

        const goal = state.goals.find(g => g.id === goalId);
        if (!goal || !goal.milestones) return;

        const milestone = goal.milestones.find(m => m.id === milestoneId);
        if (!milestone) return;

        dispatch({ type: 'START_PROCESSING', payload: milestoneId });

        try {
            dispatch({ type: 'TOGGLE_GOAL_MILESTONE', payload: { goalId, milestoneId } });

            if (state.user) {
                const isCompletingMilestone = !milestone.completed;
                // Only award XP on first completion (when xpAwarded is not yet true)
                const shouldAwardXp = isCompletingMilestone && !milestone.xpAwarded;

                const updatedMilestones = goal.milestones.map((m: GoalMilestone) =>
                    m.id === milestoneId
                        ? {
                            ...m,
                            completed: !m.completed,
                            completedAt: !m.completed ? new Date() : undefined,
                            xpAwarded: m.xpAwarded || isCompletingMilestone // Set to true on first completion
                        }
                        : m
                );
                const completedCount = updatedMilestones.filter((m: GoalMilestone) => m.completed).length;
                const allComplete = completedCount === updatedMilestones.length;

                await updateDoc(doc(db, 'users', state.user.id, 'goals', goalId), {
                    milestones: updatedMilestones,
                    completedAt: allComplete && !goal.completedAt ? new Date() : (allComplete ? goal.completedAt : null),
                });

                // Only award XP on first completion (no deduction on uncheck)
                if (shouldAwardXp) {
                    const description = `Milestone: ${milestone.title || 'Step completed'}`;
                    const updatedXp = await awardXP(state.user.id, XP_VALUES.milestone, 'milestone', description, state.user.xp);
                    dispatch({ type: 'UPDATE_USER_XP', payload: updatedXp });
                }
            }
        } catch (e) {
            console.error("Firestore Error toggling goal milestone:", e);
        } finally {
            dispatch({ type: 'STOP_PROCESSING', payload: milestoneId });
        }
    };

    // Session Actions
    const createSession = async (mode: PomodoroSession['mode'], duration: number, goal?: string, tags: string[] = [], preGeneratedId?: string): Promise<PomodoroSession> => {
        const sessionId = preGeneratedId || generateId();
        const startedAt = new Date();

        // Build session object for local state
        const newSession: PomodoroSession = {
            id: sessionId,
            mode,
            duration,
            tags,
            startedAt,
            status: 'active',
        };

        // Add goal only if provided
        if (goal) {
            newSession.goal = goal;
        }

        dispatch({ type: 'ADD_SESSION', payload: newSession });

        if (state.user) {
            try {
                // Create Firestore-safe object (no undefined values)
                const firestoreData: Record<string, any> = {
                    id: sessionId,
                    mode,
                    duration,
                    tags,
                    startedAt,
                    status: 'active',
                };
                if (goal) {
                    firestoreData.goal = goal;
                }
                await setDoc(doc(db, 'users', state.user.id, 'sessions', sessionId), firestoreData);
            } catch (e) { console.error("Firestore Error creating session:", e); }
        }
        return newSession;
    };

    const updateSession = async (id: string, updates: Partial<PomodoroSession>) => {
        dispatch({ type: 'UPDATE_SESSION', payload: { id, updates } });
        if (state.user) {
            try {
                await updateDoc(doc(db, 'users', state.user.id, 'sessions', id), updates);
            } catch (e) { console.error("Firestore Error updating session:", e); }
        }
    };

    const completeSession = async (id: string, actualDuration: number) => {
        // Try to find session for mode check, but we'll assume focus mode if not found
        // (this can happen due to React state batching)
        const session = state.sessions.find((s) => s.id === id);
        const isFocus = session ? session.mode === 'focus' : true; // Default to focus if not found

        dispatch({ type: 'UPDATE_SESSION', payload: { id, updates: { status: 'completed', actualDuration, completedAt: new Date() } } });
        if (isFocus) {
            dispatch({
                type: 'UPDATE_STATS', payload: {
                    totalSessions: state.stats.totalSessions + 1,
                    totalFocusTime: state.stats.totalFocusTime + actualDuration
                }
            });
        }

        if (state.user) {
            try {
                await updateDoc(doc(db, 'users', state.user.id, 'sessions', id), {
                    status: 'completed',
                    actualDuration,
                    completedAt: new Date()
                });
                // Also Update Stats Collection if we want to follow schema strictly
                if (isFocus) {
                    await setDoc(doc(db, 'users', state.user.id, 'stats', 'summary'), {
                        totalSessions: state.stats.totalSessions + 1,
                        totalFocusTime: state.stats.totalFocusTime + actualDuration,
                        lastSessionAt: new Date(),
                        updatedAt: new Date()
                    }, { merge: true });

                    // Log session activity and award XP (1 XP per minute, minimum 5 minutes for XP)
                    const minutesFocused = Math.floor(actualDuration / 60);
                    const xpAmount = minutesFocused >= XP_VALUES.sessionMinMinutes
                        ? Math.floor(minutesFocused * XP_VALUES.sessionPerMinute)
                        : 0;
                    const updatedXp = await awardXP(state.user.id, xpAmount, 'session', `Completed ${minutesFocused} min focus session`, state.user.xp);
                    dispatch({ type: 'UPDATE_USER_XP', payload: updatedXp });
                }
            } catch (e) { console.error("Firestore Error completing session:", e); }
        }
    };

    // Cancel/stop a session midway - still records the time spent
    const cancelSession = async (id: string, actualDuration: number) => {
        const session = state.sessions.find((s) => s.id === id);
        const isFocus = session && session.mode === 'focus';

        dispatch({ type: 'UPDATE_SESSION', payload: { id, updates: { status: 'cancelled', actualDuration, completedAt: new Date() } } });

        // Still count the focus time for stats (but not as a completed session)
        if (isFocus && actualDuration > 0) {
            dispatch({
                type: 'UPDATE_STATS', payload: {
                    totalFocusTime: state.stats.totalFocusTime + actualDuration
                }
            });
        }

        if (state.user) {
            try {
                await updateDoc(doc(db, 'users', state.user.id, 'sessions', id), {
                    status: 'cancelled',
                    actualDuration,
                    completedAt: new Date()
                });
                // Update focus time in stats (but not session count)
                if (isFocus && actualDuration > 0) {
                    await setDoc(doc(db, 'users', state.user.id, 'stats', 'summary'), {
                        totalFocusTime: state.stats.totalFocusTime + actualDuration,
                        updatedAt: new Date()
                    }, { merge: true });

                    // Log session activity and award XP (1 XP per minute, minimum 5 minutes for XP)
                    const minutesFocused = Math.floor(actualDuration / 60);
                    const xpAmount = minutesFocused >= XP_VALUES.sessionMinMinutes
                        ? Math.floor(minutesFocused * XP_VALUES.sessionPerMinute)
                        : 0;
                    const updatedXp = await awardXP(state.user.id, xpAmount, 'session', `Completed ${minutesFocused} min focus session`, state.user.xp);
                    dispatch({ type: 'UPDATE_USER_XP', payload: updatedXp });
                }
            } catch (e) { console.error("Firestore Error cancelling session:", e); }
        }
    };

    // Tag Actions
    const addTag = async (name: string, color: string) => {
        const newTag: Tag = { id: generateId(), name, color };
        dispatch({ type: 'ADD_TAG', payload: newTag });
        if (state.user) {
            try {
                await setDoc(doc(db, 'users', state.user.id, 'tags', newTag.id), newTag);
            } catch (e) { console.error("Firestore Error adding tag:", e); }
        }
    };

    const updateTag = async (id: string, updates: Partial<Tag>) => {
        dispatch({ type: 'UPDATE_TAG', payload: { id, updates } });
        if (state.user) {
            try {
                await updateDoc(doc(db, 'users', state.user.id, 'tags', id), updates);
            } catch (e) { console.error("Firestore Error updating tag:", e); }
        }
    };

    const deleteTag = async (id: string) => {
        dispatch({ type: 'DELETE_TAG', payload: id });
        if (state.user) {
            try {
                await deleteDoc(doc(db, 'users', state.user.id, 'tags', id));
            } catch (e) { console.error("Firestore Error deleting tag:", e); }
        }
    };

    const updateTimerSettings = async (settings: Partial<TimerSettings>) => {
        dispatch({ type: 'SET_TIMER_SETTINGS', payload: settings });
        if (state.user) {
            try {
                await setDoc(doc(db, 'users', state.user.id, 'settings', 'timer'), settings, { merge: true });
            } catch (e) { console.error("Firestore Error updating timer settings:", e); }
        }
    };

    const updateUserProfile = async (updates: { isPublic?: boolean; location?: { lat: number; lng: number } }) => {
        if (!state.user) return;

        const userRef = doc(db, 'users', state.user.id);

        // Apply jitter and encryption if location is being updated
        let locationToStore: any = updates.location;
        let decryptedLocationForState = state.user.location; // Default to current location

        if (updates.location !== undefined) {
            if (updates.location && typeof updates.location === 'object') {
                const jittered = addLocationJitter(updates.location.lat, updates.location.lng);
                locationToStore = encryptLocation(jittered);
                decryptedLocationForState = jittered; // The jittered location is what we want in the app's state
            } else if (updates.location === null) {
                locationToStore = null;
                decryptedLocationForState = undefined;
            }
        }

        const updatedUser: User = {
            ...state.user,
            ...updates,
            location: decryptedLocationForState, // Ensure we don't accidentally clear it if not in updates
        };

        try {
            await updateDoc(userRef, {
                isPublic: updates.isPublic !== undefined ? updates.isPublic : state.user.isPublic,
                location: locationToStore, // Store the encrypted one in Firestore
            });

            dispatch({ type: 'SET_USER', payload: updatedUser });
        } catch (e) { console.error("Firestore Error updating user profile:", e); }
    };

    const login = (user: User) => {
        dispatch({ type: 'LOGIN', payload: user });
    };

    const logout = async () => {
        try {
            // Immediately clear local state for responsive UX
            dispatch({ type: 'LOGOUT' });

            // Clear all app data from localStorage
            Object.values(STORAGE_KEYS).forEach(key => {
                localStorage.removeItem(key);
            });

            // Sign out from Firebase
            await signOut(auth);
        } catch (error) {
            console.error('Logout error:', error);
            // Even if Firebase signout fails, keep local state cleared
        }
    };

    const value: AppContextType = {
        state,
        addTodo,
        updateTodo,
        deleteTodo,
        toggleTodo,
        reorderTodos: async (newTodos: Todo[]) => {
            dispatch({ type: 'SET_TODOS', payload: newTodos });

            // Persist order to Firestore
            if (state.user) {
                try {
                    const batch = writeBatch(db);
                    newTodos.forEach((todo, index) => {
                        const todoRef = doc(db, 'users', state.user!.id, 'todos', todo.id);
                        batch.update(todoRef, { orderIndex: index });
                    });
                    await batch.commit();
                } catch (error) {
                    console.error('Failed to persist todo order:', error);
                }
            }
        },
        reorderHabits: async (newHabits: Habit[]) => {
            dispatch({ type: 'SET_HABITS', payload: newHabits });

            if (state.user) {
                try {
                    const batch = writeBatch(db);
                    newHabits.forEach((habit, index) => {
                        const habitRef = doc(db, 'users', state.user!.id, 'habits', habit.id);
                        batch.update(habitRef, { orderIndex: index });
                    });
                    await batch.commit();
                } catch (error) {
                    console.error('Failed to persist habit order:', error);
                }
            }
        },
        reorderGoals: async (newGoals: Goal[]) => {
            dispatch({ type: 'SET_GOALS', payload: newGoals });

            if (state.user) {
                try {
                    const batch = writeBatch(db);
                    newGoals.forEach((goal, index) => {
                        const goalRef = doc(db, 'users', state.user!.id, 'goals', goal.id);
                        batch.update(goalRef, { orderIndex: index });
                    });
                    await batch.commit();
                } catch (error) {
                    console.error('Failed to persist goal order:', error);
                }
            }
        },
        addHabit,
        updateHabit,
        deleteHabit,
        toggleHabitDay,
        addGoal,
        updateGoal,
        deleteGoal,
        updateGoalProgress,
        toggleGoalMilestone,
        addTag,
        updateTag,
        deleteTag,
        createSession,
        updateSession,
        completeSession,
        cancelSession,
        updateTimerSettings,
        updateUserProfile,
        login,
        logout,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// Hook to use the context
export function useApp() {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
}
