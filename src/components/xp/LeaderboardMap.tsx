// ========================================
// Leaderboard Map - World map with user pins
// ========================================

import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { divIcon } from 'leaflet';
import { Trophy, MapPin, Users, Navigation, ChevronLeft, ChevronRight } from 'lucide-react';
import { RANK_INFO, type LeaderboardEntry } from '../../types';
import { getNearbyLeaderboard } from '../../services/xpService';
import { getRankSvg } from '../../utils/rankSvg';
import { useApp } from '../../contexts/AppContext';
import RankIcon from './RankIcon';
import 'leaflet/dist/leaflet.css';
import './LeaderboardMap.css';

type LocationState = 'prompt' | 'loading' | 'granted' | 'denied';

// Custom marker icon based on rank
function createRankMarker(rank: string, isCurrentUser: boolean = false) {
    const rankInfo = RANK_INFO[rank as keyof typeof RANK_INFO] || RANK_INFO.novice;
    const svgIcon = getRankSvg(rankInfo.icon, rankInfo.color, 18);

    return divIcon({
        className: 'custom-marker',
        html: `<div class="marker-pin ${isCurrentUser ? 'current-user' : ''}" style="border-color: ${rankInfo.color}80">
            <div class="marker-icon-container" style="background: ${rankInfo.color}15; color: ${rankInfo.color}">
                ${svgIcon}
            </div>
            ${isCurrentUser ? '<div class="marker-pulse"></div>' : ''}
        </div>`,
        iconSize: [42, 42],
        iconAnchor: [21, 42],
        popupAnchor: [0, -42],
    });
}

// Component to recenter map
function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
    const map = useMap();
    useEffect(() => {
        // Only recenter if the distance is significant (e.g., > 100 meters)
        // This prevents the map from "jumping" on initial load or minor re-renders
        const currentCenter = map.getCenter();
        const distance = currentCenter.distanceTo([lat, lng]);

        if (distance > 100) {
            map.setView([lat, lng], 10, { animate: true });
        }
    }, [lat, lng, map]);
    return null;
}

