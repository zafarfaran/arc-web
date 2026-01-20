import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Zap, ArrowRight } from 'lucide-react';
import { auth } from '../../lib/firebase';
import { createUserWithEmailAndPassword, updateProfile, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { useApp } from '../../contexts/AppContext';
import './Auth.css';

export default function SignupPage() {
    const navigate = useNavigate();
    const { state } = useApp();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (state.isAuthenticated && !isLoading) {
            navigate('/reports');
        }
    }, [state.isAuthenticated, isLoading, navigate]);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(userCredential.user, {
                displayName: name
            });
            navigate('/reports');
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to create account');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        setError('');
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            navigate('/reports');
        } catch (err: any) {
            console.error(err);
            setError('Failed to sign up with Google');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card animate-in">
                <div className="auth-header">
                    <div className="auth-logo">
                        <div className="auth-logo-icon">
                            <Zap size={24} fill="white" />
                        </div>
                        <span className="auth-brand-name">ARC</span>
                    </div>
                    <span className="auth-tagline">Focus • Track • Grow</span>
                </div>

                <form className="auth-form" onSubmit={handleSignup}>
                    {error && <div className="auth-error">{error}</div>}
                    <div className="form-group">
                        <label className="form-label">Full Name</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="John Doe"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input
                            type="email"
                            className="form-input"
                            placeholder="name@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input
                            type="password"
                            className="form-input"
                            placeholder="Create a password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="auth-button" disabled={isLoading}>
                        {isLoading ? 'Creating Account...' : (
                            <>
                                Get Started <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </form>

                <div className="auth-divider">Or sign up with</div>

                <button type="button" className="social-button" onClick={handleGoogleLogin} disabled={isLoading}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Google
                </button>

                <div className="auth-footer">
                    Already have an account?
                    <Link to="/login" className="auth-link">Sign in</Link>
                </div>
            </div>
        </div>
    );
}
