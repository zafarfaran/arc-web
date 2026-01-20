// ========================================
// Seed Script - Generate Dummy Users for Testing
// Run with: npx tsx scripts/seedDummyUsers.ts
// ========================================

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, collection, Timestamp } from 'firebase/firestore';
import { addLocationJitter, encryptLocation } from '../src/utils/securityUtils';

// Firebase config - copy from your .env or firebase.ts
const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ========================================
// LOCATION PRIVACY HELPERS
// ========================================

// Obfuscate location using jitter and encryption
function obfuscateLocation(lat: number, lng: number): string {
    const jittered = addLocationJitter(lat, lng);
    return encryptLocation(jittered);
}

// ========================================
// DUMMY DATA GENERATORS
// ========================================

const FIRST_NAMES = ['Alex', 'Jordan', 'Taylor', 'Casey', 'Morgan', 'Riley', 'Quinn', 'Avery', 'Jamie', 'Skyler', 'Drew', 'Sage', 'Blake', 'Cameron', 'Dakota'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];

const HABIT_NAMES = [
    'Morning meditation', 'Exercise', 'Read 30 mins', 'Drink 8 glasses water',
    'No social media before noon', 'Journal', 'Cold shower', 'Walk 10k steps',
    'Practice language', 'Learn something new', 'Gratitude practice', 'Stretch',
];

const TODO_TEMPLATES = [
    'Review project docs', 'Send weekly update', 'Call client', 'Update portfolio',
    'Prepare presentation', 'Research competitors', 'Fix bug #123', 'Write tests',
    'Review PR', 'Update documentation', 'Team standup notes', 'Plan sprint',
];

const GOAL_TEMPLATES = [
    { name: 'Read 24 books this year', targetValue: 24, startingValue: 0, targetDirection: 'increase', unit: 'books' },
    { name: 'Run 500 miles', targetValue: 500, startingValue: 0, targetDirection: 'increase', unit: 'miles' },
    { name: 'Save $10,000', targetValue: 10000, startingValue: 0, targetDirection: 'increase', unit: 'dollars' },
    { name: 'Lose 10kg', targetValue: 80, startingValue: 90, targetDirection: 'decrease', unit: 'kg' },
    { name: 'Reduce body fat by 5%', targetValue: 15, startingValue: 20, targetDirection: 'decrease', unit: '%' },
    { name: 'Learn Spanish', targetValue: 365, startingValue: 0, targetDirection: 'increase', unit: 'days' },
];

const RANKS = ['novice', 'apprentice', 'achiever', 'champion', 'master', 'legend'] as const;
const RANK_THRESHOLDS = { novice: 0, apprentice: 500, achiever: 2000, champion: 5000, master: 15000, legend: 50000 };

function calculateRank(xp: number): typeof RANKS[number] {
    if (xp >= RANK_THRESHOLDS.legend) return 'legend';
    if (xp >= RANK_THRESHOLDS.master) return 'master';
    if (xp >= RANK_THRESHOLDS.champion) return 'champion';
    if (xp >= RANK_THRESHOLDS.achiever) return 'achiever';
    if (xp >= RANK_THRESHOLDS.apprentice) return 'apprentice';
    return 'novice';
}

function generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function randomDate(daysAgo: number): Date {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
    return date;
}

function randomPick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

// ========================================
// USER DATA GENERATORS
// ========================================

interface DummyUser {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    isPro: boolean;
    isPublic: boolean;
    location?: string;
    xp: {
        totalXp: number;
        rank: string;
        xpHistory: Array<{
            id: string;
            amount: number;
            source: string;
            description: string;
            timestamp: Date;
        }>;
    };
    todos: Array<any>;
    habits: Array<any>;
    goals: Array<any>;
    sessions: Array<any>;
}

