import { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import Layout            from "./Layout.jsx";
import Dashboard         from "./Dashboard";
import Invoices          from "./Invoices";
import Payments          from "./Payments";
import Employees         from "./Employees";
import ClockIns          from "./ClockIns";
import Appointments      from "./Appointments";
import Customers         from "./Customers";
import Settings          from "./Settings";
import Login             from "./Login";
import Register          from "./Register";
import WorkspaceCustomize from "./WorkspaceCustomize";
import CustomModule      from "./CustomModule";
import Members           from "./Members";
import CustomerPortal    from "./CustomerPortal";
import BusinessSelector  from "./BusinessSelector";
import TaxIntegration   from "./TaxIntegration";
import Analytics        from "./Analytics";

import { useAuth }               from "@/context/AuthContext";
import { WorkspaceProvider }     from "@/context/WorkspaceContext";
import { PermissionsProvider }   from "@/context/PermissionsContext";
import Services from "./Services";

// Paths that don't require authentication
const PUBLIC_PATHS = ['/login', '/register'];

const PAGES = {
    Dashboard, Invoices, Payments, Employees,
    ClockIns, Appointments, Customers, Settings, Services,
};

function _getCurrentPage(url) {
    if (url.endsWith('/')) url = url.slice(0, -1);
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) urlLastPart = urlLastPart.split('?')[0];
    return Object.keys(PAGES).find(
        page => page.toLowerCase() === urlLastPart.toLowerCase()
    ) || Object.keys(PAGES)[0];
}

function PagesContent() {
    const { user, memberships, loading } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const isPublic  = PUBLIC_PATHS.includes(location.pathname);
    const isPortal  = location.pathname === '/portal';
    const isSelect  = location.pathname === '/select-business';

    useEffect(() => {
        if (loading) return;

        if (!user && !isPublic) {
            // Not logged in → login page
            navigate('/login', { replace: true, state: { from: location } });
            return;
        }

        if (user && isPublic) {
            // Already logged in, hitting /login or /register
            if (!user.businessId) {
                navigate(memberships.length > 1 ? '/select-business' : '/portal', { replace: true });
            } else {
                navigate('/Dashboard', { replace: true });
            }
            return;
        }

        if (user && !user.businessId && !isPortal && !isSelect && !isPublic) {
            // Logged in but no business → portal or selector
            navigate(memberships.length > 1 ? '/select-business' : '/portal', { replace: true });
            return;
        }
    }, [user, loading, isPublic, isPortal, isSelect]);

    // ── Loading spinner ────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-white shimmer mb-3">BizMate</h1>
                    <Loader2 className="w-6 h-6 text-white animate-spin mx-auto"/>
                </div>
            </div>
        );
    }

    // ── Public routes ──────────────────────────────────────────────────────────
    if (isPublic) {
        return (
            <Routes>
                <Route path="/login"    element={<Login />}/>
                <Route path="/register" element={<Register />}/>
            </Routes>
        );
    }

    // ── No user ────────────────────────────────────────────────────────────────
    if (!user) return null;

    // ── Customer portal ────────────────────────────────────────────────────────
    if (isPortal) return <CustomerPortal/>;

    // ── Business selector ──────────────────────────────────────────────────────
    if (isSelect) return <BusinessSelector/>;

    // ── No business scoped yet ─────────────────────────────────────────────────
    if (!user.businessId) return null;

    const currentPage = _getCurrentPage(location.pathname);

    return (
        <PermissionsProvider>
            <WorkspaceProvider>
                <Layout currentPageName={currentPage}>
                    <Routes>
                        <Route path="/"             element={<Dashboard />}/>
                        <Route path="/Dashboard"    element={<Dashboard />}/>
                        <Route path="/Invoices"     element={<Invoices />}/>
                        <Route path="/Payments"     element={<Payments />}/>
                        <Route path="/Employees"    element={<Employees />}/>
                        <Route path="/ClockIns"     element={<ClockIns />}/>
                        <Route path="/Appointments" element={<Appointments />}/>
                        <Route path="/Customers"    element={<Customers />}/>
                        <Route path="/Services"     element={<Services />}/>
                        <Route path="/Settings"     element={<Settings />}/>
                        <Route path="/Workspace"    element={<WorkspaceCustomize />}/>
                        <Route path="/Members"         element={<Members />}/>
                        <Route path="/TaxIntegration" element={<TaxIntegration />}/>
                        <Route path="/Analytics"      element={<Analytics />}/>
                        <Route path="/module/:slug"   element={<CustomModule />}/>
                    </Routes>
                </Layout>
            </WorkspaceProvider>
        </PermissionsProvider>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}
