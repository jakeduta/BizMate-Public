import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader2, Eye, EyeOff, Building2, User, CheckCircle2, Copy, Check } from 'lucide-react';

const SHARED_STYLE = `
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
    @keyframes slide-right {
        from { opacity:0; transform:translateX(-18px); }
        to   { opacity:1; transform:translateX(0); }
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
    .form-card { opacity:0; animation: fade-up .6s ease forwards; animation-delay:.1s; }
    .step-content { animation: slide-right .3s ease forwards; }
    .input-field {
        width:100%; background:#f8fafc; border:1.5px solid #e2e8f0;
        border-radius:10px; padding:11px 14px; font-size:15px; color:#0f172a;
        outline:none; transition:border-color .2s, box-shadow .2s; box-sizing:border-box;
    }
    .input-field:focus { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.12); background:#fff; }
    .input-field.error { border-color:#f87171; }
    .input-field.error:focus { box-shadow:0 0 0 3px rgba(248,113,113,.12); }
    .btn-primary {
        width:100%; padding:12px; border-radius:10px;
        background:linear-gradient(135deg,#6366f1,#4f46e5);
        color:#fff; font-size:15px; font-weight:600; border:none; cursor:pointer;
        transition:transform .15s, box-shadow .15s, opacity .15s;
        box-shadow:0 4px 14px rgba(99,102,241,.4);
    }
    .btn-primary:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 6px 20px rgba(99,102,241,.5); }
    .btn-primary:active:not(:disabled) { transform:translateY(0); }
    .btn-primary:disabled { opacity:.65; cursor:not-allowed; }
    .role-card {
        flex:1; padding:20px 16px; border-radius:14px; border:2px solid #e2e8f0;
        cursor:pointer; transition:all .2s; text-align:center; background:#f8fafc;
    }
    .role-card:hover { border-color:#a5b4fc; background:#f0f0ff; transform:translateY(-2px); }
    .role-card.selected { border-color:#6366f1; background:#eef2ff; box-shadow:0 0 0 3px rgba(99,102,241,.12); }
    .code-box {
        background:#f0f0ff; border:2px solid #a5b4fc; border-radius:12px;
        padding:20px; text-align:center; margin:16px 0;
    }
`;

function FieldGroup({ label, error, children }) {
    return (
        <div>
            <label style={{ display:'block', fontSize:'13px', fontWeight:600, color:'#374151', marginBottom:'6px' }}>
                {label}
            </label>
            {children}
            {error && <p style={{ color:'#ef4444', fontSize:'12px', marginTop:'4px' }}>{error}</p>}
        </div>
    );
}

function PasswordInput({ value, onChange, placeholder, name, error }) {
    const [show, setShow] = useState(false);
    return (
        <div style={{ position:'relative' }}>
            <input
                type={show ? 'text' : 'password'}
                autoComplete={name}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                className={`input-field ${error ? 'error' : ''}`}
                style={{ paddingRight:'44px' }}
            />
            <button type="button" onClick={() => setShow(v => !v)}
                style={{
                    position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)',
                    background:'none', border:'none', cursor:'pointer', color:'#94a3b8',
                    padding:'0', display:'flex', alignItems:'center',
                }}>
                {show ? <EyeOff size={16}/> : <Eye size={16}/>}
            </button>
        </div>
    );
}

