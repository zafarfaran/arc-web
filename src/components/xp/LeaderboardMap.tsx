// ========================================
// Leaderboard Map - Minimal Design
// ========================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { divIcon } from 'leaflet';
import { MapPin, Navigation, ChevronLeft, ChevronRight, Globe, Radar } from 'lucide-react';
import { RANK_INFO, type LeaderboardEntry } from '../../types';
import { getNearbyLeaderboard, fetchLeaderboard, getUserGlobalRank, type LeaderboardPeriod, type UserRankInfo } from '../../services/xpService';
import { useApp } from '../../contexts/AppContext';
import RankIcon from './RankIcon';
import 'leaflet/dist/leaflet.css';
import './LeaderboardMap.css';

type LocationState = 'prompt' | 'loading' | 'granted' | 'denied';

function createAvatarMarker(
    avatar: string | undefined,
    displayName: string,
    rank: string,
    isCurrentUser: boolean = false
) {
    const rankInfo = RANK_INFO[rank as keyof typeof RANK_INFO] || RANK_INFO.novice;
    const initial = displayName.charAt(0).toUpperCase();

    const avatarContent = avatar
        ? `<img src="${avatar}" alt="" class="marker-avatar-img" />`
        : `<span class="marker-avatar-initial">${initial}</span>`;

    return divIcon({
        className: 'custom-marker',
        html: `<div class="marker-pin ${isCurrentUser ? 'current-user' : ''}" style="border-color: ${rankInfo.color}">
            <div class="marker-avatar">
                ${avatarContent}
            </div>
            ${isCurrentUser ? '<div class="marker-pulse"></div>' : ''}
        </div>`,
        iconSize: [42, 42],
        iconAnchor: [21, 42],
        popupAnchor: [0, -42],
    });
}

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
    const map = useMap();
    const initialRender = useRef(true);

    useEffect(() => {
        const currentCenter = map.getCenter();
        const distance = currentCenter.distanceTo([lat, lng]);
        if (distance > 100) {
            // Don't animate on initial load, only on subsequent changes
            map.setView([lat, lng], 10, { animate: !initialRender.current });
        }
        initialRender.current = false;
    }, [lat, lng, map]);
    return null;
}

type ViewMode = 'global' | 'nearby';

const PERIOD_OPTIONS: { value: LeaderboardPeriod; label: string }[] = [
    { value: 'weekly', label: 'Week' },
    { value: 'monthly', label: 'Month' },
    { value: 'allTime', label: 'All' },
];

const ENTRIES_PER_PAGE = 20;

