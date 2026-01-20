// ========================================
// Leaderboard Component - Location-based rankings
// ========================================

import { useState, useEffect, useCallback } from 'react';
import { Trophy, MapPin, Users, Navigation } from 'lucide-react';
import { type LeaderboardEntry } from '../../types';
import { getNearbyLeaderboard } from '../../services/xpService';
import { useApp } from '../../contexts/AppContext';
import RankIcon from './RankIcon';
import './Leaderboard.css';

type LocationState = 'prompt' | 'loading' | 'granted' | 'denied';

export default function Leaderboard() {
    const { state, updateUserProfile } = useApp();
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [locationState, setLocationState] = useState<LocationState>('prompt');
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

    // Request location permission
    const requestLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setLocationState('denied');
            return;
        }

        setLocationState('loading');

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const location = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };
                setUserLocation(location);
                setLocationState('granted');

                // Save location to user profile
                if (state.user) {
                    await updateUserProfile({ location, isPublic: true });
                }
            },
            (error) => {
                console.error('Geolocation error:', error);
                setLocationState('denied');
            },
            { enableHighAccuracy: false, timeout: 10000 }
        );
    }, [state.user, updateUserProfile]);

    // Check if user already has location stored
    useEffect(() => {
        if (state.user?.location && typeof state.user.location !== 'string') {
            setUserLocation(state.user.location);
            setLocationState('granted');
        }
    }, [state.user?.location]);

    // Load leaderboard when location is available
    useEffect(() => {
        if (!userLocation || locationState !== 'granted') return;

        const loadLeaderboard = async () => {
            setIsLoading(true);
            try {
                const data = await getNearbyLeaderboard(userLocation.lat, userLocation.lng, 10);
                setEntries(data);
            } catch (error) {
                console.error('Failed to load leaderboard:', error);
            }
            setIsLoading(false);
        };

        loadLeaderboard();
    }, [userLocation, locationState]);

    const userRank = entries.findIndex(e => e.userId === state.user?.id);

    // Prompt for location
    if (locationState === 'prompt') {
        return (
            <div className="leaderboard">
                <div className="leaderboard-header">
                    <h3 className="leaderboard-title">
                        <Trophy size={18} />
                        Leaderboard
                    </h3>
                </div>
                <div className="location-prompt">
                    <div className="location-icon">
                        <Navigation size={32} />
                    </div>
                    <h4>See who's nearby</h4>
                    <p>Allow location access to see users within 50 miles grinding alongside you.</p>
                    <button className="location-btn" onClick={requestLocation}>
                        <MapPin size={16} />
                        Enable Location
                    </button>
                </div>
            </div>
        );
    }

    // Loading location
    if (locationState === 'loading') {
        return (
            <div className="leaderboard">
                <div className="leaderboard-header">
                    <h3 className="leaderboard-title">
                        <Trophy size={18} />
                        Leaderboard
                    </h3>
                </div>
                <div className="leaderboard-loading">
                    <div className="loading-spinner" />
                    <p>Getting your location...</p>
                </div>
            </div>
        );
    }

    // Location denied
    if (locationState === 'denied') {
        return (
            <div className="leaderboard">
                <div className="leaderboard-header">
                    <h3 className="leaderboard-title">
                        <Trophy size={18} />
                        Leaderboard
                    </h3>
                </div>
                <div className="location-prompt">
                    <div className="location-icon denied">
                        <MapPin size={32} />
                    </div>
                    <h4>Location Required</h4>
                    <p>Enable location in your browser settings to see the nearby leaderboard.</p>
                    <button className="location-btn" onClick={requestLocation}>
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="leaderboard">
            <div className="leaderboard-header">
                <h3 className="leaderboard-title">
                    <Trophy size={18} />
                    Nearby (50 mi)
                </h3>
                <span className="location-badge">
                    <MapPin size={12} />
                    Location active
                </span>
            </div>

            {isLoading ? (
                <div className="leaderboard-loading">
                    <div className="loading-spinner" />
                </div>
            ) : entries.length === 0 ? (
                <div className="leaderboard-empty">
                    <Users size={32} />
                    <p>No users nearby</p>
                    <span>Be the first in your area!</span>
                </div>
            ) : (
                <div className="leaderboard-list">
                    {entries.map((entry, index) => {
                        const isCurrentUser = entry.userId === state.user?.id;
                        const position = index + 1;

                        return (
                            <div
                                key={entry.userId}
                                className={`leaderboard-entry ${isCurrentUser ? 'current-user' : ''}`}
                            >
                                <div className="entry-position">
                                    <span className={`position-badge position-${position}`}>
                                        {position}
                                    </span>
                                </div>
                                <div className="entry-avatar">
                                    {entry.avatar ? (
                                        <img src={entry.avatar} alt="" />
                                    ) : (
                                        <div className="avatar-placeholder">
                                            {entry.displayName.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className="entry-info">
                                    <span className="entry-name">
                                        {entry.displayName}
                                        {isCurrentUser && <span className="you-badge">You</span>}
                                    </span>
                                    {entry.distance !== undefined && (
                                        <span className="entry-distance">{entry.distance} mi away</span>
                                    )}
                                </div>
                                <div className="entry-stats">
                                    <div className="entry-rank-icon">
                                        <RankIcon rank={entry.rank} size={16} />
                                    </div>
                                    <span className="entry-xp">{formatXP(entry.totalXp)} XP</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Current User Position (if not in top 10) */}
            {state.user && userRank === -1 && entries.length > 0 && (
                <div className="your-position">
                    <span>You're not in the top 10 nearby</span>
                </div>
            )}
        </div>
    );
}

function formatXP(xp: number): string {
    if (xp >= 10000) return `${(xp / 1000).toFixed(1)}K`;
    if (xp >= 1000) return `${(xp / 1000).toFixed(1)}K`;
    return xp.toString();
}
