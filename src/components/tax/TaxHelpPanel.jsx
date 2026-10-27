import React, { useState } from "react";
import { HelpCircle, ChevronDown, ChevronRight, BookOpen, AlertTriangle, User, Building2, Calculator, FileText } from "lucide-react";

const TERM_CATEGORIES = [
  {
    id: "basics",
    label: "Tax Basics",
    icon: BookOpen,
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    border: "border-blue-200 dark:border-blue-800",
    terms: [
      {
        term: "Taxable Income",
        definition: "Your total revenue minus allowable deductions. This is what your tax bracket rate is actually applied to — not your gross revenue.",
        why: "Reducing taxable income through legitimate deductions is one of the most effective ways to lower your tax bill legally.",
      },
      {
        term: "Net Income (Profit)",
        definition: "Revenue minus all business expenses. For sole proprietors and single-member LLCs, this flows directly to your personal return.",
        why: "Self-employment tax and income tax are both calculated on net income, so tracking every deductible expense matters.",
      },
      {
        term: "Gross Revenue",
        definition: "The total of all invoices and payments received before any deductions. This is different from taxable income.",
        why: "Gross revenue may trigger certain thresholds (e.g., sales tax nexus, estimated tax obligations) even if your net profit is low.",
      },
      {
        term: "Estimated Tax",
        definition: "Quarterly tax payments made throughout the year to avoid underpayment penalties. Due in April, June, September, and January.",
        why: "The IRS expects taxes to be paid as you earn. If you wait until April, you may owe a penalty even if you pay in full.",
      },
      {
        term: "Tax Year",
        definition: "The 12-month period for which you report income. Most small businesses use the calendar year (Jan 1 – Dec 31).",
        why: "Everything in BizMate is organized by tax year so your records, deductions, and payments align for filing.",
      },
    ],
  },
  {
    id: "entity",
    label: "Entity Types",
    icon: Building2,
    color: "text-purple-500",
    bg: "bg-purple-50 dark:bg-purple-900/20",
    border: "border-purple-200 dark:border-purple-800",
    terms: [
      {
        term: "Sole Proprietor",
        definition: "A one-owner business with no separate legal entity. All income and expenses reported on Schedule C. Self-employment tax applies.",
        why: "Simplest structure but owner has unlimited personal liability. No payroll for owner — profits are subject to SE tax.",
      },
      {
        term: "Single-Member LLC",
        definition: "Treated like a sole proprietor for tax purposes by default (disregarded entity). Files Schedule C.",
        why: "Provides liability protection without changing the default tax treatment. Can elect S-Corp taxation for potential SE tax savings.",
      },
      {
        term: "S-Corporation",
        definition: "Pass-through entity where income flows to shareholders' personal returns. Owner must take a 'reasonable salary' subject to payroll taxes.",
        why: "Distributions above the required salary are not subject to SE/FICA taxes, which can create significant savings at higher income levels.",
      },
      {
        term: "C-Corporation",
        definition: "A separate taxable entity with a flat 21% federal corporate rate. Does not pass income to owners for personal tax until distributed as dividends.",
        why: "Dividends are taxed again at the shareholder level (double taxation). Best for businesses retaining profits or raising investment.",
      },
      {
        term: "Partnership",
        definition: "Two or more owners with income reported on Form 1065. Each partner receives a K-1 showing their share of income, losses, and deductions.",
        why: "Partnership income is taxable to each partner personally whether or not it is distributed. Basis tracking is critical.",
      },
    ],
  },
  {
    id: "selfEmployment",
    label: "Self-Employment Tax",
    icon: User,
    color: "text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    border: "border-amber-200 dark:border-amber-800",
    terms: [
      {
        term: "SE Tax (Self-Employment Tax)",
        definition: "The 15.3% tax (12.4% Social Security + 2.9% Medicare) paid by self-employed individuals on net earnings. Applied to 92.35% of net income.",
        why: "This replaces the FICA taxes an employer would withhold. It can be a surprise for new business owners who only think about income tax.",
      },
      {
        term: "Half SE Tax Deduction",
        definition: "You can deduct 50% of your SE tax when calculating your taxable income on your personal return (above-the-line deduction).",
        why: "This partially offsets the SE tax burden and is automatically calculated by BizMate in the estimates panel.",
      },
      {
        term: "QBI Deduction (Section 199A)",
        definition: "Eligible self-employed individuals and pass-through businesses may deduct up to 20% of qualified business income.",
        why: "This can significantly reduce taxable income. Subject to phase-outs at higher income levels and limitations for certain service businesses.",
      },
      {
        term: "FICA Taxes",
        definition: "Federal Insurance Contributions Act taxes — Social Security (6.2%) and Medicare (1.45%) split equally between employer and employee.",
        why: "If you have employees, you match their FICA contributions. This is tracked in the Payroll tab and reported quarterly on Form 941.",
      },
    ],
  },
  {
    id: "deductions",
    label: "Deductions & Credits",
    icon: Calculator,
    color: "text-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    border: "border-emerald-200 dark:border-emerald-800",
    terms: [
      {
        term: "Above-the-Line Deductions",
        definition: "Deductions subtracted from gross income before calculating AGI (Adjusted Gross Income). Examples: SE tax deduction, self-employed health insurance.",
        why: "These reduce your AGI, which affects eligibility for other deductions and credits — more valuable than itemized deductions.",
      },
      {
        term: "Section 179 Expensing",
        definition: "Allows businesses to deduct the full cost of qualifying equipment and property in the year of purchase rather than depreciating it over time.",
        why: "Front-loads the deduction to the current year. Reduces taxable income now but creates a book-to-tax difference tracked in the Adjustments panel.",
      },
      {
        term: "Bonus Depreciation",
        definition: "Allows an additional first-year depreciation deduction for qualifying property placed in service. Rules change annually.",
        why: "Like Sec. 179, it accelerates deductions. Check current-year rules with your CPA — the percentage phases down after 2022.",
      },
      {
        term: "Home Office Deduction",
        definition: "A portion of home expenses (rent, utilities, internet) may be deductible if you use part of your home exclusively and regularly for business.",
        why: "Must meet the 'exclusive use' test. Often calculated as the percentage of home square footage used for business.",
      },
      {
        term: "Meals Deduction",
        definition: "Business meals are generally 50% deductible. The meal must have a clear business purpose — entertainment is not deductible.",
        why: "The 50% limitation is a common book-to-tax adjustment. Track all meals separately from entertainment expenses.",
      },
    ],
  },
  {
    id: "forms",
    label: "Key Tax Forms",
    icon: FileText,
    color: "text-indigo-500",
    bg: "bg-indigo-50 dark:bg-indigo-900/20",
    border: "border-indigo-200 dark:border-indigo-800",
    terms: [
      {
        term: "Schedule C",
        definition: "The IRS form where sole proprietors and single-member LLCs report business income and expenses. Filed with Form 1040.",
        why: "The foundation of most small business tax returns. Every category in BizMate's expense tracker maps to a Schedule C line.",
      },
      {
        term: "Form 1040-ES",
        definition: "Used to calculate and pay quarterly estimated taxes. Includes a worksheet to estimate income and tax liability.",
        why: "File and pay four times a year to avoid underpayment penalties. BizMate's Estimates panel shows the quarterly breakdown.",
      },
      {
        term: "Form 941",
        definition: "Employer's Quarterly Federal Tax Return — reports wages paid and payroll taxes withheld and matched.",
        why: "Required if you have employees. Filed four times a year with the IRS. Supported by payroll records in BizMate.",
      },
      {
        term: "Form 1099-NEC",
        definition: "Reports payments of $600 or more made to non-employee contractors during the year. Due to contractors by Jan 31.",
        why: "Failing to file 1099s can result in penalties. BizMate's 1099 tracker flags contractors who exceed the $600 threshold.",
      },
      {
        term: "W-9",
        definition: "A form contractors complete to provide their TIN (Tax Identification Number) and certify their tax status.",
        why: "Collect a W-9 before paying any contractor. Without it, you may be required to withhold 24% backup withholding.",
      },
      {
        term: "Form K-1",
        definition: "Reports each partner's or shareholder's share of income, deductions, and credits from a partnership, S-Corp, or trust.",
        why: "Partners and S-Corp shareholders report K-1 amounts on their personal returns. Tracked in BizMate's Entity panel.",
      },
    ],
  },
];

