// ========================================
// Arc Type Definitions
// ========================================

// ========================================
// SHARED TYPES
// ========================================

export type TodoStatus = 'pending' | 'todo' | 'completed';

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  status: TodoStatus;
  createdAt: Date;
  priority?: 'high' | 'medium' | 'low';
  dueDate?: Date;
  completedAt?: Date;
  tags: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  isPro: boolean;
  xp: UserXP;
  isPublic: boolean;
  showLocationOnMap: boolean; // Whether to show user's pin on the map (still appears in leaderboard list)
  location?: { lat: number; lng: number } | string; // Coordinates or encrypted string for 50-mile radius leaderboard
}

// ========================================
// XP & GAMIFICATION TYPES
// ========================================

export type Rank = 'novice' | 'apprentice' | 'achiever' | 'champion' | 'master' | 'legend';

export type XPSource = 'todo' | 'habit' | 'goal' | 'milestone' | 'session' | 'daily';

export interface XPEvent {
  id: string;
  amount: number;
  source: XPSource;
  description: string;
  timestamp: Date;
}

export interface UserXP {
  totalXp: number;
  rank: Rank;
  xpHistory: XPEvent[];
  lastDailyBonus?: Date;
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  avatar?: string;
  rank: Rank;
  totalXp: number;
  distance?: number; // Distance in miles (for nearby leaderboard)
  location?: { lat: number; lng: number }; // Stable coordinates for map display
  showLocationOnMap?: boolean; // Whether to show pin on map (default true)
}

// Rank thresholds
export const RANK_THRESHOLDS: Record<Rank, number> = {
  novice: 0,
  apprentice: 500,
  achiever: 2000,
  champion: 5000,
  master: 15000,
  legend: 50000,
};

// Rank display info
export const RANK_INFO: Record<Rank, { name: string; icon: string; color: string }> = {
  novice: { name: 'Novice', icon: 'Sprout', color: '#10B981' },        // Green
  apprentice: { name: 'Apprentice', icon: 'Zap', color: '#3B82F6' },   // Blue
  achiever: { name: 'Achiever', icon: 'Target', color: '#F59E0B' },     // Amber
  champion: { name: 'Champion', icon: 'Trophy', color: '#f97316' },     // Primary (Orange)
  master: { name: 'Master', icon: 'Crown', color: '#8B5CF6' },         // Purple
  legend: { name: 'Legend', icon: 'Gem', color: '#EC4899' },           // Pink
};

// XP values for actions
export const XP_VALUES = {
  todo: 10,
  todoHighPriority: 15,
  habit: 15,
  habitStreakBonus: 10, // 7+ day streak
  milestone: 25,
  goalComplete: 50,
  sessionPerMinute: 0.25, // 0.25 XP per minute of focus time (1 XP per 4 minutes)
  sessionMinMinutes: 5, // Minimum 5 minutes to earn XP
  dailyBonus: 5,
};

// Default XP state
export const DEFAULT_USER_XP: UserXP = {
  totalXp: 0,
  rank: 'novice',
  xpHistory: [],
};

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface PomodoroSession {
  id: string;
  goal?: string;
  tags: string[];
  duration: number; // in seconds
  actualDuration?: number; // in seconds
  startedAt: Date;
  completedAt?: Date;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  mode: 'focus' | 'shortBreak' | 'longBreak';
}

export interface Habit {
  id: string;
  name: string;
  icon: string;
  color: string;
  completedDates: string[]; // ISO date strings
  streakCount: number;
  targetDays: number[]; // 0 = Sunday, 6 = Saturday
  tags: string[];
  createdAt: Date;
}

// ========================================
// Snapshot of goal progress at a point in time.
// ========================================
export interface GoalProgressSnapshot {
  value: number;
  date: Date;
  percentage: number;
  note?: string;
}

// ========================================
// Goal Types for trackable vs milestone-based.
// ========================================
export type GoalType = 'trackable' | 'milestone';

// ========================================
// Milestone for milestone-based goals.
// ========================================
export interface GoalMilestone {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: Date;
  xpAwarded?: boolean; // Track if XP has been awarded for this milestone
}

// ========================================
// Goal Categories for grouping and color-coding.
// ========================================
export type GoalCategory = 'financial' | 'social' | 'fitness' | 'learning' | 'career' | 'personal';

// ========================================
// The main Goal interface.
// ========================================
export interface Goal {
  id: string;
  name: string;
  description?: string;

  // Goal Type
  goalType: GoalType; // 'trackable' or 'milestone'

  // Progress Tracking (for trackable goals)
  startingValue: number;
  targetValue: number;
  currentValue: number;
  targetDirection: 'increase' | 'decrease';
  unit: string;               // e.g. "$", "books", "kg"

  // Milestones (for milestone-based goals)
  milestones?: GoalMilestone[];

  // Categorization & Styling
  category: GoalCategory;
  tags: string[];
  icon: string;
  color: string;

  // Timeframe
  createdAt: Date;
  deadline?: Date;
  completedAt?: Date;

  // History
  progressHistory?: GoalProgressSnapshot[];
  notes?: string;
}

// ========================================
// TIMER TYPES
// ========================================

export interface TimerSettings {
  focusDuration: number; // in minutes
  shortBreakDuration: number; // in minutes
  longBreakDuration: number; // in minutes
  autoStartBreaks: boolean;
}

export interface AppStats {
  totalSessions: number;
  totalFocusTime: number; // in seconds
  lastSessionAt?: Date;
  updatedAt: Date;
}

export type TimerMode = 'focus' | 'shortBreak' | 'longBreak';
export type TimerStatus = 'idle' | 'running' | 'paused';

export interface TimerState {
  mode: TimerMode;
  status: TimerStatus;
  timeRemaining: number; // in seconds
  totalTime: number; // in seconds
  sessionsCompleted: number;
  currentGoal?: string;
  currentTags: string[];
}

// ========================================
// FILTER TYPES
// ========================================

export type TodoFilter = 'all' | 'active' | 'completed';

// ========================================
// DEFAULT VALUES
// ========================================

export const DEFAULT_TIMER_SETTINGS: TimerSettings = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  autoStartBreaks: true,
};

export const DEFAULT_TAGS: Tag[] = [
  { id: 'work', name: 'Work', color: '#FF6D1F' },
  { id: 'study', name: 'Study', color: '#00D4FF' },
  { id: 'personal', name: 'Personal', color: '#34D399' },
  { id: 'health', name: 'Health', color: '#F87171' },
  { id: 'creative', name: 'Creative', color: '#A78BFA' },
];
