import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader2, Eye, EyeOff } from 'lucide-react';

export default function Login() {
    const { login } = useAuth();
    const navigate  = useNavigate();

    const [form,      setForm]      = useState({ email: '', password: '' });
    const [errors,    setErrors]    = useState({});
    const [apiError,  setApiError]  = useState('');
    const [loading,   setLoading]   = useState(false);
    const [showPw,    setShowPw]    = useState(false);
    const [mounted,   setMounted]   = useState(false);

    useEffect(() => { setMounted(true); }, []);

    function setField(field, value) {
        setForm(prev => ({ ...prev, [field]: value }));
        setErrors(prev => ({ ...prev, [field]: '' }));
        setApiError('');
    }

    function validate() {
        const e = {};
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
            e.email = 'Enter a valid email address';
        if (form.password.length < 1)
            e.password = 'Password is required';
        return e;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const fieldErrors = validate();
        if (Object.keys(fieldErrors).length) { setErrors(fieldErrors); return; }

        setLoading(true);
        try {
            const { user, memberships } = await login(form);
            // Route based on memberships
            if (memberships.length === 0) {
                navigate('/portal', { replace: true });
            } else if (memberships.length === 1) {
                navigate('/Dashboard', { replace: true });
            } else {
                navigate('/select-business', { replace: true });
            }
        } catch (err) {
            setApiError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <style>{`
                @keyframes blob-drift-1 {
                    0%,100% { transform: translate(0,0) scale(1); }
                    33%     { transform: translate(40px,-30px) scale(1.08); }
                    66%     { transform: translate(-20px,20px) scale(0.94); }
                }
                @keyframes blob-drift-2 {
                    0%,100% { transform: translate(0,0) scale(1); }
                    40%     { transform: translate(-50px,30px) scale(1.12); }
                    70%     { transform: translate(20px,-20px) scale(0.92); }
                }
                @keyframes blob-drift-3 {
                    0%,100% { transform: translate(0,0) scale(1); }
                    50%     { transform: translate(30px,40px) scale(1.06); }
                }
                @keyframes gradient-shift {
                    0%,100% { background-position: 0% 50%; }
                    50%     { background-position: 100% 50%; }
                }
                @keyframes fade-up {
                    from { opacity:0; transform:translateY(24px); }
                    to   { opacity:1; transform:translateY(0); }
                }
                .auth-bg {
                    background: linear-gradient(-45deg,#0f172a,#1e1b4b,#0f172a,#0c1a3a);
                    background-size: 400% 400%;
                    animation: gradient-shift 14s ease infinite;
                }
                .blob { position:absolute; border-radius:50%; filter:blur(80px); opacity:.25; pointer-events:none; }
                .blob-1 { width:520px;height:520px; background:#4f46e5; top:-120px; left:-140px; animation:blob-drift-1 18s ease-in-out infinite; }
                .blob-2 { width:400px;height:400px; background:#7c3aed; bottom:-80px; right:-100px; animation:blob-drift-2 22s ease-in-out infinite; }
                .blob-3 { width:320px;height:320px; background:#2563eb; top:40%; left:55%; animation:blob-drift-3 16s ease-in-out infinite; }
                .form-card {
                    opacity:0;
                    animation: fade-up .6s ease forwards;
                    animation-delay: .1s;
                }
                .input-field {
                    width:100%; background:#f8fafc; border:1.5px solid #e2e8f0;
                    border-radius:10px; padding:11px 14px; font-size:15px; color:#0f172a;
                    outline:none; transition:border-color .2s, box-shadow .2s;
                }
                .input-field:focus {
                    border-color:#6366f1;
                    box-shadow: 0 0 0 3px rgba(99,102,241,.12);
                    background:#fff;
                }
                .input-field.error { border-color:#f87171; }
                .input-field.error:focus { box-shadow: 0 0 0 3px rgba(248,113,113,.12); }
                .btn-primary {
                    width:100%; padding:12px; border-radius:10px;
                    background:linear-gradient(135deg,#6366f1,#4f46e5);
                    color:#fff; font-size:15px; font-weight:600;
                    border:none; cursor:pointer;
                    transition:transform .15s, box-shadow .15s, opacity .15s;
                    box-shadow: 0 4px 14px rgba(99,102,241,.4);
                }
                .btn-primary:hover:not(:disabled) {
                    transform:translateY(-1px);
                    box-shadow: 0 6px 20px rgba(99,102,241,.5);
                }
                .btn-primary:active:not(:disabled) { transform:translateY(0); }
                .btn-primary:disabled { opacity:.65; cursor:not-allowed; }
            `}</style>

            <div className="auth-bg min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
                {/* Floating blobs */}
                <div className="blob blob-1" />
                <div className="blob blob-2" />
                <div className="blob blob-3" />

                <div className="form-card relative z-10 w-full max-w-md">
                    {/* Brand */}
                    <div className="text-center mb-8">
                        <h1 className="text-5xl font-bold text-white tracking-tight shimmer">BizMate</h1>
                        <p className="text-slate-400 mt-2 text-sm tracking-wide">Business Management Platform</p>
                    </div>

                    {/* Card */}
                    <div style={{
                        background:   'rgba(255,255,255,0.97)',
                        borderRadius: '20px',
                        padding:      '36px',
                        boxShadow:    '0 25px 60px rgba(0,0,0,.35), 0 0 0 1px rgba(255,255,255,.08)',
                    }}>
                        <h2 style={{ fontSize:'22px', fontWeight:700, color:'#0f172a', marginBottom:'4px' }}>
                            Welcome back
                        </h2>
                        <p style={{ fontSize:'14px', color:'#64748b', marginBottom:'28px' }}>
                            Sign in to your account
                        </p>

                        {/* API Error */}
                        {apiError && (
                            <div style={{
                                background:'#fef2f2', border:'1.5px solid #fecaca',
                                color:'#dc2626', borderRadius:'10px',
                                padding:'12px 14px', fontSize:'13.5px', marginBottom:'20px',
                            }}>
                                {apiError}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} noValidate style={{ display:'flex', flexDirection:'column', gap:'18px' }}>

                            {/* Email */}
                            <div>
                                <label style={{ display:'block', fontSize:'13px', fontWeight:600, color:'#374151', marginBottom:'6px' }}>
                                    Email address
                                </label>
                                <input
                                    type="email"
                                    autoComplete="email"
                                    placeholder="you@company.com"
                                    value={form.email}
                                    onChange={e => setField('email', e.target.value)}
                                    className={`input-field ${errors.email ? 'error' : ''}`}
                                />
                                {errors.email && (
                                    <p style={{ color:'#ef4444', fontSize:'12px', marginTop:'4px' }}>{errors.email}</p>
                                )}
                            </div>

                            {/* Password */}
                            <div>
                                <label style={{ display:'block', fontSize:'13px', fontWeight:600, color:'#374151', marginBottom:'6px' }}>
                                    Password
                                </label>
                                <div style={{ position:'relative' }}>
                                    <input
                                        type={showPw ? 'text' : 'password'}
                                        autoComplete="current-password"
                                        placeholder="••••••••"
                                        value={form.password}
                                        onChange={e => setField('password', e.target.value)}
                                        className={`input-field ${errors.password ? 'error' : ''}`}
                                        style={{ paddingRight:'44px' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPw(v => !v)}
                                        style={{
                                            position:'absolute', right:'12px', top:'50%',
                                            transform:'translateY(-50%)', background:'none',
                                            border:'none', cursor:'pointer', color:'#94a3b8',
                                            padding:'0', display:'flex', alignItems:'center',
                                        }}
                                    >
                                        {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                                    </button>
                                </div>
                                {errors.password && (
                                    <p style={{ color:'#ef4444', fontSize:'12px', marginTop:'4px' }}>{errors.password}</p>
                                )}
                            </div>

                            {/* Submit */}
                            <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop:'4px' }}>
                                {loading ? (
                                    <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
                                        <Loader2 size={16} style={{ animation:'spin 1s linear infinite' }} />
                                        Signing in…
                                    </span>
                                ) : 'Sign In'}
                            </button>

                            <p style={{ textAlign:'center', fontSize:'13.5px', color:'#64748b' }}>
                                Don't have an account?{' '}
                                <Link to="/register" style={{ color:'#6366f1', fontWeight:600, textDecoration:'none' }}
                                    onMouseEnter={e => e.target.style.textDecoration='underline'}
                                    onMouseLeave={e => e.target.style.textDecoration='none'}
                                >
                                    Sign Up
                                </Link>
                            </p>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
}