function generateDummyUser(baseLocation: { lat: number; lng: number }, index: number): DummyUser {
    const firstName = randomPick(FIRST_NAMES);
    const lastName = randomPick(LAST_NAMES);
    const name = `${firstName} ${lastName}`;
    const id = `dummy_user_${index}_${generateId()}`;

    // Generate XP (varied distribution)
    const xpDistributions = [
        () => Math.floor(Math.random() * 500), // Novice
        () => 500 + Math.floor(Math.random() * 1500), // Apprentice
        () => 2000 + Math.floor(Math.random() * 3000), // Achiever
        () => 5000 + Math.floor(Math.random() * 10000), // Champion
        () => 15000 + Math.floor(Math.random() * 35000), // Master
        () => 50000 + Math.floor(Math.random() * 20000), // Legend (rare)
    ];

    // Weighted distribution - more lower ranks
    const weights = [30, 25, 20, 15, 8, 2];
    let roll = Math.random() * 100;
    let distIndex = 0;
    for (let i = 0; i < weights.length; i++) {
        roll -= weights[i];
        if (roll <= 0) {
            distIndex = i;
            break;
        }
    }

    const totalXp = xpDistributions[distIndex]();
    const rank = calculateRank(totalXp);

    // Generate XP history
    const xpHistory = [];
    let remainingXp = totalXp;
    const sources = ['todo', 'habit', 'goal', 'milestone', 'session'];
    while (remainingXp > 0 && xpHistory.length < 50) {
        const amount = Math.min(remainingXp, Math.floor(Math.random() * 50) + 10);
        xpHistory.push({
            id: generateId(),
            amount,
            source: randomPick(sources),
            description: `Earned ${amount} XP`,
            timestamp: randomDate(30),
        });
        remainingXp -= amount;
    }

    // Generate location with offset from base (within ~30 miles)
    const locationOffset = {
        lat: (Math.random() - 0.5) * 0.8, // ~30 miles
        lng: (Math.random() - 0.5) * 0.8,
    };
    const rawLocation = {
        lat: baseLocation.lat + locationOffset.lat,
        lng: baseLocation.lng + locationOffset.lng,
    };

    // Generate todos
    const todos = [];
    const todoCount = Math.floor(Math.random() * 8) + 3;
    for (let i = 0; i < todoCount; i++) {
        todos.push({
            id: generateId(),
            text: randomPick(TODO_TEMPLATES),
            completed: Math.random() > 0.4,
            createdAt: randomDate(14),
            priority: randomPick(['high', 'medium', 'low']),
            tags: [],
        });
    }

    // Generate habits
    const habits = [];
    const habitCount = Math.floor(Math.random() * 4) + 2;
    const usedHabits = new Set<string>();
    for (let i = 0; i < habitCount; i++) {
        let habitName = randomPick(HABIT_NAMES);
        while (usedHabits.has(habitName)) {
            habitName = randomPick(HABIT_NAMES);
        }
        usedHabits.add(habitName);

        // Generate completion history
        const completedDates: string[] = [];
        for (let d = 0; d < 30; d++) {
            if (Math.random() > 0.3) { // 70% completion rate
                const date = new Date();
                date.setDate(date.getDate() - d);
                completedDates.push(date.toISOString().split('T')[0]);
            }
        }

        habits.push({
            id: generateId(),
            name: habitName,
            frequency: 'daily',
            color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`,
            completedDates,
            createdAt: randomDate(60),
        });
    }

    // Generate goals
    const goals = [];
    const goalCount = Math.floor(Math.random() * 3) + 1;
    const usedGoals = new Set<string>();
    for (let i = 0; i < goalCount; i++) {
        let goalTemplate = randomPick(GOAL_TEMPLATES);
        while (usedGoals.has(goalTemplate.name)) {
            goalTemplate = randomPick(GOAL_TEMPLATES);
        }
        usedGoals.add(goalTemplate.name);

        const isDecreasing = goalTemplate.targetDirection === 'decrease';
        const range = isDecreasing
            ? goalTemplate.startingValue - goalTemplate.targetValue
            : goalTemplate.targetValue - goalTemplate.startingValue;
        const progressDelta = Math.floor(Math.random() * range * 0.8);
        const currentValue = isDecreasing
            ? goalTemplate.startingValue - progressDelta
            : goalTemplate.startingValue + progressDelta;

        goals.push({
            id: generateId(),
            name: goalTemplate.name,
            goalType: 'trackable',
            startingValue: goalTemplate.startingValue,
            targetValue: goalTemplate.targetValue,
            currentValue: currentValue,
            targetDirection: goalTemplate.targetDirection as 'increase' | 'decrease',
            unit: goalTemplate.unit,
            category: randomPick(['fitness', 'personal', 'learning', 'financial']) as any,
            tags: [],
            icon: 'target',
            color: randomPick(['#F87171', '#34D399', '#60A5FA']),
            createdAt: randomDate(30),
            deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        });
    }

    // Generate focus sessions
    const sessions = [];
    const sessionCount = Math.floor(Math.random() * 20) + 5;
    for (let i = 0; i < sessionCount; i++) {
        const duration = randomPick([25, 25, 25, 50, 50, 75]) * 60 * 1000;
        sessions.push({
            id: generateId(),
            duration,
            completedAt: randomDate(30),
            type: 'focus',
        });
    }

    return {
        id,
        name,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
        isPro: Math.random() > 0.7,
        isPublic: true, // All dummy users are public for testing
        location: obfuscateLocation(rawLocation.lat, rawLocation.lng),
        xp: {
            totalXp,
            rank,
            xpHistory,
        },
        todos,
        habits,
        goals,
        sessions,
    };
}

// ========================================
// SEED FUNCTION
// ========================================

async function seedDummyUsers(count: number, baseLocation: { lat: number; lng: number }) {
    console.log(`\n🌱 Seeding ${count} dummy users...\n`);

    for (let i = 0; i < count; i++) {
        const user = generateDummyUser(baseLocation, i);

        try {
            // Save user document
            await setDoc(doc(db, 'users', user.id), {
                id: user.id,
                name: user.name,
                email: user.email,
                isPro: user.isPro,
                isPublic: user.isPublic,
                location: user.location,
                xp: {
                    totalXp: user.xp.totalXp,
                    rank: user.xp.rank,
                    xpHistory: user.xp.xpHistory.slice(-10), // Only last 10 for storage efficiency
                },
                createdAt: Timestamp.now(),
            });

            // Save todos
            for (const todo of user.todos) {
                await setDoc(doc(db, 'users', user.id, 'todos', todo.id), {
                    ...todo,
                    createdAt: Timestamp.fromDate(todo.createdAt),
                });
            }

            // Save habits
            for (const habit of user.habits) {
                await setDoc(doc(db, 'users', user.id, 'habits', habit.id), {
                    ...habit,
                    createdAt: Timestamp.fromDate(habit.createdAt),
                });
            }

            // Save goals
            for (const goal of user.goals) {
                await setDoc(doc(db, 'users', user.id, 'goals', goal.id), {
                    ...goal,
                    deadline: Timestamp.fromDate(goal.deadline),
                    createdAt: Timestamp.fromDate(goal.createdAt),
                });
            }

            console.log(`✅ Created: ${user.name} (${user.xp.rank}) - ${user.xp.totalXp} XP`);
        } catch (error) {
            console.error(`❌ Failed to create ${user.name}:`, error);
        }
    }

    console.log(`\n🎉 Done! Created ${count} dummy users.\n`);
}

// ========================================
// RUN
// ========================================

// Default location: Manchester, UK (from your screenshot)
// Change this to your preferred base location
const BASE_LOCATION = {
    lat: 53.4808,
    lng: -2.2426,
};

const USER_COUNT = 15; // Adjust as needed

seedDummyUsers(USER_COUNT, BASE_LOCATION)
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Seed failed:', error);
        process.exit(1);
    });
