import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
    Building2, Search, Plus, FileText, Calendar,
    ChevronRight, Loader2, X, Check, LogOut,
    ArrowLeft, CreditCard, Clock, Users
} from 'lucide-react';

const BASE = '';

function authHeaders(token) {
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

// ── Business Card ─────────────────────────────────────────────────────────────
function BusinessCard({ biz, onSelect }) {
    const roleColor = {
        Admin:    { bg:'#f3e8ff', text:'#7c3aed' },
        Manager:  { bg:'#dbeafe', text:'#1d4ed8' },
        Employee: { bg:'#dcfce7', text:'#15803d' },
        Customer: { bg:'#f1f5f9', text:'#475569' },
    }[biz.role] ?? { bg:'#f1f5f9', text:'#475569' };

    return (
        <button
            onClick={() => onSelect(biz)}
            style={{
                display:'flex', alignItems:'center', gap:'16px',
                padding:'18px 20px', background:'#fff',
                border:'1.5px solid #e2e8f0', borderRadius:'14px',
                cursor:'pointer', width:'100%', textAlign:'left',
                transition:'all .2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor='#a5b4fc'; e.currentTarget.style.boxShadow='0 4px 16px rgba(99,102,241,.1)'; e.currentTarget.style.transform='translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor='#e2e8f0'; e.currentTarget.style.boxShadow='none'; e.currentTarget.style.transform='none'; }}
        >
            <div style={{ width:'44px', height:'44px', borderRadius:'12px', background:'#eef2ff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Building2 size={22} style={{ color:'#6366f1' }}/>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontWeight:700, fontSize:'15px', color:'#0f172a', marginBottom:'3px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {biz.businessName}
                </p>
                <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                    <span style={{ fontSize:'12px', fontFamily:'monospace', color:'#94a3b8', letterSpacing:'.05em' }}>
                        {biz.businessCode}
                    </span>
                    <span style={{ fontSize:'11px', fontWeight:600, padding:'2px 8px', borderRadius:'20px', background:roleColor.bg, color:roleColor.text }}>
                        {biz.role}
                    </span>
                </div>
            </div>
            <ChevronRight size={18} style={{ color:'#94a3b8', flexShrink:0 }}/>
        </button>
    );
}

// ── Join Business Modal ───────────────────────────────────────────────────────
function JoinModal({ onClose, onJoined, searchBusinesses, joinBusiness }) {
    const [query,    setQuery]    = useState('');
    const [results,  setResults]  = useState([]);
    const [codeInput, setCodeInput] = useState('');
    const [searching, setSearching] = useState(false);
    const [joining,  setJoining]  = useState(false);
    const [error,    setError]    = useState('');
    const [tab,      setTab]      = useState('search'); // 'search' | 'code'

    useEffect(() => {
        if (query.length < 2) { setResults([]); return; }
        const t = setTimeout(async () => {
            setSearching(true);
            try {
                const data = await searchBusinesses(query);
                setResults(data);
            } catch { /* ignore */ }
            finally { setSearching(false); }
        }, 300);
        return () => clearTimeout(t);
    }, [query]);

    async function handleJoinByCode() {
        if (!codeInput.trim()) return;
        setError('');
        setJoining(true);
        try {
            const data = await joinBusiness(codeInput.trim());
            onJoined(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setJoining(false);
        }
    }

    async function handleJoinFromSearch(biz) {
        setError('');
        setJoining(true);
        try {
            const data = await joinBusiness(biz.businessCode);
            onJoined(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setJoining(false);
        }
    }

    return (
        <div style={{
            position:'fixed', inset:0, background:'rgba(0,0,0,.5)',
            display:'flex', alignItems:'center', justifyContent:'center',
            zIndex:50, padding:'16px',
        }}>
            <div style={{
                background:'#fff', borderRadius:'20px', width:'100%', maxWidth:'440px',
                padding:'28px', boxShadow:'0 25px 60px rgba(0,0,0,.25)',
            }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px' }}>
                    <h3 style={{ fontSize:'18px', fontWeight:700, color:'#0f172a' }}>Find a Business</h3>
                    <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8' }}>
                        <X size={20}/>
                    </button>
                </div>

                {/* Tab toggle */}
                <div style={{ display:'flex', background:'#f1f5f9', borderRadius:'10px', padding:'4px', marginBottom:'20px' }}>
                    {[['search','Search by name'], ['code','Enter code']].map(([t, label]) => (
                        <button key={t} onClick={() => { setTab(t); setError(''); }} style={{
                            flex:1, padding:'8px', borderRadius:'7px', border:'none', cursor:'pointer',
                            fontSize:'13px', fontWeight:600, transition:'all .2s',
                            background: tab===t ? '#fff' : 'transparent',
                            color: tab===t ? '#6366f1' : '#64748b',
                            boxShadow: tab===t ? '0 1px 4px rgba(0,0,0,.1)' : 'none',
                        }}>{label}</button>
                    ))}
                </div>

                {error && (
                    <div style={{ background:'#fef2f2', border:'1.5px solid #fecaca', color:'#dc2626', borderRadius:'10px', padding:'10px 14px', fontSize:'13px', marginBottom:'16px' }}>
                        {error}
                    </div>
                )}

                {tab === 'search' && (
                    <div>
                        <div style={{ position:'relative', marginBottom:'12px' }}>
                            <Search size={16} style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', color:'#94a3b8' }}/>
                            <input
                                type="text"
                                placeholder="Search businesses..."
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                autoFocus
                                style={{
                                    width:'100%', padding:'10px 12px 10px 38px',
                                    border:'1.5px solid #e2e8f0', borderRadius:'10px',
                                    fontSize:'14px', outline:'none', boxSizing:'border-box',
                                }}
                                onFocus={e => e.target.style.borderColor='#6366f1'}
                                onBlur={e => e.target.style.borderColor='#e2e8f0'}
                            />
                        </div>

                        {searching && (
                            <div style={{ textAlign:'center', padding:'16px', color:'#94a3b8', fontSize:'13px' }}>
                                <Loader2 size={16} style={{ animation:'spin 1s linear infinite', display:'inline' }}/> Searching…
                            </div>
                        )}

                        {!searching && results.length === 0 && query.length >= 2 && (
                            <p style={{ textAlign:'center', padding:'16px', color:'#94a3b8', fontSize:'13px' }}>No businesses found</p>
                        )}

                        <div style={{ display:'flex', flexDirection:'column', gap:'8px', maxHeight:'220px', overflowY:'auto' }}>
                            {results.map(biz => (
                                <div key={biz.businessId} style={{
                                    display:'flex', alignItems:'center', justifyContent:'space-between',
                                    padding:'12px 14px', background:'#f8fafc', borderRadius:'10px',
                                    border:'1.5px solid #e2e8f0',
                                }}>
                                    <div>
                                        <p style={{ fontWeight:600, fontSize:'14px', color:'#0f172a', marginBottom:'2px' }}>{biz.businessName}</p>
                                        <p style={{ fontSize:'12px', color:'#94a3b8', fontFamily:'monospace' }}>{biz.businessCode}</p>
                                    </div>
                                    <button
                                        onClick={() => handleJoinFromSearch(biz)}
                                        disabled={joining}
                                        style={{
                                            background:'#6366f1', color:'#fff', border:'none',
                                            borderRadius:'8px', padding:'6px 14px', fontSize:'13px',
                                            fontWeight:600, cursor:'pointer', flexShrink:0,
                                        }}
                                    >
                                        {joining ? <Loader2 size={14} style={{ animation:'spin 1s linear infinite' }}/> : 'Join'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {tab === 'code' && (
                    <div>
                        <p style={{ fontSize:'13px', color:'#64748b', marginBottom:'12px' }}>
                            Enter the business code shared with you by the business owner.
                        </p>
                        <input
                            type="text"
                            placeholder="e.g. BM-A3K9P2X7"
                            value={codeInput}
                            onChange={e => setCodeInput(e.target.value.toUpperCase())}
                            autoFocus
                            style={{
                                width:'100%', padding:'11px 14px', border:'1.5px solid #e2e8f0',
                                borderRadius:'10px', fontSize:'16px', letterSpacing:'.1em',
                                fontFamily:'monospace', outline:'none', marginBottom:'14px',
                                boxSizing:'border-box', textTransform:'uppercase',
                            }}
                            onFocus={e => e.target.style.borderColor='#6366f1'}
                            onBlur={e => e.target.style.borderColor='#e2e8f0'}
                        />
                        <button
                            onClick={handleJoinByCode}
                            disabled={joining || !codeInput.trim()}
                            style={{
                                width:'100%', padding:'11px', borderRadius:'10px',
                                background: (!codeInput.trim()) ? '#e2e8f0' : 'linear-gradient(135deg,#6366f1,#4f46e5)',
                                color: (!codeInput.trim()) ? '#94a3b8' : '#fff',
                                border:'none', fontSize:'14px', fontWeight:600, cursor: codeInput.trim() ? 'pointer' : 'not-allowed',
                            }}
                        >
                            {joining ? (
                                <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
                                    <Loader2 size={14} style={{ animation:'spin 1s linear infinite' }}/> Joining…
                                </span>
                            ) : 'Join Business'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Business Detail View ──────────────────────────────────────────────────────
function BusinessDetail({ biz, token, onBack }) {
    const [tab,          setTab]         = useState('invoices');
    const [invoices,     setInvoices]    = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [loading,      setLoading]     = useState(false);

    useEffect(() => {
        async function load() {
            setLoading(true);
            try {
                if (tab === 'invoices') {
                    const res = await fetch(`${BASE}/portal/businesses/${biz.businessId}/invoices`, { headers: authHeaders(token) });
                    if (res.ok) setInvoices(await res.json());
                } else {
                    const res = await fetch(`${BASE}/portal/businesses/${biz.businessId}/appointments`, { headers: authHeaders(token) });
                    if (res.ok) setAppointments(await res.json());
                }
            } catch { /* ignore */ }
            finally { setLoading(false); }
        }
        load();
    }, [tab, biz.businessId]);

    const statusColor = {
        paid:   { bg:'#dcfce7', text:'#15803d' },
        unpaid: { bg:'#fef9c3', text:'#a16207' },
        draft:  { bg:'#f1f5f9', text:'#64748b' },
        overdue: { bg:'#fee2e2', text:'#dc2626' },
    };

    return (
        <div>
            <button onClick={onBack} style={{
                display:'flex', alignItems:'center', gap:'6px', background:'none',
                border:'none', cursor:'pointer', color:'#6366f1', fontWeight:600,
                fontSize:'14px', marginBottom:'20px', padding:'0',
            }}>
                <ArrowLeft size={16}/> All Businesses
            </button>

            <div style={{ display:'flex', alignItems:'center', gap:'14px', marginBottom:'24px' }}>
                <div style={{ width:'48px', height:'48px', borderRadius:'14px', background:'#eef2ff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <Building2 size={24} style={{ color:'#6366f1' }}/>
                </div>
                <div>
                    <h2 style={{ fontSize:'20px', fontWeight:700, color:'#0f172a', marginBottom:'2px' }}>{biz.businessName}</h2>
                    <span style={{ fontSize:'12px', fontFamily:'monospace', color:'#94a3b8' }}>{biz.businessCode}</span>
                </div>
            </div>

            {/* Tab bar */}
            <div style={{ display:'flex', gap:'4px', background:'#f1f5f9', padding:'4px', borderRadius:'10px', marginBottom:'20px' }}>
                {[
                    { id:'invoices', label:'Invoices', icon:FileText },
                    { id:'appointments', label:'Appointments', icon:Calendar },
                ].map(({ id, label, icon:Icon }) => (
                    <button key={id} onClick={() => setTab(id)} style={{
                        flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:'6px',
                        padding:'8px', borderRadius:'7px', border:'none', cursor:'pointer',
                        fontSize:'13px', fontWeight:600, transition:'all .2s',
                        background: tab===id ? '#fff' : 'transparent',
                        color: tab===id ? '#6366f1' : '#64748b',
                        boxShadow: tab===id ? '0 1px 4px rgba(0,0,0,.1)' : 'none',
                    }}>
                        <Icon size={14}/>{label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div style={{ textAlign:'center', padding:'40px', color:'#94a3b8' }}>
                    <Loader2 size={24} style={{ animation:'spin 1s linear infinite', display:'inline' }}/>
                </div>
            ) : (
                <>
                    {tab === 'invoices' && (
                        <div>
                            {invoices.length === 0 ? (
                                <div style={{ textAlign:'center', padding:'40px', color:'#94a3b8' }}>
                                    <FileText size={32} style={{ margin:'0 auto 10px', opacity:.3 }}/>
                                    <p style={{ fontSize:'14px' }}>No invoices yet</p>
                                </div>
                            ) : (
                                <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                                    {invoices.map(inv => {
                                        const sc = statusColor[inv.status] ?? statusColor.draft;
                                        return (
                                            <div key={inv.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px', background:'#fff', borderRadius:'12px', border:'1.5px solid #e2e8f0' }}>
                                                <div>
                                                    <p style={{ fontWeight:600, fontSize:'14px', color:'#0f172a', marginBottom:'3px' }}>#{inv.invoice_number}</p>
                                                    <p style={{ fontSize:'12px', color:'#94a3b8' }}>Due {new Date(inv.due_date).toLocaleDateString()}</p>
                                                </div>
                                                <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                                                    <p style={{ fontWeight:700, fontSize:'15px', color:'#0f172a' }}>${Number(inv.total_amount || 0).toFixed(2)}</p>
                                                    <span style={{ fontSize:'11px', fontWeight:600, padding:'3px 10px', borderRadius:'20px', background:sc.bg, color:sc.text, textTransform:'capitalize' }}>
                                                        {inv.status}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {tab === 'appointments' && (
                        <div>
                            {appointments.length === 0 ? (
                                <div style={{ textAlign:'center', padding:'40px', color:'#94a3b8' }}>
                                    <Calendar size={32} style={{ margin:'0 auto 10px', opacity:.3 }}/>
                                    <p style={{ fontSize:'14px' }}>No appointments yet</p>
                                </div>
                            ) : (
                                <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                                    {appointments.map(apt => (
                                        <div key={apt.id} style={{ padding:'14px 16px', background:'#fff', borderRadius:'12px', border:'1.5px solid #e2e8f0' }}>
                                            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'4px' }}>
                                                <p style={{ fontWeight:600, fontSize:'14px', color:'#0f172a' }}>{apt.title}</p>
                                                <span style={{ fontSize:'11px', fontWeight:600, padding:'3px 10px', borderRadius:'20px', background:'#eef2ff', color:'#6366f1', textTransform:'capitalize' }}>
                                                    {apt.status}
                                                </span>
                                            </div>
                                            <p style={{ fontSize:'12px', color:'#94a3b8' }}>
                                                {new Date(apt.appointment_date).toLocaleString()}
                                            </p>
                                            {apt.notes && <p style={{ fontSize:'13px', color:'#64748b', marginTop:'4px' }}>{apt.notes}</p>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

// ── Main Customer Portal ──────────────────────────────────────────────────────
export default function CustomerPortal() {
    const { user, memberships, logout, joinBusiness, searchBusinesses } = useAuth();
    const [bizList,    setBizList]    = useState(memberships ?? []);
    const [selected,   setSelected]   = useState(null);
    const [showJoin,   setShowJoin]   = useState(false);
    const [joinSuccess, setJoinSuccess] = useState('');

    // Sync with context memberships
    useEffect(() => { setBizList(memberships ?? []); }, [memberships]);

    function handleJoined(data) {
        setShowJoin(false);
        setJoinSuccess(`You've joined ${data.businessName}!`);
        setTimeout(() => setJoinSuccess(''), 3000);
    }

    return (
        <>
            <style>{`
                @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
                @keyframes fade-in { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
                .portal-root { min-height:100vh; background:#f8fafc; font-family:system-ui,sans-serif; }
            `}</style>

            <div className="portal-root">
                {/* Header */}
                <header style={{
                    background:'#fff', borderBottom:'1px solid #e2e8f0',
                    padding:'0 24px', height:'60px',
                    display:'flex', alignItems:'center', justifyContent:'space-between',
                    position:'sticky', top:0, zIndex:10,
                }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                        <h1 className="shimmer" style={{ fontSize:'20px', fontWeight:800 }}>BizMate</h1>
                        <span style={{ fontSize:'12px', background:'#eef2ff', color:'#6366f1', padding:'2px 8px', borderRadius:'20px', fontWeight:600 }}>
                            Customer Portal
                        </span>
                    </div>
                    <button
                        onClick={logout}
                        style={{
                            display:'flex', alignItems:'center', gap:'6px',
                            background:'none', border:'1.5px solid #e2e8f0',
                            borderRadius:'8px', padding:'6px 12px',
                            fontSize:'13px', color:'#64748b', cursor:'pointer',
                            fontWeight:500, transition:'all .2s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor='#f87171'; e.currentTarget.style.color='#dc2626'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor='#e2e8f0'; e.currentTarget.style.color='#64748b'; }}
                    >
                        <LogOut size={14}/> Sign Out
                    </button>
                </header>

                {/* Body */}
                <main style={{ maxWidth:'680px', margin:'0 auto', padding:'32px 24px' }}>

                    {joinSuccess && (
                        <div style={{
                            display:'flex', alignItems:'center', gap:'10px',
                            background:'#f0fdf4', border:'1.5px solid #bbf7d0',
                            color:'#15803d', borderRadius:'10px', padding:'12px 16px',
                            marginBottom:'20px', fontSize:'14px', fontWeight:500,
                            animation:'fade-in .3s ease',
                        }}>
                            <Check size={16}/> {joinSuccess}
                        </div>
                    )}

                    {!selected ? (
                        <>
                            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'24px' }}>
                                <div>
                                    <h2 style={{ fontSize:'22px', fontWeight:700, color:'#0f172a', marginBottom:'4px' }}>
                                        My Businesses
                                    </h2>
                                    <p style={{ fontSize:'14px', color:'#64748b' }}>
                                        {bizList.length === 0 ? 'Join a business to get started' : `Connected to ${bizList.length} business${bizList.length !== 1 ? 'es' : ''}`}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowJoin(true)}
                                    style={{
                                        display:'flex', alignItems:'center', gap:'6px',
                                        background:'linear-gradient(135deg,#6366f1,#4f46e5)',
                                        color:'#fff', border:'none', borderRadius:'10px',
                                        padding:'9px 16px', fontSize:'13px', fontWeight:600,
                                        cursor:'pointer', boxShadow:'0 4px 12px rgba(99,102,241,.3)',
                                        transition:'transform .15s, box-shadow .15s',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 6px 16px rgba(99,102,241,.4)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 4px 12px rgba(99,102,241,.3)'; }}
                                >
                                    <Plus size={15}/> Find a Business
                                </button>
                            </div>

                            {bizList.length === 0 ? (
                                <div style={{
                                    textAlign:'center', padding:'60px 24px',
                                    background:'#fff', borderRadius:'16px',
                                    border:'2px dashed #e2e8f0',
                                }}>
                                    <Building2 size={40} style={{ color:'#cbd5e1', margin:'0 auto 12px' }}/>
                                    <p style={{ fontSize:'16px', fontWeight:600, color:'#475569', marginBottom:'6px' }}>
                                        No businesses yet
                                    </p>
                                    <p style={{ fontSize:'14px', color:'#94a3b8', marginBottom:'20px' }}>
                                        Search for a business or enter a business code to connect
                                    </p>
                                    <button
                                        onClick={() => setShowJoin(true)}
                                        style={{
                                            background:'#eef2ff', color:'#6366f1', border:'none',
                                            borderRadius:'10px', padding:'10px 20px',
                                            fontSize:'14px', fontWeight:600, cursor:'pointer',
                                        }}
                                    >
                                        Find a Business
                                    </button>
                                </div>
                            ) : (
                                <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                                    {bizList.map(biz => (
                                        <BusinessCard key={biz.businessId} biz={biz} onSelect={setSelected}/>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <BusinessDetail
                            biz={selected}
                            token={null}
                            onBack={() => setSelected(null)}
                        />
                    )}
                </main>
            </div>

            {showJoin && (
                <JoinModal
                    onClose={() => setShowJoin(false)}
                    onJoined={handleJoined}
                    searchBusinesses={searchBusinesses}
                    joinBusiness={joinBusiness}
                />
            )}
        </>
    );
}
