import React, { useState, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useIntl } from 'react-intl';
import { useNavigate, useLocation } from 'react-router';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { authService } from '../services/authService';
import logo from '../../assets/logo2.png';
import './login.css';

export const Login: React.FC = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const location = useLocation();
  const [userAd, setUserAd] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentMfaToken, setCurrentMfaToken] = useState<string | null>(null);
  const [mfaEmail, setMfaEmail] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8082';

  const hash = window.location.hash.substring(1);
  const hashParams = new URLSearchParams(hash);
  const params = new URLSearchParams(location.search);
  const isTimeout = params.get('timeout') === 'true';
  const mfaTokenParam = hashParams.get('mfa_token') || params.get('mfa_token');

  const [mfaStep, setMfaStep] = useState(!!mfaTokenParam);

  useEffect(() => {
    let interval: any;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Check for existing session on mount
  useEffect(() => {
    if (authService.isAuthenticated() && authService.getCurrentUser()) {
       navigate('/', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    // Check for Google Login results in URL fragment or search params
    const token = hashParams.get('token') || params.get('token');
    const refresh = hashParams.get('refresh') || params.get('refresh');

    if (token && refresh) {
      localStorage.setItem('rpm-tracker-auth-token', token);
      localStorage.setItem('rpm-tracker-auth-refresh', refresh);

      // Fetch profile to complete login
      authService.getProfile().then(user => {
        if (user) {
          localStorage.setItem('rpm-tracker-auth-user', JSON.stringify(user));
          // Clear query params and redirect to home using href to force context reload
          window.location.href = '/';
        }
      }).catch(err => {
        console.error("Failed to fetch profile after Google login", err);
        toast.error('Failed to retrieve profile');
      });
    }
  }, [location, navigate]);

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userAd && password) {
      setLoading(true);
      try {
        const result = await authService.login(userAd, password);
        
        // If it's a User object, we're logged in
        if (result && result.id) {
          toast.success(intl.formatMessage({ id: 'login.welcome' }, { name: result.name || 'User' }));
          window.location.href = '/';
        } 
        // If it requires MFA/OTP
        else if (result && result.is_mfa_required) {
          setCurrentMfaToken(result.mfa_token);
          setMfaEmail(result.email);
          setMfaStep(true);
          setResendTimer(30);
          toast.info(intl.formatMessage({ id: 'login.mfa_code_sent' }));
        }
        else {
          Swal.fire({
            title: 'Login Failed',
            text: intl.formatMessage({ id: 'login.failed' }),
            icon: 'error',
            confirmButtonColor: '#E30613'
          });
        }
      } catch (err: any) {
        toast.error(err.message || intl.formatMessage({ id: 'login.failed' }));
      } finally {
        setLoading(false);
      }
    }
  };


  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeToken = mfaTokenParam || currentMfaToken;
    if (!mfaCode || !activeToken) return;

    setLoading(true);
    try {
      const user = await authService.verifyOTP(mfaCode, activeToken);
      if (user) {
        toast.success(intl.formatMessage({ id: 'login.mfa_success' }));
        window.location.href = '/';
      } else {
        toast.error(intl.formatMessage({ id: 'login.mfa_invalid' }));
      }
    } catch (error: any) {
      console.error("Verification failed", error);
      toast.error(error.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    const activeToken = mfaTokenParam || currentMfaToken;
    if (!activeToken || resendTimer > 0) return;

    try {
      await authService.resendOTP(activeToken);
      setResendTimer(60);
      toast.success(intl.formatMessage({ id: 'login.mfa_resent' }));
    } catch (err: any) {
      toast.error(err.message || intl.formatMessage({ id: 'login.mfa_resend_failed' }));
    }
  };

  const maskEmail = (email: string | null) => {
    if (!email) return intl.formatMessage({ id: 'login.your_email' });
    const [user, domain] = email.split('@');
    if (user.length <= 2) return `***@${domain}`;
    return `${user.charAt(0)}${'*'.repeat(user.length - 2)}${user.slice(-1)}@${domain}`;
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        {/* Left Side - Login Form */}
        <div className="login-form-section">
          <div className="form-content">
            {/* Logo */}
            <div className="form-logo">
              <img src={logo} alt="RPM Tracker Logo" className="logo-img" />
              <span className="logo-text">RPM Tracker</span>
            </div>

            {/* Header */}
            <div className="form-header">
              <h1 className="form-title">
                {mfaStep
                  ? intl.formatMessage({ id: 'login.mfa_title' })
                  : intl.formatMessage({ id: 'login.title' })}
              </h1>
              <p className="form-subtitle">
                {mfaStep
                  ? intl.formatMessage({ id: 'login.mfa_subtitle' })
                  : intl.formatMessage({ id: 'login.subtitle' })}
              </p>
            </div>

            {/* Session Timeout Alert */}
            {isTimeout && !mfaStep && (
              <div className="alert-box">
                <ShieldCheck size={16} />
                <span>{intl.formatMessage({ id: 'login.session_expired' })}</span>
              </div>
            )}

            {mfaStep ? (
              <form onSubmit={handleMfaVerify} className="login-form">
                <div className="form-group">
                  <div className="input-wrapper">
                    <ShieldCheck className="input-icon" size={18} />
                    <input
                      type="text"
                      placeholder={intl.formatMessage({ id: 'login.mfa_placeholder' })}
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                </div>
                <p className="mfa-email-info">
                  {intl.formatMessage({ id: 'login.mfa_code_sent_to' })} <strong>{maskEmail(mfaEmail)}</strong>
                </p>
                <button type="submit" className={`login-btn ${loading ? 'loading' : ''}`} disabled={loading}>
                  {loading ? (
                    <span className="spinner"></span>
                  ) : (
                    intl.formatMessage({ id: 'login.mfa_verify_btn' })
                  )}
                </button>
                
                <div className="resend-section">
                  <p>{intl.formatMessage({ id: 'login.mfa_not_received' })}</p>
                  <button 
                    type="button" 
                    className="resend-btn" 
                    onClick={handleResendOtp}
                    disabled={resendTimer > 0}
                  >
                    {resendTimer > 0 ? intl.formatMessage({ id: 'login.mfa_resend_timer' }, { n: resendTimer }) : intl.formatMessage({ id: 'login.mfa_resend_btn' })}
                  </button>
                </div>

                <div className="form-options" style={{ justifyContent: 'center', marginTop: '1.5rem' }}>
                  <a href="#" onClick={(e) => { e.preventDefault(); setMfaStep(false); }} className="forgot-password">
                    {intl.formatMessage({ id: 'login.back_to_login' })}
                  </a>
                </div>
              </form>
            ) : (
              <>
                {/* Form */}
                <form onSubmit={handleManualLogin} className="login-form">
                  <div className="form-group">
                    <div className="input-wrapper">
                      <svg className="input-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>
                      <input
                        type="email"
                        placeholder={intl.formatMessage({ id: 'login.email' })}
                        value={userAd}
                        onChange={(e) => setUserAd(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <div className="input-wrapper">
                      <svg className="input-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder={intl.formatMessage({ id: 'login.password' })}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path><line x1="2" y1="2" x2="22" y2="22"></line></svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="form-options">
                    <label className="checkbox-container">
                      <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                      <span className="checkmark"></span>
                      {intl.formatMessage({ id: 'login.remember_me' })}
                    </label>
                    <a href="#" className="forgot-password">{intl.formatMessage({ id: 'login.forgot_password' })}</a>
                  </div>

                  <button type="submit" className={`login-btn ${loading ? 'loading' : ''}`} disabled={loading}>
                    {loading ? (
                      <span className="spinner"></span>
                    ) : (
                      intl.formatMessage({ id: 'login.button' })
                    )}
                  </button>
                </form>

              </>
            )}

            <p className="signup-text">
              {intl.formatMessage({ id: 'login.no_account' })} <a href="#">{intl.formatMessage({ id: 'login.create_account' })}</a>
            </p>
          </div>
        </div>

        {/* Right Side - Illustration */}
        <div className="illustration-section">
          <div className="illustration-container">
            <svg className="main-svg" viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Background Shapes */}
              <circle cx="250" cy="250" r="200" fill="white" fillOpacity="0.05" />
              <rect x="150" y="320" width="200" height="140" rx="12" fill="white" fillOpacity="0.1" />
              <rect x="180" y="350" width="140" height="80" rx="8" fill="white" fillOpacity="0.15" />

              {/* Abstract Data Visualization elements */}
              <rect x="100" y="150" width="300" height="20" rx="10" fill="white" fillOpacity="0.2" />
              <rect x="100" y="190" width="220" height="20" rx="10" fill="white" fillOpacity="0.2" />
              <rect x="100" y="230" width="260" height="20" rx="10" fill="white" fillOpacity="0.2" />

              {/* Floating Icons Style Elements */}
              <circle cx="400" cy="150" r="30" fill="#E30613" fillOpacity="0.8" />
              <path d="M390 150L397 157L410 144" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

              <rect x="50" y="300" width="60" height="60" rx="12" fill="white" fillOpacity="0.2" />
              <path d="M65 330L75 320L85 340" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

              {/* Main character/element placeholder as modern abstract style */}
              <g transform="translate(200, 100)">
                <path d="M50 0C77.6142 0 100 22.3858 100 50V150C100 177.614 77.6142 200 50 200C22.3858 200 0 177.614 0 150V50C0 22.3858 22.3858 0 50 0Z" fill="white" fillOpacity="0.1" />
                <rect x="30" y="60" width="40" height="10" rx="5" fill="white" fillOpacity="0.4" />
                <rect x="30" y="90" width="40" height="10" rx="5" fill="white" fillOpacity="0.4" />
                <rect x="30" y="120" width="40" height="10" rx="5" fill="white" fillOpacity="0.4" />
              </g>
            </svg>
          </div>
          <div className="illustration-text">
            <h2>{intl.formatMessage({ id: 'login.hero_title' })}</h2>
            <p>{intl.formatMessage({ id: 'login.hero_subtitle' })}</p>
            <div className="dots">
              <span className="dot active"></span>
              <span className="dot"></span>
              <span className="dot"></span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="w-full mt-auto py-8">
        <div className="flex justify-center items-center text-[7px] font-bold text-slate-400 uppercase tracking-[0.2em] px-8 opacity-40">
          <span>{intl.formatMessage({ id: 'opco.copyright' })}</span>
        </div>
      </footer>
    </div>
  );
};
