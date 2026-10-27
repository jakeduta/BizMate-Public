import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { Tax } from "@/api/dbClient";
import { Receipt, RefreshCw, AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

class TabErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidUpdate(prevProps) {
    if (prevProps.tabKey !== this.props.tabKey) {
      this.setState({ hasError: false, error: null });
    }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-8 text-center">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-3" />
          <p className="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">This tab encountered an error</p>
          <p className="text-xs text-red-600 dark:text-red-400 font-mono">{this.state.error?.message}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
            This may be caused by a missing database table. Ensure you have run{" "}
            <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">tax_schema.sql</code> and{" "}
            <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">tax_schema_v2.sql</code>.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Phase 1 components ──────────────────────────────────────────────────────
import TaxDashboardCards    from "@/components/tax/TaxDashboardCards";
import TaxProfilePanel      from "@/components/tax/TaxProfilePanel";
import TaxInsightsPanel     from "@/components/tax/TaxInsightsPanel";
import TaxDeadlinesPanel    from "@/components/tax/TaxDeadlinesPanel";
import TaxAlertsPanel       from "@/components/tax/TaxAlertsPanel";
import TaxReadinessScore    from "@/components/tax/TaxReadinessScore";
import TaxDataSyncPanel     from "@/components/tax/TaxDataSyncPanel";
import TaxManualEntryPanel  from "@/components/tax/TaxManualEntryPanel";
import TaxEstimatesPanel    from "@/components/tax/TaxEstimatesPanel";
import TaxSalesTaxPanel     from "@/components/tax/TaxSalesTaxPanel";
import TaxPayrollPanel      from "@/components/tax/TaxPayrollPanel";
import TaxContractorPanel   from "@/components/tax/TaxContractorPanel";
import TaxReportsPanel      from "@/components/tax/TaxReportsPanel";

// ── Phase 2 components ──────────────────────────────────────────────────────
import TaxFormReadinessPanel from "@/components/tax/TaxFormReadinessPanel";
import TaxDocumentCenter     from "@/components/tax/TaxDocumentCenter";
import TaxPaymentTracker     from "@/components/tax/TaxPaymentTracker";
import TaxComplianceSetup    from "@/components/tax/TaxComplianceSetup";
import TaxBookAdjustments    from "@/components/tax/TaxBookAdjustments";
import TaxEntityPanel        from "@/components/tax/TaxEntityPanel";
import TaxLocalTaxPanel      from "@/components/tax/TaxLocalTaxPanel";
import TaxWorkflowPanel      from "@/components/tax/TaxWorkflowPanel";
import TaxHelpPanel          from "@/components/tax/TaxHelpPanel";

const ALLOWED_ROLES = ["Admin", "Manager"];

const TAX_YEAR = new Date().getFullYear();

const TABS = [
  { id: "overview",    label: "Overview"        },
  { id: "estimates",   label: "Estimates"       },
  { id: "expenses",    label: "Expenses"        },
  { id: "payroll",     label: "Payroll"         },
  { id: "sales",       label: "Sales Tax"       },
  { id: "contractors", label: "1099"            },
  { id: "forms",       label: "Forms & Filing"  },
  { id: "documents",   label: "Documents"       },
  { id: "payments",    label: "Payments"        },
  { id: "compliance",  label: "Compliance"      },
  { id: "advanced",    label: "Advanced"        },
  { id: "workflow",    label: "Workflow"        },
  { id: "reports",     label: "Reports"         },
  { id: "profile",     label: "Tax Profile"     },
  { id: "help",        label: "Help"            },
];

export default function TaxIntegration() {
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab]     = useState("overview");
  const [selectedYear, setSelectedYear] = useState(TAX_YEAR);

  // ── Access control ─────────────────────────────────────────────────────────
  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-screen">
        <Receipt className="w-10 h-10 text-gray-400 mb-4" />
        <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">Access Denied</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Tax Integration is only available to Admins and Managers.
        </p>
        <Button onClick={() => navigate("/Dashboard")} className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white">
          Back to Dashboard
        </Button>
      </div>
    );
  }

  // ── Data fetching ──────────────────────────────────────────────────────────
  const { data: dashboard, isLoading, isError, refetch } = useQuery({
    queryKey: ["tax-dashboard", selectedYear],
    queryFn: () => Tax.getDashboard(selectedYear),
    retry: 1,
  });

  const { data: profile } = useQuery({
    queryKey: ["tax-profile"],
    queryFn: () => Tax.getProfile(),
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries(["tax-dashboard"]);
    queryClient.invalidateQueries(["tax-manual-entries"]);
    queryClient.invalidateQueries(["tax-contractors"]);
    queryClient.invalidateQueries(["tax-sales-summaries"]);
    queryClient.invalidateQueries(["tax-forms"]);
    queryClient.invalidateQueries(["tax-documents"]);
    queryClient.invalidateQueries(["tax-payments"]);
    queryClient.invalidateQueries(["tax-compliance"]);
    queryClient.invalidateQueries(["tax-book-adjustments"]);
    queryClient.invalidateQueries(["tax-entity-details"]);
    queryClient.invalidateQueries(["tax-local-config"]);
    queryClient.invalidateQueries(["tax-workflow"]);
    toast.success("Tax data refreshed.");
  };

  // ── Page header ─────────────────────────────────────────────────────────────
  const Header = () => (
    <div className="flex flex-col gap-4 mb-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-900/40">
            <Receipt className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Tax Integration</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Small-business tax preparation &amp; compliance center
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(parseInt(e.target.value))}
            className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 px-3 py-1.5"
          >
            {[2023, 2024, 2025, 2026].map(y => (
              <option key={y} value={y}>Tax Year {y}</option>
            ))}
          </select>

          <Button variant="outline" onClick={handleRefresh} className="flex items-center gap-2 text-sm">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
        <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-700 dark:text-amber-300">
          <strong>Disclaimer:</strong> All tax estimates, deadlines, and insights are for informational and preparation
          purposes only. They do not constitute legal or tax advice. Tax laws vary and change annually. Always verify
          figures and consult a licensed CPA or tax attorney before filing.
        </p>
      </div>
    </div>
  );

  // ── Sub-navigation ──────────────────────────────────────────────────────────
  const SubNav = () => (
    <div className="flex gap-1 overflow-x-auto pb-1 mb-6 border-b border-gray-200 dark:border-gray-700">
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`
            px-4 py-2 text-sm font-medium rounded-t-lg whitespace-nowrap transition-colors
            ${activeTab === tab.id
              ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 -mb-px bg-white dark:bg-gray-900"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }
          `}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="p-8">
        <Header />
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">Loading tax dashboard...</p>
            <p className="text-xs text-gray-400 mt-1">Syncing data from all BizMate modules</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Error / graceful degradation ────────────────────────────────────────────
  if (isError || !dashboard) {
    return (
      <div className="p-8">
        <Header />
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-8 text-center">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <p className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Tax data unavailable</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Could not load tax dashboard. This may be because the tax database tables haven't been created yet.
            Run the tax schema migration (<code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">backend/database/tax_schema.sql</code>)
            and (<code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">backend/database/tax_schema_v2.sql</code>) to initialize.
          </p>
          <Button onClick={() => refetch()} variant="outline" className="flex items-center gap-2 mx-auto">
            <RefreshCw className="w-4 h-4" /> Retry
          </Button>
        </div>
        <div className="mt-6">
          <TaxProfilePanel profile={profile} />
        </div>
      </div>
    );
  }

  const mergedProfile = dashboard?.profile || profile || null;

  // ── Tab content ─────────────────────────────────────────────────────────────
  const renderTab = () => {
    switch (activeTab) {

      case "overview":
        return (
          <div className="space-y-6">
            <TaxDashboardCards data={dashboard} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TaxInsightsPanel insights={dashboard?.insights} />
              <div className="space-y-6">
                <TaxDeadlinesPanel deadlines={dashboard?.deadlines} />
                <TaxAlertsPanel alerts={dashboard?.alerts} />
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TaxReadinessScore readinessScore={dashboard?.readinessScore} />
              <TaxDataSyncPanel data={dashboard} />
            </div>
          </div>
        );

      case "estimates":
        return (
          <div className="space-y-6">
            <TaxEstimatesPanel data={dashboard} />
          </div>
        );

      case "expenses":
        return (
          <div className="space-y-6">
            <TaxManualEntryPanel taxYear={selectedYear} />
          </div>
        );

      case "payroll":
        return (
          <div className="space-y-6">
            <TaxPayrollPanel data={dashboard} profile={mergedProfile} />
          </div>
        );

      case "sales":
        return (
          <div className="space-y-6">
            <TaxSalesTaxPanel data={dashboard} taxYear={selectedYear} profile={mergedProfile} />
          </div>
        );

      case "contractors":
        return (
          <div className="space-y-6">
            <TaxContractorPanel taxYear={selectedYear} />
          </div>
        );

      case "forms":
        return (
          <div className="space-y-6">
            <TaxFormReadinessPanel taxYear={selectedYear} profile={mergedProfile} dashboard={dashboard} />
          </div>
        );

      case "documents":
        return (
          <div className="space-y-6">
            <TaxDocumentCenter />
          </div>
        );

      case "payments":
        return (
          <div className="space-y-6">
            <TaxPaymentTracker taxYear={selectedYear} />
          </div>
        );

      case "compliance":
        return (
          <div className="space-y-6">
            <TaxComplianceSetup />
            <TaxLocalTaxPanel />
          </div>
        );

      case "advanced":
        return (
          <div className="space-y-6">
            <TaxEntityPanel taxYear={selectedYear} profile={mergedProfile} />
            <TaxBookAdjustments taxYear={selectedYear} />
          </div>
        );

      case "workflow":
        return (
          <div className="space-y-6">
            <TaxWorkflowPanel taxYear={selectedYear} />
          </div>
        );

      case "reports":
        return (
          <div className="space-y-6">
            <TaxReportsPanel data={dashboard} taxYear={selectedYear} />
          </div>
        );

      case "profile":
        return (
          <div className="space-y-6">
            <TaxProfilePanel profile={mergedProfile} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TaxReadinessScore readinessScore={dashboard?.readinessScore} />
              <TaxAlertsPanel alerts={dashboard?.alerts} />
            </div>
          </div>
        );

      case "help":
        return (
          <div className="space-y-6">
            <TaxHelpPanel />
          </div>
        );

      default:
        return null;
    }
  };

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <div className="p-8">
      <Header />
      <SubNav />
      <TabErrorBoundary tabKey={activeTab}>
        {renderTab()}
      </TabErrorBoundary>
    </div>
  );
}