export default function LeaderboardMap() {
    const { state, updateUserProfile } = useApp();
    const [nearbyEntries, setNearbyEntries] = useState<LeaderboardEntry[]>([]);
    const [globalEntries, setGlobalEntries] = useState<LeaderboardEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingGlobal, setIsLoadingGlobal] = useState(true);
    const [locationState, setLocationState] = useState<LocationState>('prompt');
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
    const [selectedUser, setSelectedUser] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('global');
    const [hasMoreGlobal, setHasMoreGlobal] = useState(false);
    const [hasPrevGlobal, setHasPrevGlobal] = useState(false);
    const [period, setPeriod] = useState<LeaderboardPeriod>('allTime');
    const [userRank, setUserRank] = useState<UserRankInfo | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const listRef = useRef<HTMLDivElement>(null);
    const userEntryRef = useRef<HTMLDivElement>(null);
    const pageDocsRef = useRef<Map<number, any>>(new Map());

    const entries = viewMode === 'global' ? globalEntries : nearbyEntries;
    const topThree = currentPage === 1 ? entries.slice(0, 3) : [];
    const restOfList = currentPage === 1 ? entries.slice(3) : entries;

    // Check if user is visible
    const userInTopThree = topThree.findIndex(e => e.userId === state.user?.id) !== -1;
    const userInRestOfList = restOfList.findIndex(e => e.userId === state.user?.id) !== -1;
    const showUserCard = userRank && !userInTopThree && !userInRestOfList;

    useEffect(() => {
        const mql = window.matchMedia('(max-width: 768px)');
        const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
            setSidebarOpen(!e.matches);
        };
        handleChange(mql);
        mql.addEventListener('change', handleChange);
        return () => mql.removeEventListener('change', handleChange);
    }, []);

    const [theme, setTheme] = useState<'dark' | 'light'>(() => {
        return (document.documentElement.getAttribute('data-theme') as 'light' | 'dark') || 'dark';
    });

    useEffect(() => {
        const observer = new MutationObserver(() => {
            const currentTheme = document.documentElement.getAttribute('data-theme') as 'light' | 'dark';
            setTheme(currentTheme || 'dark');
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => observer.disconnect();
    }, []);

    const tileUrl = theme === 'light'
        ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

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
            () => setLocationState('denied'),
            { enableHighAccuracy: false, timeout: 10000 }
        );
    }, [state.user, updateUserProfile]);

    useEffect(() => {
        if (state.user?.location && typeof state.user.location === 'object') {
            setUserLocation(state.user.location);
            setLocationState('granted');
        }
    }, [state.user?.location]);

    // Load global leaderboard for a specific page
    const loadGlobalPage = useCallback(async (page: number, startDoc: any = null) => {
        setIsLoadingGlobal(true);
        setGlobalEntries([]);
        setSelectedUser(null);

        try {
            const result = await fetchLeaderboard(period, ENTRIES_PER_PAGE, startDoc);
            setGlobalEntries(result.entries);
            setHasMoreGlobal(result.hasMore);
            setHasPrevGlobal(page > 1);

            if (result.lastDoc) {
                pageDocsRef.current.set(page, result.lastDoc);
            }
        } catch (error) {
            console.error('Failed to load global leaderboard:', error);
        }
        setIsLoadingGlobal(false);
    }, [period]);

    // Initial load when period changes
    useEffect(() => {
        pageDocsRef.current.clear();
        setCurrentPage(1);
        loadGlobalPage(1, null);
    }, [period, loadGlobalPage]);

    useEffect(() => {
        if (!state.user?.id) return;
        const loadUserRank = async () => {
            try {
                const rank = await getUserGlobalRank(state.user!.id);
                setUserRank(rank);
            } catch (error) {
                console.error('Failed to load user rank:', error);
            }
        };
        loadUserRank();
    }, [state.user?.id]);

    useEffect(() => {
        if (!userLocation || locationState !== 'granted') return;
        const loadNearbyLeaderboard = async () => {
            setIsLoading(true);
            try {
                const data = await getNearbyLeaderboard(userLocation.lat, userLocation.lng, 50);
                setNearbyEntries(data);
            } catch (error) {
                console.error('Failed to load nearby leaderboard:', error);
            }
            setIsLoading(false);
        };
        loadNearbyLeaderboard();
    }, [userLocation, locationState]);

    // Page navigation handlers
    const handleNextPage = () => {
        if (!hasMoreGlobal || isLoadingGlobal) return;
        const nextPage = currentPage + 1;
        const lastDocForCurrentPage = pageDocsRef.current.get(currentPage);
        setCurrentPage(nextPage);
        loadGlobalPage(nextPage, lastDocForCurrentPage);
    };

    const handlePrevPage = () => {
        if (currentPage <= 1 || isLoadingGlobal) return;
        const prevPage = currentPage - 1;

        if (prevPage === 1) {
            setCurrentPage(1);
            loadGlobalPage(1, null);
        } else {
            const docForPrevPage = pageDocsRef.current.get(prevPage - 1);
            setCurrentPage(prevPage);
            loadGlobalPage(prevPage, docForPrevPage);
        }
    };

    // Calculate position for list entries
    const getPositionForIndex = (index: number) => {
        if (currentPage === 1) {
            return index + 4; // After podium
        }
        return (currentPage - 1) * ENTRIES_PER_PAGE + index + 1;
    };

    const scrollToUser = useCallback(() => {
        if (userEntryRef.current) {
            userEntryRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, []);

    const defaultCenter: [number, number] = [20, 0];
    const mapCenter: [number, number] = userLocation
        ? [userLocation.lat, userLocation.lng]
        : defaultCenter;
    const mapZoom = userLocation ? 10 : 3;

    return (
        <div className="leaderboard-map-container">
            {/* Map */}
            <div className="map-wrapper">
                <MapContainer
                    center={mapCenter}
                    zoom={mapZoom}
                    className="leaderboard-map"
                    zoomControl={false}
                    minZoom={3}
                    maxZoom={18}
                    maxBounds={[[-90, -180], [90, 180]]}
                    maxBoundsViscosity={1.0}
                    worldCopyJump={false}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                        url={tileUrl}
                        noWrap={true}
                    />
                    {userLocation && <RecenterMap lat={userLocation.lat} lng={userLocation.lng} />}

                    {state.user && userLocation && state.user.showLocationOnMap !== false && (
                        <Marker
                            position={[userLocation.lat, userLocation.lng]}
                            icon={createAvatarMarker(
                                state.user.avatar,
                                state.user.name,
                                state.user.xp?.rank || 'novice',
                                true
                            )}
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

                    {(viewMode === 'nearby' ? nearbyEntries : globalEntries)
                        .filter(entry => entry.userId !== state.user?.id && entry.location && entry.showLocationOnMap !== false)
                        .map((entry) => (
                            <Marker
                                key={entry.userId}
                                position={[entry.location!.lat, entry.location!.lng]}
                                icon={createAvatarMarker(
                                    entry.avatar,
                                    entry.displayName,
                                    entry.rank,
                                    false
                                )}
                                eventHandlers={{ click: () => setSelectedUser(entry.userId) }}
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
                        ))}
                </MapContainer>
            </div>

            {/* Sidebar toggle */}
            <button
                className={`sidebar-toggle ${sidebarOpen ? 'sidebar-open' : ''}`}
                onClick={() => setSidebarOpen(!sidebarOpen)}
            >
                {sidebarOpen ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>

            {/* Sidebar */}
            <aside className={`map-sidebar ${sidebarOpen ? 'open' : ''}`}>
                {/* Header */}
                <div className="sidebar-header">
                    <div className="view-toggle">
                        <button
                            className={`view-btn ${viewMode === 'global' ? 'active' : ''}`}
                            onClick={() => {
                                setViewMode('global');
                                setCurrentPage(1);
                                pageDocsRef.current.clear();
                                loadGlobalPage(1, null);
                            }}
                        >
                            <Globe size={14} />
                            Global
                        </button>
                        <button
                            className={`view-btn ${viewMode === 'nearby' ? 'active' : ''}`}
                            onClick={() => {
                                setViewMode('nearby');
                                setCurrentPage(1);
                                if (locationState === 'prompt') requestLocation();
                            }}
                        >
                            <Radar size={14} />
                            Nearby
                        </button>
                    </div>

                    {viewMode === 'global' && (
                        <div className="period-toggle">
                            {PERIOD_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    className={`period-btn ${period === opt.value ? 'active' : ''}`}
                                    onClick={() => setPeriod(opt.value)}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Location prompt for nearby */}
                {viewMode === 'nearby' && locationState !== 'granted' && (
                    <div className="sidebar-location-prompt">
                        <Navigation size={20} />
                        <p>
                            {locationState === 'loading'
                                ? 'Getting location...'
                                : 'Enable location to see nearby users'}
                        </p>
                        {locationState !== 'loading' && (
                            <button className="enable-location-btn" onClick={requestLocation}>
                                <MapPin size={14} />
                                Enable Location
                            </button>
                        )}
                    </div>
                )}

                {/* Loading/Empty */}
                {(viewMode === 'global' ? isLoadingGlobal : isLoading) && entries.length === 0 ? (
                    <div className="sidebar-loading">
                        <div className="loading-spinner" />
                    </div>
                ) : entries.length === 0 && (viewMode === 'nearby' ? locationState === 'granted' : true) ? (
                    <div className="sidebar-empty">
                        <span>{viewMode === 'global' ? 'No users yet' : 'No users nearby'}</span>
                    </div>
                ) : viewMode === 'nearby' && locationState !== 'granted' ? null : (
                    <div className="sidebar-content">
                        {/* Podium - Top 3 */}
                        {topThree.length >= 1 && (
                            <div className="podium">
                                {topThree[1] && (
                                    <PodiumItem
                                        entry={topThree[1]}
                                        position={2}
                                        isCurrentUser={topThree[1].userId === state.user?.id}
                                        onClick={() => setSelectedUser(topThree[1].userId)}
                                    />
                                )}
                                {topThree[0] && (
                                    <PodiumItem
                                        entry={topThree[0]}
                                        position={1}
                                        isCurrentUser={topThree[0].userId === state.user?.id}
                                        onClick={() => setSelectedUser(topThree[0].userId)}
                                    />
                                )}
                                {topThree[2] && (
                                    <PodiumItem
                                        entry={topThree[2]}
                                        position={3}
                                        isCurrentUser={topThree[2].userId === state.user?.id}
                                        onClick={() => setSelectedUser(topThree[2].userId)}
                                    />
                                )}
                            </div>
                        )}

                        {/* Your Position Card */}
                        {showUserCard && (
                            <div className="your-position-card">
                                <span className="your-position-label">Your Position</span>
                                <div className="your-position-content">
                                    <div className="your-position-left">
                                        <span className="your-position-rank">#{userRank.rank.toLocaleString()}</span>
                                        <div className="your-position-avatar">
                                            {state.user?.avatar ? (
                                                <img src={state.user.avatar} alt="" />
                                            ) : (
                                                <span>{state.user?.name?.charAt(0) || '?'}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="your-position-right">
                                        <RankIcon rank={state.user?.xp?.rank || 'novice'} size={14} />
                                        <span className="your-position-xp">{formatXP(userRank.totalXp)}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Rest of the list */}
                        {restOfList.length > 0 && (
                            <div className="sidebar-list" ref={listRef}>
                                {restOfList.map((entry, index) => {
                                    const isCurrentUser = entry.userId === state.user?.id;
                                    const isSelected = entry.userId === selectedUser;
                                    const rank = getPositionForIndex(index);

                                    return (
                                        <div
                                            key={entry.userId}
                                            ref={isCurrentUser ? userEntryRef : undefined}
                                            className={`sidebar-entry ${isCurrentUser ? 'current-user' : ''} ${isSelected ? 'selected' : ''}`}
                                            onClick={() => setSelectedUser(entry.userId)}
                                        >
                                            <span className="entry-rank">{rank}</span>
                                            <div className="entry-avatar">
                                                {entry.avatar ? (
                                                    <img src={entry.avatar} alt="" />
                                                ) : (
                                                    <span>{entry.displayName.charAt(0)}</span>
                                                )}
                                            </div>
                                            <div className="entry-details">
                                                <span className="entry-name">
                                                    {entry.displayName}
                                                    {isCurrentUser && <span className="you-tag">You</span>}
                                                </span>
                                                {entry.distance !== undefined && (
                                                    <span className="entry-dist">{entry.distance} mi</span>
                                                )}
                                            </div>
                                            <div className="entry-stats">
                                                <RankIcon rank={entry.rank} size={14} />
                                                <span className="entry-xp">{formatXP(entry.totalXp)}</span>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Pagination Controls */}
                                {viewMode === 'global' && (hasPrevGlobal || hasMoreGlobal) && (
                                    <div className="sidebar-pagination">
                                        <button
                                            className="pagination-btn"
                                            onClick={handlePrevPage}
                                            disabled={!hasPrevGlobal || isLoadingGlobal}
                                        >
                                            <ChevronLeft size={14} />
                                        </button>
                                        <span className="pagination-page">Page {currentPage}</span>
                                        <button
                                            className="pagination-btn"
                                            onClick={handleNextPage}
                                            disabled={!hasMoreGlobal || isLoadingGlobal}
                                        >
                                            <ChevronRight size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </aside>
        </div>
    );
}

// Minimal Podium Item
function PodiumItem({
    entry,
    position,
    isCurrentUser,
    onClick
}: {
    entry: LeaderboardEntry;
    position: 1 | 2 | 3;
    isCurrentUser: boolean;
    onClick: () => void;
}) {
    return (
        <div
            className={`podium-item position-${position} ${isCurrentUser ? 'current-user' : ''}`}
            onClick={onClick}
        >
            <div className="podium-rank">{position}</div>
            <div className="podium-avatar">
                {entry.avatar ? (
                    <img src={entry.avatar} alt="" />
                ) : (
                    <span>{entry.displayName.charAt(0).toUpperCase()}</span>
                )}
                {isCurrentUser && <span className="podium-you">You</span>}
            </div>
            <span className="podium-name">{entry.displayName.split(' ')[0]}</span>
            <span className="podium-xp">{formatXP(entry.totalXp)}</span>
        </div>
    );
}

function formatXP(xp: number): string {
    if (xp >= 10000) return `${(xp / 1000).toFixed(1)}K`;
    if (xp >= 1000) return `${(xp / 1000).toFixed(1)}K`;
    return xp.toString();
}
