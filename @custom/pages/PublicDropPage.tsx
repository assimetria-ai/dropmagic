import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

interface Drop {
  id: number;
  name: string;
  slug: string;
  description: string;
  product_url: string;
  image_url: string;
  launch_at: string;
  status: 'active' | 'ended' | 'draft';
  signup_count?: number;
}

interface Signup {
  email: string;
  referral_code: string;
  referral_count: number;
}

/**
 * PublicDropPage - Viral signup landing page for product drops
 * 
 * Features:
 * - Countdown timer to launch
 * - Email capture form with referral tracking
 * - Display user's referral code after signup
 * - Social sharing with referral links
 */
export default function PublicDropPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get('ref');

  const [drop, setDrop] = useState<Drop | null>(null);
  const [signup, setSignup] = useState<Signup | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [timeRemaining, setTimeRemaining] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  useEffect(() => {
    loadDrop();
  }, [slug]);

  useEffect(() => {
    if (!drop?.launch_at) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const launch = new Date(drop.launch_at).getTime();
      const distance = launch - now;

      if (distance < 0) {
        setTimeRemaining(null);
        clearInterval(interval);
        return;
      }

      setTimeRemaining({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000),
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [drop]);

  const loadDrop = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/drops/${slug}`);
      
      if (!response.ok) {
        throw new Error('Drop not found');
      }
      
      const data = await response.json();
      setDrop(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load drop');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload: { email: string; referral_code?: string } = { email };
      if (referralCode) {
        payload.referral_code = referralCode;
      }

      const response = await fetch(`/api/drops/${slug}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Signup failed');
      }

      const signupData = await response.json();
      setSignup(signupData);
      
      // Update signup count
      if (drop) {
        setDrop({
          ...drop,
          signup_count: (drop.signup_count || 0) + 1,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getReferralUrl = () => {
    if (!signup) return '';
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?ref=${signup.referral_code}`;
  };

  const shareOnTwitter = () => {
    const url = getReferralUrl();
    const text = `Check out ${drop?.name}! Join the waitlist:`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      '_blank'
    );
  };

  const shareOnFacebook = () => {
    const url = getReferralUrl();
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      '_blank'
    );
  };

  const shareOnLinkedIn = () => {
    const url = getReferralUrl();
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      '_blank'
    );
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(getReferralUrl());
      alert('Referral link copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (loading) {
    return (
      <div className="public-drop-page loading">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  if (error && !drop) {
    return (
      <div className="public-drop-page error">
        <div className="error-message">
          <h1>⚠️ Drop Not Found</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!drop) {
    return null;
  }

  const isLaunched = drop.status === 'ended' || (timeRemaining === null && new Date(drop.launch_at) < new Date());

  return (
    <div className="public-drop-page">
      <div className="drop-container">
        {/* Hero Section */}
        <div className="drop-hero">
          {drop.image_url && (
            <div className="drop-image">
              <img src={drop.image_url} alt={drop.name} />
            </div>
          )}
          <h1 className="drop-title">{drop.name}</h1>
          <p className="drop-description">{drop.description}</p>
          
          {drop.signup_count !== undefined && (
            <div className="signup-count">
              🔥 <strong>{drop.signup_count}</strong> people already signed up
            </div>
          )}
        </div>

        {/* Countdown Timer */}
        {!isLaunched && timeRemaining && (
          <div className="countdown-section">
            <h2>Launching In</h2>
            <div className="countdown-timer">
              <div className="time-unit">
                <span className="time-value">{timeRemaining.days}</span>
                <span className="time-label">Days</span>
              </div>
              <div className="time-separator">:</div>
              <div className="time-unit">
                <span className="time-value">{String(timeRemaining.hours).padStart(2, '0')}</span>
                <span className="time-label">Hours</span>
              </div>
              <div className="time-separator">:</div>
              <div className="time-unit">
                <span className="time-value">{String(timeRemaining.minutes).padStart(2, '0')}</span>
                <span className="time-label">Minutes</span>
              </div>
              <div className="time-separator">:</div>
              <div className="time-unit">
                <span className="time-value">{String(timeRemaining.seconds).padStart(2, '0')}</span>
                <span className="time-label">Seconds</span>
              </div>
            </div>
          </div>
        )}

        {/* Launched Status */}
        {isLaunched && (
          <div className="launched-status">
            <h2>🚀 This Drop Has Launched!</h2>
            {drop.product_url && (
              <a 
                href={drop.product_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="product-link"
              >
                Visit Product →
              </a>
            )}
          </div>
        )}

        {/* Signup Form or Success State */}
        {!signup && !isLaunched && (
          <div className="signup-section">
            <h2>Get Early Access</h2>
            {referralCode && (
              <p className="referral-notice">
                🎉 You were referred! Join using the code below.
              </p>
            )}
            <form onSubmit={handleSignup} className="signup-form">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
                required
              />
              <button type="submit" disabled={submitting}>
                {submitting ? 'Signing Up...' : 'Join Waitlist'}
              </button>
            </form>
            {error && <div className="error-message">{error}</div>}
          </div>
        )}

        {/* Success State - Show Referral Code */}
        {signup && (
          <div className="success-section">
            <div className="success-header">
              <h2>🎉 You're On The List!</h2>
              <p>Check your email at <strong>{signup.email}</strong> for updates.</p>
            </div>

            <div className="referral-widget">
              <h3>Share & Earn Rewards</h3>
              <p>Get your friends to join using your unique referral link:</p>
              
              <div className="referral-code-display">
                <input
                  type="text"
                  value={getReferralUrl()}
                  readOnly
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button onClick={copyToClipboard} className="copy-button">
                  📋 Copy
                </button>
              </div>

              <div className="referral-stats">
                <div className="stat">
                  <span className="stat-label">Your Referrals</span>
                  <span className="stat-value">{signup.referral_count}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Referral Code</span>
                  <span className="stat-value">{signup.referral_code}</span>
                </div>
              </div>

              <div className="social-share">
                <h4>Share on social media:</h4>
                <div className="share-buttons">
                  <button onClick={shareOnTwitter} className="share-btn twitter">
                    🐦 Twitter
                  </button>
                  <button onClick={shareOnFacebook} className="share-btn facebook">
                    📘 Facebook
                  </button>
                  <button onClick={shareOnLinkedIn} className="share-btn linkedin">
                    💼 LinkedIn
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .public-drop-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .drop-container {
          max-width: 600px;
          width: 100%;
          background: white;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          overflow: hidden;
        }

        .drop-hero {
          padding: 40px;
          text-align: center;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        }

        .drop-image {
          margin-bottom: 24px;
        }

        .drop-image img {
          max-width: 100%;
          max-height: 300px;
          border-radius: 12px;
          object-fit: cover;
        }

        .drop-title {
          font-size: 32px;
          font-weight: bold;
          margin: 0 0 16px 0;
          color: #1a202c;
        }

        .drop-description {
          font-size: 18px;
          color: #4a5568;
          margin: 0 0 20px 0;
          line-height: 1.6;
        }

        .signup-count {
          display: inline-block;
          padding: 12px 24px;
          background: white;
          border-radius: 24px;
          font-size: 16px;
          color: #2d3748;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .countdown-section {
          padding: 40px;
          text-align: center;
          background: #1a202c;
          color: white;
        }

        .countdown-section h2 {
          margin: 0 0 24px 0;
          font-size: 24px;
          text-transform: uppercase;
          letter-spacing: 2px;
          opacity: 0.9;
        }

        .countdown-timer {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
        }

        .time-unit {
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 70px;
        }

        .time-value {
          font-size: 48px;
          font-weight: bold;
          line-height: 1;
        }

        .time-label {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
          opacity: 0.7;
          margin-top: 8px;
        }

        .time-separator {
          font-size: 36px;
          font-weight: bold;
          opacity: 0.5;
        }

        .launched-status {
          padding: 40px;
          text-align: center;
        }

        .launched-status h2 {
          margin: 0 0 24px 0;
          font-size: 28px;
          color: #1a202c;
        }

        .product-link {
          display: inline-block;
          padding: 16px 32px;
          background: #667eea;
          color: white;
          text-decoration: none;
          border-radius: 8px;
          font-weight: bold;
          font-size: 18px;
          transition: background 0.2s;
        }

        .product-link:hover {
          background: #5568d3;
        }

        .signup-section {
          padding: 40px;
        }

        .signup-section h2 {
          text-align: center;
          margin: 0 0 16px 0;
          font-size: 28px;
          color: #1a202c;
        }

        .referral-notice {
          text-align: center;
          color: #667eea;
          font-weight: bold;
          margin-bottom: 24px;
        }

        .signup-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .signup-form input {
          padding: 16px;
          font-size: 16px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          transition: border-color 0.2s;
        }

        .signup-form input:focus {
          outline: none;
          border-color: #667eea;
        }

        .signup-form button {
          padding: 16px;
          font-size: 18px;
          font-weight: bold;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .signup-form button:hover:not(:disabled) {
          background: #5568d3;
        }

        .signup-form button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .success-section {
          padding: 40px;
        }

        .success-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .success-header h2 {
          margin: 0 0 12px 0;
          font-size: 28px;
          color: #1a202c;
        }

        .success-header p {
          color: #4a5568;
          font-size: 16px;
        }

        .referral-widget {
          background: #f7fafc;
          padding: 24px;
          border-radius: 12px;
        }

        .referral-widget h3 {
          margin: 0 0 8px 0;
          font-size: 20px;
          color: #1a202c;
        }

        .referral-widget > p {
          color: #4a5568;
          margin-bottom: 16px;
        }

        .referral-code-display {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
        }

        .referral-code-display input {
          flex: 1;
          padding: 12px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          background: white;
        }

        .copy-button {
          padding: 12px 20px;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: bold;
          cursor: pointer;
          transition: background 0.2s;
          white-space: nowrap;
        }

        .copy-button:hover {
          background: #5568d3;
        }

        .referral-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat {
          background: white;
          padding: 16px;
          border-radius: 8px;
          text-align: center;
        }

        .stat-label {
          display: block;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #718096;
          margin-bottom: 8px;
        }

        .stat-value {
          display: block;
          font-size: 24px;
          font-weight: bold;
          color: #667eea;
        }

        .social-share h4 {
          margin: 0 0 12px 0;
          font-size: 16px;
          color: #2d3748;
        }

        .share-buttons {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }

        .share-btn {
          padding: 12px;
          border: none;
          border-radius: 8px;
          font-weight: bold;
          cursor: pointer;
          transition: transform 0.2s, opacity 0.2s;
        }

        .share-btn:hover {
          transform: translateY(-2px);
          opacity: 0.9;
        }

        .share-btn.twitter {
          background: #1da1f2;
          color: white;
        }

        .share-btn.facebook {
          background: #4267B2;
          color: white;
        }

        .share-btn.linkedin {
          background: #0077b5;
          color: white;
        }

        .error-message {
          color: #e53e3e;
          text-align: center;
          margin-top: 16px;
          font-size: 14px;
        }

        .loading {
          text-align: center;
          padding: 60px;
        }

        .loading-spinner {
          font-size: 18px;
          color: white;
        }

        @media (max-width: 640px) {
          .drop-container {
            border-radius: 0;
          }

          .countdown-timer {
            flex-wrap: wrap;
          }

          .time-unit {
            min-width: 60px;
          }

          .time-value {
            font-size: 36px;
          }

          .share-buttons {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
