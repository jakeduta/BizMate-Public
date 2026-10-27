import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Building2, LogOut, ChevronRight } from 'lucide-react';

const ROLE_BADGE = {
    Admin:    { bg:'#f3e8ff', text:'#7c3aed' },
    Manager:  { bg:'#dbeafe', text:'#1d4ed8' },
    Employee: { bg:'#dcfce7', text:'#15803d' },
    Customer: { bg:'#f1f5f9', text:'#475569' },
};

export default function BusinessSelector() {
    const { memberships, switchBusiness, logout } = useAuth();
    const navigate = useNavigate();

    async function handleSelect(biz) {
        try {
            await switchBusiness(biz.businessId);
            navigate('/Dashboard', { replace: true });
        } catch (err) {
            console.error('Failed to switch business:', err);
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
                @keyframes gradient-shift {
                    0%,100% { background-position: 0% 50%; }
                    50%     { background-position: 100% 50%; }
                }
                @keyframes fade-up {
                    from { opacity:0; transform:translateY(24px); }
                    to   { opacity:1; transform:translateY(0); }
                }
                .selector-bg {
                    background: linear-gradient(-45deg,#0f172a,#1e1b4b,#0f172a,#0c1a3a);
                    background-size: 400% 400%;
                    animation: gradient-shift 14s ease infinite;
                }
                .blob { position:absolute; border-radius:50%; filter:blur(80px); opacity:.25; pointer-events:none; }
                .blob-1 { width:520px;height:520px; background:#4f46e5; top:-120px; left:-140px; animation:blob-drift-1 18s ease-in-out infinite; }
                .blob-2 { width:400px;height:400px; background:#7c3aed; bottom:-80px; right:-100px; animation:blob-drift-2 22s ease-in-out infinite; }
                .fade-up { opacity:0; animation: fade-up .6s ease forwards; animation-delay:.1s; }
                .biz-row {
                    display:flex; align-items:center; gap:14px;
                    padding:16px 18px; background:#fff;
                    border:1.5px solid #e2e8f0; border-radius:14px;
                    cursor:pointer; width:100%; text-align:left;
                    transition:all .2s;
                }
                .biz-row:hover {
                    border-color:#a5b4fc;
                    box-shadow:0 4px 16px rgba(99,102,241,.12);
                    transform:translateY(-1px);
                }
            `}</style>

            <div className="selector-bg min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
                <div className="blob blob-1"/><div className="blob blob-2"/>

                <div className="fade-up relative z-10 w-full max-w-md">
                    <div style={{ textAlign:'center', marginBottom:'28px' }}>
                        <h1 className="shimmer" style={{ fontSize:'44px', fontWeight:700, color:'#fff', letterSpacing:'-.02em' }}>BizMate</h1>
                        <p style={{ fontSize:'14px', color:'#94a3b8', marginTop:'4px' }}>Select a workspace</p>
                    </div>

                    <div style={{
                        background:'rgba(255,255,255,0.97)', borderRadius:'20px',
                        padding:'32px', boxShadow:'0 25px 60px rgba(0,0,0,.35)',
                    }}>
                        <h2 style={{ fontSize:'20px', fontWeight:700, color:'#0f172a', marginBottom:'6px' }}>
                            Choose a Workspace
                        </h2>
                        <p style={{ fontSize:'14px', color:'#64748b', marginBottom:'24px' }}>
                            You belong to multiple businesses. Select one to continue.
                        </p>

                        <div style={{ display:'flex', flexDirection:'column', gap:'10px', marginBottom:'24px' }}>
                            {memberships.map(biz => {
                                const badge = ROLE_BADGE[biz.role] ?? ROLE_BADGE.Customer;
                                return (
                                    <button key={biz.businessId} className="biz-row" onClick={() => handleSelect(biz)}>
                                        <div style={{ width:'42px', height:'42px', borderRadius:'12px', background:'#eef2ff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                                            <Building2 size={20} style={{ color:'#6366f1' }}/>
                                        </div>
                                        <div style={{ flex:1, minWidth:0 }}>
                                            <p style={{ fontWeight:700, fontSize:'15px', color:'#0f172a', marginBottom:'3px' }}>{biz.businessName}</p>
                                            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                                                <span style={{ fontSize:'12px', fontFamily:'monospace', color:'#94a3b8' }}>{biz.businessCode}</span>
                                                <span style={{ fontSize:'11px', fontWeight:600, padding:'2px 8px', borderRadius:'20px', background:badge.bg, color:badge.text }}>
                                                    {biz.role}
                                                </span>
                                            </div>
                                        </div>
                                        <ChevronRight size={18} style={{ color:'#94a3b8', flexShrink:0 }}/>
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={logout}
                            style={{
                                display:'flex', alignItems:'center', justifyContent:'center', gap:'6px',
                                width:'100%', padding:'11px', borderRadius:'10px',
                                background:'#f1f5f9', color:'#475569', border:'none',
                                fontSize:'14px', fontWeight:600, cursor:'pointer',
                                transition:'all .2s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background='#fee2e2'; e.currentTarget.style.color='#dc2626'; }}
                            onMouseLeave={e => { e.currentTarget.style.background='#f1f5f9'; e.currentTarget.style.color='#475569'; }}
                        >
                            <LogOut size={15}/> Sign Out
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
