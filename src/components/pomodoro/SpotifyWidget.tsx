import { useState, useEffect, useRef } from 'react';
import { Music, X, Link as LinkIcon, ArrowLeft, Zap, CloudRain, BookOpen, Coffee, ChevronRight, Disc, Star } from 'lucide-react';
import './SpotifyWidget.css';

// Curated Focus Playlists
const FOCUS_PLAYLISTS = [
    { id: '55qs2WetUQJJB91tQ0LNsI', name: 'Z', desc: 'My Playlist', icon: <Star size={18} />, color: '#fd79a8' },
    { id: '37i9dQZF1DWWQRwui0ExPn', name: 'Lo-Fi Beats', desc: 'Chill beats to study/relax to', icon: <Coffee size={18} />, color: '#9b7ad6' },
    { id: '37i9dQZF1DWWEJlAGA9gs0', name: 'Classical Essentials', desc: 'Mozart, Bach, Beethoven', icon: <BookOpen size={18} />, color: '#e58e26' },
    { id: '37i9dQZF1DX4PP3DA4J0N8', name: 'Nature Sounds', desc: 'Forest, Rain, Ocean', icon: <CloudRain size={18} />, color: '#26de81' },
    { id: '37i9dQZF1DWZd79rJ6a7lp', name: 'White Noise', desc: 'Pure focus masking', icon: <Zap size={18} />, color: '#b2bec3' },
];

export default function SpotifyWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [playlistUrl, setPlaylistUrl] = useState('');
    const [embedUrl, setEmbedUrl] = useState('');
    const widgetRef = useRef<HTMLDivElement>(null);

    // Views: 'library', 'player'
    // Default to library directly, skipping auth check
    const [view, setView] = useState<'library' | 'player'>('library');

    useEffect(() => {
        const savedUrl = localStorage.getItem('arc_spotify_url');
        if (savedUrl) {
            setPlaylistUrl(savedUrl);
            generateEmbed(savedUrl);
            setView('player');
        } else {
            setView('library');
        }
    }, []);

    // Close panel when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (widgetRef.current && !widgetRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const generateEmbed = (url: string) => {
        try {
            let finalUrl = url;
            if (!url.includes('spotify.com')) {
                finalUrl = `https://open.spotify.com/playlist/${url}`;
            }

            const urlObj = new URL(finalUrl);
            const pathParts = urlObj.pathname.split('/').filter(Boolean);
            const type = pathParts[0];
            const id = pathParts[1];

            if ((type === 'playlist' || type === 'album' || type === 'track' || type === 'artist') && id) {
                const embedSrc = `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`;
                setEmbedUrl(embedSrc);
            }
        } catch (e) {
            console.error('Invalid URL', e);
        }
    };

    const handleSelectPlaylist = (id: string) => {
        const url = `https://open.spotify.com/playlist/${id}`;
        setPlaylistUrl(url);
        localStorage.setItem('arc_spotify_url', url);
        generateEmbed(url);
        setView('player');
    };

    const handleCustomSave = () => {
        if (!playlistUrl) return;
        localStorage.setItem('arc_spotify_url', playlistUrl);
        generateEmbed(playlistUrl);
        setView('player');
    };

    const toggleOpen = () => {
        setIsOpen(!isOpen);
    };

    return (
        <div className={`spotify-widget ${isOpen ? 'open' : ''}`} ref={widgetRef}>
            {/* Toggle Button */}
            <button
                className={`spotify-toggle-btn ${isOpen ? 'active' : ''}`}
                onClick={toggleOpen}
                title="Focus Music"
            >
                {isOpen ? <X size={22} /> : <Music size={22} />}
            </button>

            {/* Main Popover */}
            <div className={`spotify-content ${view === 'player' ? 'player-mode' : ''}`}>
                {/* Mobile Close Button */}
                <button className="mobile-close-btn" onClick={() => setIsOpen(false)}>
                    <X size={20} />
                </button>

                {/* Note: Auth View Removed as requested. Directly showing Library. */}

                {/* --- LIBRARY VIEW --- */}
                {view === 'library' && (
                    <div className="spotify-library-container">
                        <div className="library-header">
                            <span className="library-title">Focus Library</span>
                            {embedUrl && (
                                <button className="back-to-player-btn" onClick={() => setView('player')}>
                                    <Disc size={14} className="spin-slow" />
                                    <span>Player</span>
                                </button>
                            )}
                        </div>

                        <div className="playlist-list">
                            {FOCUS_PLAYLISTS.map((pl) => (
                                <button
                                    key={pl.id}
                                    className="playlist-item"
                                    onClick={() => handleSelectPlaylist(pl.id)}
                                    style={{ '--accent': pl.color } as React.CSSProperties}
                                    title={pl.desc}
                                >
                                    <div className="playlist-icon-wrapper">
                                        {pl.icon}
                                    </div>
                                    <div className="playlist-info">
                                        <span className="playlist-name">{pl.name}</span>
                                        <span className="playlist-desc">{pl.desc}</span>
                                    </div>
                                    <ChevronRight size={14} className="playlist-arrow" />
                                </button>
                            ))}
                        </div>

                        <div className="custom-link-section">
                            <div className="custom-input-group">
                                <LinkIcon size={14} className="input-icon" />
                                <input
                                    type="text"
                                    placeholder="Paste Spotify link..."
                                    value={playlistUrl}
                                    onChange={(e) => setPlaylistUrl(e.target.value)}
                                />
                                <button
                                    disabled={!playlistUrl}
                                    onClick={handleCustomSave}
                                    className="go-btn"
                                >
                                    Load
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- PLAYER VIEW --- */}
                {view === 'player' && (
                    <div className="spotify-player-container">
                        <div className="player-header">
                            <button className="library-back-btn" onClick={() => setView('library')}>
                                <ArrowLeft size={16} />
                                <span>Library</span>
                            </button>
                            <span className="now-playing-label">PLAYER</span>
                            <div style={{ width: 24 }} /> {/* Spacer */}
                        </div>

                        <div className="embed-wrapper">
                            <iframe
                                style={{ background: '#000' }}
                                src={embedUrl}
                                width="100%"
                                height="352"
                                frameBorder="0"
                                allowFullScreen
                                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                                loading="lazy"
                            />
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
