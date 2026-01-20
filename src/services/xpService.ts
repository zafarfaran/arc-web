// ========================================
// XP Service - Gamification Logic
// ========================================

import { doc, setDoc, arrayUnion, collection, query, where, orderBy, limit, getDocs, increment, getDoc, addDoc, startAfter } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Rank, XPSource, XPEvent, UserXP, LeaderboardEntry } from '../types';
import { RANK_THRESHOLDS, DEFAULT_USER_XP } from '../types';
import { generateId } from '../utils/helpers';
import { decryptLocation } from '../utils/securityUtils';

// Calculate rank based on total XP
export function calculateRank(totalXp: number): Rank {
    if (totalXp >= RANK_THRESHOLDS.legend) return 'legend';
    if (totalXp >= RANK_THRESHOLDS.master) return 'master';
    if (totalXp >= RANK_THRESHOLDS.champion) return 'champion';
    if (totalXp >= RANK_THRESHOLDS.achiever) return 'achiever';
    if (totalXp >= RANK_THRESHOLDS.apprentice) return 'apprentice';
    return 'novice';
}

// Get XP needed for next rank
export function getXpToNextRank(currentXp: number): { nextRank: Rank | null; xpNeeded: number } {
    const ranks: Rank[] = ['novice', 'apprentice', 'achiever', 'champion', 'master', 'legend'];
    const currentRank = calculateRank(currentXp);
    const currentIndex = ranks.indexOf(currentRank);

    if (currentIndex >= ranks.length - 1) {
        return { nextRank: null, xpNeeded: 0 }; // Already at max rank
    }

    const nextRank = ranks[currentIndex + 1];
    const xpNeeded = RANK_THRESHOLDS[nextRank] - currentXp;

    return { nextRank, xpNeeded };
}

// Get progress percentage to next rank
export function getRankProgress(currentXp: number): number {
    const currentRank = calculateRank(currentXp);
    const ranks: Rank[] = ['novice', 'apprentice', 'achiever', 'champion', 'master', 'legend'];
    const currentIndex = ranks.indexOf(currentRank);

    if (currentIndex >= ranks.length - 1) return 100; // Max rank

    const currentThreshold = RANK_THRESHOLDS[currentRank];
    const nextThreshold = RANK_THRESHOLDS[ranks[currentIndex + 1]];
    const xpInCurrentTier = currentXp - currentThreshold;
    const tierRange = nextThreshold - currentThreshold;

    return Math.round((xpInCurrentTier / tierRange) * 100);
}

// Award XP to a user
export async function awardXP(
    userId: string,
    amount: number,
    source: XPSource,
    description: string,
    currentXp: UserXP = DEFAULT_USER_XP
): Promise<UserXP> {
    // Prevent total XP from going below 0
    const adjustedAmount = amount < 0 ? Math.max(amount, -currentXp.totalXp) : amount;
    const newTotalXp = currentXp.totalXp + adjustedAmount;
    const newRank = calculateRank(newTotalXp);

    const xpEvent: XPEvent = {
        id: generateId(),
        amount: adjustedAmount, // Log the actual adjusted amount
        source,
        description,
        timestamp: new Date(),
    };

    const updatedXp: UserXP = {
        totalXp: newTotalXp,
        rank: newRank,
        xpHistory: [...currentXp.xpHistory.slice(-49), xpEvent], // Keep last 50 events
        lastDailyBonus: source === 'daily' ? new Date() : currentXp.lastDailyBonus,
    };

    // Update Firestore - use setDoc with merge to create doc if it doesn't exist
    try {
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
            // Document exists, update with increment
            await setDoc(userRef, {
                xp: {
                    totalXp: increment(adjustedAmount),
                    rank: newRank,
                    xpHistory: arrayUnion(xpEvent),
                    ...(source === 'daily' && { lastDailyBonus: new Date() }),
                },
            }, { merge: true });
        } else {
            // Document doesn't exist, create with initial values
            await setDoc(userRef, {
                xp: {
                    totalXp: newTotalXp,
                    rank: newRank,
                    xpHistory: [xpEvent],
                    ...(source === 'daily' && { lastDailyBonus: new Date() }),
                },
            }, { merge: true });
        }

        // 2. Write to scalable subcollection for full history
        const historyRef = collection(db, 'users', userId, 'xpEvents');
        await addDoc(historyRef, xpEvent);
    } catch (error) {
        console.error('Failed to update XP in Firestore:', error);
    }

    return updatedXp;
}