export default function Register() {
    const { register } = useAuth();
    const navigate     = useNavigate();

    const [step,     setStep]    = useState(1); // 1=role select, 2=details
    const [type,     setType]    = useState(''); // 'business' | 'customer'
    const [form,     setForm]    = useState({ fullName:'', businessName:'', email:'', password:'', confirmPassword:'' });
    const [errors,   setErrors]  = useState({});
    const [apiError, setApiError] = useState('');
    const [loading,  setLoading]  = useState(false);
    const [result,   setResult]   = useState(null); // { businessCode, businessName } or true
    const [copied,   setCopied]   = useState(false);

    function setField(field, value) {
        setForm(prev => ({ ...prev, [field]: value }));
        setErrors(prev => ({ ...prev, [field]: '' }));
        setApiError('');
    }

    function selectType(t) {
        setType(t);
        setErrors({});
        setApiError('');
    }

    function goToStep2() {
        if (!type) return;
        setStep(2);
    }

    function validate() {
        const e = {};
        if (form.fullName.trim().length < 2)
            e.fullName = 'Full name must be at least 2 characters';
        if (type === 'business' && form.businessName.trim().length < 2)
            e.businessName = 'Business name must be at least 2 characters';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
            e.email = 'Enter a valid email address';
        if (form.password.length < 8)
            e.password = 'Password must be at least 8 characters';
        else if (!/[A-Z]/.test(form.password))
            e.password = 'Must include at least one uppercase letter';
        else if (!/[0-9]/.test(form.password))
            e.password = 'Must include at least one number';
        if (form.password !== form.confirmPassword)
            e.confirmPassword = 'Passwords do not match';
        return e;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const fieldErrors = validate();
        if (Object.keys(fieldErrors).length) { setErrors(fieldErrors); return; }

        setLoading(true);
        try {
            const data = await register({
                type,
                email:        form.email,
                password:     form.password,
                fullName:     form.fullName,
                businessName: form.businessName,
            });
            setResult(type === 'business' ? data : true);
        } catch (err) {
            setApiError(err.message);
        } finally {
            setLoading(false);
        }
    }

    function copyCode() {
        navigator.clipboard.writeText(result.businessCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    // ── Success Screen ────────────────────────────────────────────────────────
    if (result) {
        return (
            <>
                <style>{SHARED_STYLE}</style>
                <div className="auth-bg min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
                    <div className="blob blob-1"/><div className="blob blob-2"/><div className="blob blob-3"/>
                    <div className="form-card relative z-10 w-full max-w-md">
                        <div style={{ background:'rgba(255,255,255,0.97)', borderRadius:'20px', padding:'40px 36px', boxShadow:'0 25px 60px rgba(0,0,0,.35)' }}>
                            <div style={{ textAlign:'center', marginBottom:'24px' }}>
                                <div style={{ width:'64px', height:'64px', background:'#f0fdf4', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
                                    <CheckCircle2 size={36} style={{ color:'#22c55e' }}/>
                                </div>
                                <h2 style={{ fontSize:'22px', fontWeight:700, color:'#0f172a', marginBottom:'8px' }}>
                                    {type === 'business' ? 'Business Created!' : 'Account Created!'}
                                </h2>
                                <p style={{ fontSize:'14px', color:'#64748b' }}>
                                    {type === 'business'
                                        ? `Your business "${result.businessName}" is ready. Share your business code with team members.`
                                        : 'Your account is ready. Sign in to get started.'}
                                </p>
                            </div>

                            {type === 'business' && result.businessCode && (
                                <div className="code-box">
                                    <p style={{ fontSize:'12px', fontWeight:600, color:'#6366f1', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:'8px' }}>
                                        Your Business Code
                                    </p>
                                    <p style={{ fontSize:'28px', fontWeight:800, color:'#1e1b4b', letterSpacing:'.15em', fontFamily:'monospace', marginBottom:'12px' }}>
                                        {result.businessCode}
                                    </p>
                                    <button onClick={copyCode} style={{
                                        display:'inline-flex', alignItems:'center', gap:'6px',
                                        background: copied ? '#dcfce7' : '#eef2ff',
                                        color: copied ? '#16a34a' : '#6366f1',
                                        border:'none', borderRadius:'8px', padding:'7px 16px',
                                        fontSize:'13px', fontWeight:600, cursor:'pointer',
                                        transition:'all .2s',
                                    }}>
                                        {copied ? <><Check size={14}/>Copied!</> : <><Copy size={14}/>Copy Code</>}
                                    </button>
                                    <p style={{ fontSize:'12px', color:'#94a3b8', marginTop:'10px' }}>
                                        Save this code — you'll need it to invite team members
                                    </p>
                                </div>
                            )}

                            <button
                                onClick={() => navigate('/login')}
                                className="btn-primary"
                                style={{ marginTop:'8px' }}
                            >
                                Continue to Sign In
                            </button>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <style>{SHARED_STYLE}</style>
            <div className="auth-bg min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
                <div className="blob blob-1"/><div className="blob blob-2"/><div className="blob blob-3"/>

                <div className="form-card relative z-10 w-full max-w-md">
                    {/* Brand */}
                    <div style={{ textAlign:'center', marginBottom:'28px' }}>
                        <h1 className="shimmer" style={{ fontSize:'44px', fontWeight:700, color:'#fff', letterSpacing:'-.02em' }}>BizMate</h1>
                        <p style={{ fontSize:'14px', color:'#94a3b8', marginTop:'4px' }}>Create your account</p>
                    </div>

                    <div style={{ background:'rgba(255,255,255,0.97)', borderRadius:'20px', padding:'36px', boxShadow:'0 25px 60px rgba(0,0,0,.35), 0 0 0 1px rgba(255,255,255,.08)' }}>

                        {/* Step indicator */}
                        <div style={{ display:'flex', alignItems:'center', marginBottom:'28px', gap:'8px' }}>
                            {[1,2].map(s => (
                                <div key={s} style={{ display:'flex', alignItems:'center', flex: s===1?'0 0 auto':1 }}>
                                    <div style={{
                                        width:'28px', height:'28px', borderRadius:'50%',
                                        background: step >= s ? '#6366f1' : '#e2e8f0',
                                        color: step >= s ? '#fff' : '#94a3b8',
                                        display:'flex', alignItems:'center', justifyContent:'center',
                                        fontSize:'12px', fontWeight:700, flexShrink:0,
                                        transition:'all .3s',
                                    }}>{s}</div>
                                    {s === 1 && <div style={{ flex:1, height:'2px', background: step >= 2 ? '#6366f1' : '#e2e8f0', margin:'0 8px', transition:'background .3s' }}/>}
                                </div>
                            ))}
                            <span style={{ fontSize:'12px', color:'#6366f1', fontWeight:600 }}>
                                {step === 1 ? 'Choose type' : 'Your details'}
                            </span>
                        </div>

                        {/* API Error */}
                        {apiError && (
                            <div style={{
                                background:'#fef2f2', border:'1.5px solid #fecaca', color:'#dc2626',
                                borderRadius:'10px', padding:'12px 14px', fontSize:'13.5px', marginBottom:'20px',
                            }}>{apiError}</div>
                        )}

                        {/* ── STEP 1: Role selection ── */}
                        {step === 1 && (
                            <div className="step-content">
                                <h2 style={{ fontSize:'20px', fontWeight:700, color:'#0f172a', marginBottom:'6px' }}>
                                    I am a…
                                </h2>
                                <p style={{ fontSize:'14px', color:'#64748b', marginBottom:'24px' }}>
                                    Choose the account type that fits your needs
                                </p>

                                <div style={{ display:'flex', gap:'14px', marginBottom:'28px' }}>
                                    {/* Business card */}
                                    <div
                                        className={`role-card ${type === 'business' ? 'selected' : ''}`}
                                        onClick={() => selectType('business')}
                                    >
                                        <div style={{ width:'44px', height:'44px', borderRadius:'12px', background: type==='business' ? '#eef2ff' : '#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px' }}>
                                            <Building2 size={22} style={{ color: type==='business' ? '#6366f1' : '#64748b' }}/>
                                        </div>
                                        <p style={{ fontWeight:700, fontSize:'15px', color: type==='business' ? '#4f46e5' : '#0f172a', marginBottom:'4px' }}>
                                            Business
                                        </p>
                                        <p style={{ fontSize:'12px', color:'#64748b', lineHeight:'1.4' }}>
                                            Create a workspace, manage employees, customers & more
                                        </p>
                                        {type === 'business' && (
                                            <div style={{ marginTop:'10px', display:'inline-flex', alignItems:'center', gap:'4px', background:'#eef2ff', color:'#6366f1', borderRadius:'20px', padding:'3px 10px', fontSize:'12px', fontWeight:600 }}>
                                                <Check size={11}/> Selected
                                            </div>
                                        )}
                                    </div>

                                    {/* Customer card */}
                                    <div
                                        className={`role-card ${type === 'customer' ? 'selected' : ''}`}
                                        onClick={() => selectType('customer')}
                                    >
                                        <div style={{ width:'44px', height:'44px', borderRadius:'12px', background: type==='customer' ? '#eef2ff' : '#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px' }}>
                                            <User size={22} style={{ color: type==='customer' ? '#6366f1' : '#64748b' }}/>
                                        </div>
                                        <p style={{ fontWeight:700, fontSize:'15px', color: type==='customer' ? '#4f46e5' : '#0f172a', marginBottom:'4px' }}>
                                            Customer
                                        </p>
                                        <p style={{ fontSize:'12px', color:'#64748b', lineHeight:'1.4' }}>
                                            Connect to businesses, view invoices & appointments
                                        </p>
                                        {type === 'customer' && (
                                            <div style={{ marginTop:'10px', display:'inline-flex', alignItems:'center', gap:'4px', background:'#eef2ff', color:'#6366f1', borderRadius:'20px', padding:'3px 10px', fontSize:'12px', fontWeight:600 }}>
                                                <Check size={11}/> Selected
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={goToStep2}
                                    disabled={!type}
                                    className="btn-primary"
                                >
                                    Continue
                                </button>

                                <p style={{ textAlign:'center', fontSize:'13.5px', color:'#64748b', marginTop:'18px' }}>
                                    Already have an account?{' '}
                                    <Link to="/login" style={{ color:'#6366f1', fontWeight:600, textDecoration:'none' }}
                                        onMouseEnter={e => e.target.style.textDecoration='underline'}
                                        onMouseLeave={e => e.target.style.textDecoration='none'}
                                    >Sign In</Link>
                                </p>
                            </div>
                        )}

                        {/* ── STEP 2: Details form ── */}
                        {step === 2 && (
                            <div className="step-content">
                                <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'24px' }}>
                                    <button type="button" onClick={() => setStep(1)} style={{
                                        background:'#f1f5f9', border:'none', borderRadius:'8px',
                                        padding:'6px 12px', fontSize:'13px', color:'#475569',
                                        cursor:'pointer', fontWeight:500,
                                    }}>← Back</button>
                                    <div>
                                        <h2 style={{ fontSize:'20px', fontWeight:700, color:'#0f172a', lineHeight:1.2 }}>
                                            {type === 'business' ? 'Set up your business' : 'Create your account'}
                                        </h2>
                                        <p style={{ fontSize:'13px', color:'#64748b' }}>
                                            {type === 'business' ? 'You will be set up as Admin' : 'Join businesses after signing in'}
                                        </p>
                                    </div>
                                </div>

                                <form onSubmit={handleSubmit} noValidate style={{ display:'flex', flexDirection:'column', gap:'16px' }}>

                                    {/* Business name (business only) */}
                                    {type === 'business' && (
                                        <FieldGroup label="Business Name" error={errors.businessName}>
                                            <input
                                                type="text"
                                                placeholder="e.g. Acme Corp"
                                                value={form.businessName}
                                                onChange={e => setField('businessName', e.target.value)}
                                                className={`input-field ${errors.businessName ? 'error' : ''}`}
                                            />
                                        </FieldGroup>
                                    )}

                                    {/* Full name */}
                                    <FieldGroup label="Full Name" error={errors.fullName}>
                                        <input
                                            type="text"
                                            autoComplete="name"
                                            placeholder="Jane Smith"
                                            value={form.fullName}
                                            onChange={e => setField('fullName', e.target.value)}
                                            className={`input-field ${errors.fullName ? 'error' : ''}`}
                                        />
                                    </FieldGroup>

                                    {/* Email */}
                                    <FieldGroup label="Email Address" error={errors.email}>
                                        <input
                                            type="email"
                                            autoComplete="email"
                                            placeholder="you@company.com"
                                            value={form.email}
                                            onChange={e => setField('email', e.target.value)}
                                            className={`input-field ${errors.email ? 'error' : ''}`}
                                        />
                                    </FieldGroup>

                                    {/* Password */}
                                    <FieldGroup label="Password" error={errors.password}>
                                        <PasswordInput
                                            value={form.password}
                                            onChange={e => setField('password', e.target.value)}
                                            placeholder="Min 8 chars, 1 uppercase, 1 number"
                                            name="new-password"
                                            error={errors.password}
                                        />
                                        {/* Strength hints */}
                                        {form.password.length > 0 && !errors.password && (
                                            <div style={{ display:'flex', gap:'6px', marginTop:'6px', flexWrap:'wrap' }}>
                                                {[
                                                    { ok: form.password.length >= 8, label:'8+ chars' },
                                                    { ok: /[A-Z]/.test(form.password), label:'Uppercase' },
                                                    { ok: /[0-9]/.test(form.password), label:'Number' },
                                                ].map(({ ok, label }) => (
                                                    <span key={label} style={{
                                                        fontSize:'11px', padding:'2px 8px', borderRadius:'20px',
                                                        background: ok ? '#dcfce7' : '#f1f5f9',
                                                        color: ok ? '#16a34a' : '#94a3b8',
                                                        fontWeight:500,
                                                    }}>
                                                        {ok ? '✓' : '·'} {label}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </FieldGroup>

                                    {/* Confirm password */}
                                    <FieldGroup label="Confirm Password" error={errors.confirmPassword}>
                                        <PasswordInput
                                            value={form.confirmPassword}
                                            onChange={e => setField('confirmPassword', e.target.value)}
                                            placeholder="••••••••"
                                            name="new-password"
                                            error={errors.confirmPassword}
                                        />
                                    </FieldGroup>

                                    <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop:'4px' }}>
                                        {loading ? (
                                            <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
                                                <Loader2 size={16} style={{ animation:'spin 1s linear infinite' }}/>
                                                Creating account…
                                            </span>
                                        ) : type === 'business' ? 'Create Business Account' : 'Create Account'}
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
