// ========================================
// Seed Dummy Data - Browser utility for testing
// Import and call from browser console or component
// ========================================

import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { User, Rank } from '../types';
import { addLocationJitter, encryptLocation } from './securityUtils';

// ========================================
// LOCATION PRIVACY
// ========================================

// Obfuscate location - now uses 5KM jitter and encryption
export function obfuscateLocation(lat: number, lng: number): string {
    const jittered = addLocationJitter(lat, lng);
    return encryptLocation(jittered);
}

// ========================================
// DATA GENERATORS
// ========================================

const FIRST_NAMES = ['Alex', 'Jordan', 'Taylor', 'Casey', 'Morgan', 'Riley', 'Quinn', 'Avery', 'Jamie', 'Skyler', 'Drew', 'Sage', 'Blake', 'Cameron', 'Dakota', 'Reese', 'Finley', 'Hayden', 'Parker', 'Emerson'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Wilson', 'Anderson', 'Taylor', 'Thomas', 'Moore'];

const RANK_THRESHOLDS: Record<Rank, number> = {
    novice: 0,
    apprentice: 500,
    achiever: 2000,
    champion: 5000,
    master: 15000,
    legend: 50000,
};

function calculateRank(xp: number): Rank {
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

function randomPick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(daysAgo: number): Date {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
    return date;
}

// ========================================
// DUMMY USER GENERATOR
// ========================================

interface DummyUserData {
    user: Partial<User>;
    xpHistory: Array<{
        id: string;
        amount: number;
        source: string;
        description: string;
        timestamp: Date;
    }>;
}

function generateDummyUser(
    baseLocation: { lat: number; lng: number },
    index: number
): DummyUserData {
    const firstName = randomPick(FIRST_NAMES);
    const lastName = randomPick(LAST_NAMES);
    const name = `${firstName} ${lastName}`;
    const id = `dummy_${Date.now()}_${index}`;

    // XP distribution - more lower ranks
    const xpRanges = [
        { weight: 30, min: 50, max: 499 },      // Novice
        { weight: 25, min: 500, max: 1999 },    // Apprentice
        { weight: 20, min: 2000, max: 4999 },   // Achiever
        { weight: 15, min: 5000, max: 14999 },  // Champion
        { weight: 8, min: 15000, max: 49999 },  // Master
        { weight: 2, min: 50000, max: 70000 },  // Legend
    ];

    let roll = Math.random() * 100;
    let selectedRange = xpRanges[0];
    for (const range of xpRanges) {
        roll -= range.weight;
        if (roll <= 0) {
            selectedRange = range;
            break;
        }
    }

    const totalXp = Math.floor(Math.random() * (selectedRange.max - selectedRange.min)) + selectedRange.min;
    const rank = calculateRank(totalXp);

    // Generate XP history
    const xpHistory = [];
    const sources: Array<'todo' | 'habit' | 'goal' | 'milestone' | 'session'> = ['todo', 'habit', 'goal', 'milestone', 'session'];
    for (let i = 0; i < 10; i++) {
        xpHistory.push({
            id: generateId(),
            amount: Math.floor(Math.random() * 30) + 10,
            source: randomPick(sources),
            description: `Completed ${randomPick(['task', 'habit', 'goal', 'session'])}`,
            timestamp: randomDate(14),
        });
    }

    // Location with offset (within ~30 miles of base)
    const rawLocation = {
        lat: baseLocation.lat + (Math.random() - 0.5) * 0.8,
        lng: baseLocation.lng + (Math.random() - 0.5) * 0.8,
    };

    return {
        user: {
            id,
            name,
            email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@example.com`,
            isPro: Math.random() > 0.7,
            isPublic: true,
            location: obfuscateLocation(rawLocation.lat, rawLocation.lng),
            xp: {
                totalXp,
                rank,
                xpHistory: xpHistory.map(e => ({
                    ...e,
                    timestamp: e.timestamp,
                })),
            },
        },
        xpHistory,
    };
}

// ========================================
// SEED FUNCTION
// ========================================

export async function seedDummyUsers(
    count: number,
    baseLocation: { lat: number; lng: number },
    onProgress?: (current: number, total: number, name: string) => void
): Promise<string[]> {
    const createdIds: string[] = [];

    for (let i = 0; i < count; i++) {
        const { user } = generateDummyUser(baseLocation, i);

        try {
            await setDoc(doc(db, 'users', user.id!), {
                ...user,
                createdAt: Timestamp.now(),
                xp: {
                    ...user.xp,
                    xpHistory: user.xp?.xpHistory?.map(e => ({
                        ...e,
                        timestamp: Timestamp.fromDate(e.timestamp as Date),
                    })) || [],
                },
            });

            createdIds.push(user.id!);
            onProgress?.(i + 1, count, user.name!);
        } catch (error) {
            console.error(`Failed to create ${user.name}:`, error);
        }
    }

    return createdIds;
}

// ========================================
// CLEANUP FUNCTION
// ========================================

export async function cleanupDummyUsers(ids: string[]): Promise<void> {
    const { deleteDoc } = await import('firebase/firestore');

    for (const id of ids) {
        try {
            await deleteDoc(doc(db, 'users', id));
        } catch (error) {
            console.error(`Failed to delete ${id}:`, error);
        }
    }
}

// Quick test from console:
// import { seedDummyUsers } from './utils/seedData';
// seedDummyUsers(10, { lat: 53.48, lng: -2.24 }, (c, t, n) => console.log(`${c}/${t}: ${n}`));