// Check if user is eligible for daily bonus
export function canClaimDailyBonus(lastDailyBonus?: Date): boolean {
    if (!lastDailyBonus) return true;

    const now = new Date();
    const lastBonus = new Date(lastDailyBonus);

    // Check if it's a new day (reset at midnight)
    return (
        now.getDate() !== lastBonus.getDate() ||
        now.getMonth() !== lastBonus.getMonth() ||
        now.getFullYear() !== lastBonus.getFullYear()
    );
}

// Fetch paginated XP history from subcollection
export async function fetchXPHistory(
    userId: string,
    pageSize: number = 10,
    lastDoc: any = null,
    startDate?: Date,
    endDate?: Date
): Promise<{ events: XPEvent[]; lastVisible: any }> {
    try {
        const historyRef = collection(db, 'users', userId, 'xpEvents');

        let q = query(
            historyRef,
            orderBy('timestamp', 'desc'),
            limit(pageSize)
        );

        if (startDate) {
            q = query(q, where('timestamp', '>=', startDate));
        }

        if (endDate) {
            q = query(q, where('timestamp', '<=', endDate));
        }

        if (lastDoc) {
            q = query(q, startAfter(lastDoc));
        }

        const snapshot = await getDocs(q);
        const events: XPEvent[] = [];

        snapshot.forEach((doc) => {
            const data = doc.data();
            events.push({
                id: data.id,
                amount: data.amount,
                source: data.source,
                description: data.description,
                timestamp: data.timestamp.toDate(), // Convert Firestore Timestamp to Date
            } as XPEvent);
        });

        return {
            events,
            lastVisible: snapshot.docs[snapshot.docs.length - 1] || null
        };
    } catch (error) {
        console.error('Failed to fetch XP history:', error);
        return { events: [], lastVisible: null };
    }
}

// Get leaderboard for nearby users within a radius
const NEARBY_RADIUS_MILES = 50;

// Calculate distance between two coordinates in miles (Haversine formula)
export function calculateDistance(
    lat1: number, lng1: number,
    lat2: number, lng2: number
): number {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Get nearby leaderboard (users within 50-mile radius)
export async function getNearbyLeaderboard(
    userLat: number,
    userLng: number,
    maxResults: number = 10
): Promise<LeaderboardEntry[]> {
    try {
        const usersRef = collection(db, 'users');
        // Fetch all public users (Firestore doesn't support geo queries natively)
        const q = query(
            usersRef,
            where('isPublic', '==', true),
            orderBy('xp.totalXp', 'desc'),
            limit(100) // Fetch more to filter by distance
        );

        const snapshot = await getDocs(q);
        const entries: LeaderboardEntry[] = [];

        snapshot.forEach((doc) => {
            const data = doc.data();
            let location = data.location;

            // Decrypt location if it's stored as an encrypted string
            if (typeof location === 'string') {
                location = decryptLocation(location);
            }

            // Skip users without valid location
            if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
                return;
            }

            // Calculate distance
            const distance = calculateDistance(userLat, userLng, location.lat, location.lng);

            // Only include users within 50 miles
            if (distance <= NEARBY_RADIUS_MILES) {
                entries.push({
                    userId: doc.id,
                    displayName: data.name || 'Anonymous',
                    avatar: data.avatar,
                    rank: data.xp?.rank || 'novice',
                    totalXp: data.xp?.totalXp || 0,
                    distance: Math.round(distance),
                    location: location,
                });
            }
        });

        // Sort by XP (already sorted but re-sort after filtering) and limit
        return entries
            .sort((a, b) => b.totalXp - a.totalXp)
            .slice(0, maxResults);
    } catch (error) {
        console.error('Failed to fetch nearby leaderboard:', error);
        return [];
    }
}

// Get global leaderboard (all users regardless of location)
export async function getGlobalLeaderboard(maxResults: number = 10): Promise<LeaderboardEntry[]> {
    try {
        const usersRef = collection(db, 'users');
        const q = query(
            usersRef,
            where('isPublic', '==', true),
            orderBy('xp.totalXp', 'desc'),
            limit(maxResults)
        );

        const snapshot = await getDocs(q);
        const entries: LeaderboardEntry[] = [];

        snapshot.forEach((doc) => {
            const data = doc.data();
            entries.push({
                userId: doc.id,
                displayName: data.name || 'Anonymous',
                avatar: data.avatar,
                rank: data.xp?.rank || 'novice',
                totalXp: data.xp?.totalXp || 0,
            });
        });

        return entries;
    } catch (error) {
        console.error('Failed to fetch global leaderboard:', error);
        return [];
    }
}