export default function LeaderboardMap() {
    const { state, updateUserProfile } = useApp();
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [locationState, setLocationState] = useState<LocationState>('prompt');
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
    const [selectedUser, setSelectedUser] = useState<string | null>(null);

    // Update sidebar state on resize using matchMedia for robust breakpoint detection
    useEffect(() => {
        const mql = window.matchMedia('(max-width: 768px)');

        const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
            if (e.matches) {
                // Is Mobile: Hide sidebar to show map
                setSidebarOpen(false);
            } else {
                // Is Desktop: Show sidebar
                setSidebarOpen(true);
            }
        };

        // Initial check
        handleChange(mql);

        mql.addEventListener('change', handleChange);
        return () => mql.removeEventListener('change', handleChange);
    }, []);

    const [theme, setTheme] = useState<'dark' | 'light'>(() => {
        return (document.documentElement.getAttribute('data-theme') as 'light' | 'dark') || 'dark';
    });

    // Listen for theme changes
    useEffect(() => {
        const observer = new MutationObserver(() => {
            const currentTheme = document.documentElement.getAttribute('data-theme') as 'light' | 'dark';
            setTheme(currentTheme || 'dark');
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => observer.disconnect();
    }, []);

    // Map tile URL based on theme
    const tileUrl = theme === 'light'
        ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

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

    // Check if user already has location
    useEffect(() => {
        if (state.user?.location && typeof state.user.location === 'object') {
            setUserLocation(state.user.location);
            setLocationState('granted');
        }
    }, [state.user?.location]);

    // Load nearby users
    useEffect(() => {
        if (!userLocation || locationState !== 'granted') return;

        const loadLeaderboard = async () => {
            setIsLoading(true);
            try {
                const data = await getNearbyLeaderboard(userLocation.lat, userLocation.lng, 50);
                setEntries(data);
            } catch (error) {
                console.error('Failed to load leaderboard:', error);
            }
            setIsLoading(false);
        };

        loadLeaderboard();
    }, [userLocation, locationState]);

    // Location prompt screen
    if (locationState === 'prompt' || locationState === 'loading' || locationState === 'denied') {
        return (
            <div className="leaderboard-map-container">
                <div className="map-placeholder">
                    <div className="location-prompt-large">
                        <div className={`location-icon-large ${locationState === 'denied' ? 'denied' : ''}`}>
                            {locationState === 'loading' ? (
                                <div className="loading-spinner large" />
                            ) : (
                                <Navigation size={48} />
                            )}
                        </div>
                        <h2>{locationState === 'denied' ? 'Location Required' : 'Find nearby grinders'}</h2>
                        <p>
                            {locationState === 'loading'
                                ? 'Getting your location...'
                                : locationState === 'denied'
                                    ? 'Enable location in your browser settings to see the map.'
                                    : 'Allow location access to see users within 50 miles on the map.'}
                        </p>
                        {locationState !== 'loading' && (
                            <button className="location-btn-large" onClick={requestLocation}>
                                <MapPin size={18} />
                                {locationState === 'denied' ? 'Try Again' : 'Enable Location'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="leaderboard-map-container">
            {/* Map */}
            <div className="map-wrapper">
                <MapContainer
                    center={[userLocation!.lat, userLocation!.lng]}
                    zoom={10}
                    className="leaderboard-map"
                    zoomControl={false}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                        url={tileUrl}
                    />
                    <RecenterMap lat={userLocation!.lat} lng={userLocation!.lng} />

                    {/* Current user marker - always show */}
                    {state.user && (
                        <Marker
                            position={[userLocation!.lat, userLocation!.lng]}
                            icon={createRankMarker(state.user.xp?.rank || 'novice', true)}
                            zIndexOffset={1000}
                        >
                            <Popup>
                                <div className="marker-popup">
                                    <div className="popup-avatar">
                                        {state.user.avatar ? (
                                            <img src={state.user.avatar} alt="" />
                                        ) : (
                                            <span>{state.user.name.charAt(0)}</span>
                                        )}
                                    </div>
                                    <div className="popup-info">
                                        <span className="popup-name">
                                            {state.user.name}
                                            <span className="you-tag">You</span>
                                        </span>
                                        <div className="popup-xp">
                                            <RankIcon rank={state.user.xp?.rank || 'novice'} size={12} />
                                            <span className="xp-amount">{formatXP(state.user.xp?.totalXp || 0)} XP</span>
                                        </div>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    )}

                    {/* Other user markers */}
                    {entries
                        .filter(entry => entry.userId !== state.user?.id)
                        .map((entry) => {
                            const position: [number, number] = entry.location
                                ? [entry.location.lat, entry.location.lng]
                                : [userLocation!.lat, userLocation!.lng]; // Fallback

                            return (
                                <Marker
                                    key={entry.userId}
                                    position={position}
                                    icon={createRankMarker(entry.rank, false)}
                                    eventHandlers={{
                                        click: () => setSelectedUser(entry.userId),
                                    }}
                                >
                                    <Popup>
                                        <div className="marker-popup">
                                            <div className="popup-avatar">
                                                {entry.avatar ? (
                                                    <img src={entry.avatar} alt="" />
                                                ) : (
                                                    <span>{entry.displayName.charAt(0)}</span>
                                                )}
                                            </div>
                                            <div className="popup-info">
                                                <span className="popup-name">{entry.displayName}</span>
                                                <div className="popup-xp">
                                                    <RankIcon rank={entry.rank} size={12} />
                                                    <span className="xp-amount">{formatXP(entry.totalXp)} XP</span>
                                                </div>
                                            </div>
                                        </div>
                                    </Popup>
                                </Marker>
                            );
                        })}
                </MapContainer>
            </div>

            {/* Sidebar toggle - Moved out of map-wrapper to avoid scaling issues */}
            <button
                className={`sidebar-toggle ${sidebarOpen ? 'sidebar-open' : ''}`}
                onClick={() => setSidebarOpen(!sidebarOpen)}
            >
                {sidebarOpen ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>

            {/* Leaderboard Sidebar */}
            <aside className={`map-sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <h3>
                        <Trophy size={18} />
                        Nearby (50 mi)
                    </h3>
                    <span className="user-count">{entries.length} users</span>
                </div>

                {isLoading ? (
                    <div className="sidebar-loading">
                        <div className="loading-spinner" />
                    </div>
                ) : entries.length === 0 ? (
                    <div className="sidebar-empty">
                        <Users size={24} />
                        <p>No users nearby</p>
                    </div>
                ) : (
                    <div className="sidebar-list">
                        {entries.map((entry, index) => {
                            const isCurrentUser = entry.userId === state.user?.id;
                            const isSelected = entry.userId === selectedUser;

                            return (
                                <div
                                    key={entry.userId}
                                    className={`sidebar-entry ${isCurrentUser ? 'current-user' : ''} ${isSelected ? 'selected' : ''}`}
                                    onClick={() => setSelectedUser(entry.userId)}
                                >
                                    <span className="entry-rank-num">#{index + 1}</span>
                                    <div className="entry-avatar-small">
                                        {entry.avatar ? (
                                            <img src={entry.avatar} alt="" />
                                        ) : (
                                            <span>{entry.displayName.charAt(0)}</span>
                                        )}
                                    </div>
                                    <div className="entry-details">
                                        <span className="entry-name-small">
                                            {entry.displayName}
                                            {isCurrentUser && <span className="you-badge-small">You</span>}
                                        </span>
                                        {entry.distance !== undefined && (
                                            <span className="entry-dist">{entry.distance} mi</span>
                                        )}
                                    </div>
                                    <div className="entry-stats-small">
                                        <RankIcon rank={entry.rank} size={14} />
                                        <span className="entry-xp-small">{formatXP(entry.totalXp)}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </aside>
        </div>
    );
}

function formatXP(xp: number): string {
    if (xp >= 10000) return `${(xp / 1000).toFixed(1)}K`;
    if (xp >= 1000) return `${(xp / 1000).toFixed(1)}K`;
    return xp.toString();
}