const ONBOARDING_STEPS = [
  { step: 1, title: "Set Your Tax Profile", desc: "Go to Tax Profile and select your entity type, home state, and enable the modules that apply to your business.", tab: "Tax Profile" },
  { step: 2, title: "Review Income & Expenses", desc: "Check the Overview dashboard to see your synced revenue and add any manual expense entries not captured from invoices.", tab: "Overview" },
  { step: 3, title: "Check Quarterly Estimates", desc: "See how much you may owe in federal and state taxes. Review the quarterly payment schedule.", tab: "Estimates" },
  { step: 4, title: "Track Contractors", desc: "If you've paid contractors $600+, add them to the 1099 tracker and collect their W-9s.", tab: "1099 / Contractors" },
  { step: 5, title: "Review Sales Tax (if applicable)", desc: "Enable sales tax in your profile and verify collected amounts by period.", tab: "Sales Tax" },
  { step: 6, title: "Track Tax Payments", desc: "Log estimated tax payments and other remittances in the Payments ledger.", tab: "Payments" },
  { step: 7, title: "Assemble Your Tax Package", desc: "Once records are complete, run the year-end report and transition the workflow to Needs Review.", tab: "Reports / Workflow" },
];

function TermCard({ term, definition, why }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-100 dark:border-gray-800 rounded-lg overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{term}</span>
        {open ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2 bg-gray-50 dark:bg-gray-800/30">
          <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{definition}</p>
          <div className="flex gap-2 pt-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-300 italic leading-relaxed">{why}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function CategorySection({ cat, isOpen, onToggle }) {
  const Icon = cat.icon;
  return (
    <div className={`rounded-xl border ${cat.border} overflow-hidden`}>
      <button onClick={onToggle}
        className={`w-full flex items-center justify-between px-5 py-4 text-left ${cat.bg} transition-colors`}>
        <div className="flex items-center gap-3">
          <Icon className={`w-4 h-4 ${cat.color}`} />
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{cat.label}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">({cat.terms.length} terms)</span>
        </div>
        {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
      </button>
      {isOpen && (
        <div className="p-4 space-y-2 bg-white dark:bg-gray-900">
          {cat.terms.map(t => <TermCard key={t.term} {...t} />)}
        </div>
      )}
    </div>
  );
}

export default function TaxHelpPanel() {
  const [openCategory, setOpenCategory] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(true);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/40">
            <HelpCircle className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Tax Knowledge & Help</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Definitions, guidance, and CPA reminders</p>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="px-5 py-4">
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <div className="flex gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                <strong>Not tax advice.</strong> BizMate is a record-keeping and estimation tool, not a tax filing
                service. The information below is educational. Always consult a licensed CPA or enrolled agent
                before making tax decisions.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Onboarding guide */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
        <button onClick={() => setShowOnboarding(o => !o)}
          className="w-full flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Getting Started — Tax Readiness Walkthrough</span>
          </div>
          {showOnboarding ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        </button>
        {showOnboarding && (
          <div className="p-5">
            <div className="space-y-3">
              {ONBOARDING_STEPS.map(s => (
                <div key={s.step} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0">
                    {s.step}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{s.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.desc}</p>
                    <span className="inline-block mt-1 text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded">
                      → {s.tab}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* CPA checklist */}
      <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/10 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Items to Discuss with Your CPA</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            "Correct entity type for your situation",
            "Optimal salary vs. distribution split (S-Corp)",
            "QBI deduction eligibility and phase-outs",
            "State nexus and multi-state filing obligations",
            "Section 179 and bonus depreciation strategy",
            "Retirement plan contributions (SEP-IRA, Solo 401k)",
            "Health insurance deductibility",
            "Home office deduction qualification",
            "Estimated tax payment accuracy",
            "Book-to-tax adjustment review",
          ].map(item => (
            <div key={item} className="flex items-start gap-2 text-xs text-emerald-700 dark:text-emerald-300">
              <ChevronRight className="w-3 h-3 shrink-0 mt-0.5" />{item}
            </div>
          ))}
        </div>
      </div>

      {/* Term categories */}
      <div className="space-y-3">
        {TERM_CATEGORIES.map(cat => (
          <CategorySection key={cat.id} cat={cat}
            isOpen={openCategory === cat.id}
            onToggle={() => setOpenCategory(o => o === cat.id ? null : cat.id)} />
        ))}
      </div>

      <p className="text-xs text-gray-400 italic text-center pb-2">
        Tax laws change annually. Always verify current rules with the IRS website or your licensed tax professional.
      </p>
    </div>
  );
}
