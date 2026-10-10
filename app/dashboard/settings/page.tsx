'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Save, Bell, CreditCard, Building2, Globe,
  Phone, Mail, Shield, User, ChevronRight,
  Check, AlertTriangle, Eye, EyeOff, Plus, X,
  Wifi, WifiOff, Clock, Trash2,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Settings {
  platformName: string;
  supportPhone: string;
  supportWhatsApp: string;
  supportEmail: string;
  playStoreUrl: string;
  trialDays: number;
  currency: string;
  timezone: string;
  language: string;
  primaryColor: string;
  companyAddress: string;
  upiId: string;
  upiName: string;
  companyName: string;
  gstin: string;
}

interface Plan {
  id: string;
  name: string;
  flatsLabel: string;
  price: number;
  annualPrice: number;
  color: string;
  popular: boolean;
  features: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: Settings = {
  platformName: 'Nivasi',
  supportPhone: '',
  supportWhatsApp: '',
  supportEmail: '',
  playStoreUrl: '',
  trialDays: 30,
  currency: 'INR',
  timezone: 'Asia/Kolkata',
  language: 'en',
  primaryColor: '#1565C0',
  companyAddress: '',
  upiId: '',
  upiName: '',
  companyName: '',
  gstin: '',
};

const DEFAULT_PLANS: Plan[] = [
  {
    id: 'STARTER', name: 'Starter', flatsLabel: 'Up to 50 flats',
    price: 499, annualPrice: 4990, color: 'blue', popular: false,
    features: ['Maintenance billing', 'Notice board', 'Visitor log', 'Complaint tracking'],
  },
  {
    id: 'STANDARD', name: 'Standard', flatsLabel: '51–150 flats',
    price: 999, annualPrice: 9990, color: 'purple', popular: true,
    features: ['All Starter features', 'Advanced reports', 'Priority support', 'Multiple wings'],
  },
  {
    id: 'PREMIUM', name: 'Premium', flatsLabel: '151–300 flats',
    price: 1499, annualPrice: 14990, color: 'indigo', popular: false,
    features: ['All Standard features', 'Dedicated manager', 'Custom branding', 'API access'],
  },
];

const DEFAULT_REMINDERS = {
  days90: true, days60: true, days30: true, days7: true, days1: true, autoDeactivate: true,
};

const TEMPLATE_VARS = ['{secretaryName}', '{societyName}', '{expiryDate}', '{planName}', '{amount}', '{upiId}', '{supportPhone}'];

const ACCESS_LOG = [
  { time: '2026-06-10 09:42', action: 'Login', detail: 'Chrome, macOS' },
  { time: '2026-06-10 08:15', action: 'Society Added', detail: 'Swastik Heights' },
  { time: '2026-06-09 16:30', action: 'Wing Created', detail: 'Tower-D' },
  { time: '2026-06-09 14:22', action: 'Plan Updated', detail: 'Starter → Standard' },
  { time: '2026-06-08 11:10', action: 'Login', detail: 'Safari, iPhone' },
];

const SESSIONS = [
  { device: 'Chrome, macOS', location: 'Vadodara, Gujarat', time: 'Now', current: true },
  { device: 'Safari, iPhone', location: 'Vadodara, Gujarat', time: '2 days ago', current: false },
];

// ─── Shared UI ────────────────────────────────────────────────────────────────

function Card({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-6 mb-5">
      <h3 className="text-base font-semibold tracking-tight text-gray-900">{title}</h3>
      {sub && <p className="text-xs text-gray-400 mt-0.5 mb-4">{sub}</p>}
      {!sub && <div className="mb-4" />}
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700 block mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500';
const selectCls = `${inputCls} bg-white`;

function SaveBtn({ onClick, saved, label = 'Save Changes' }: { onClick: () => void; saved: boolean; label?: string }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
        saved ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
      }`}>
      {saved ? <><Check size={15} /> Saved!</> : <><Save size={15} /> {label}</>}
    </button>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
        checked ? 'bg-blue-600' : 'bg-gray-200'
      }`}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
        checked ? 'translate-x-5' : 'translate-x-0'
      }`} />
    </button>
  );
}

// ─── Tab: General ─────────────────────────────────────────────────────────────

function GeneralTab({ settings, setSettings, handleSave, saved }: {
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
  handleSave: () => void;
  saved: boolean;
}) {
  const set = (key: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setSettings((s) => ({ ...s, [key]: e.target.value }));

  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  const checkApi = useCallback(async () => {
    setApiStatus('checking');
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
      const baseUrl = apiUrl.replace(/\/api\/?$/, '');
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${baseUrl}/health`, { signal: controller.signal });
      clearTimeout(tid);
      setApiStatus(res.ok ? 'online' : 'offline');
    } catch {
      setApiStatus('offline');
    }
  }, []);

  useEffect(() => {
    checkApi();
    const id = setInterval(checkApi, 30000);
    return () => clearInterval(id);
  }, [checkApi]);

  return (
    <div>
      {/* Platform config */}
      <Card title="Platform Configuration" sub="Core settings for the MySwarg platform">
        <div className="space-y-4">
          <Field label="Platform Name">
            <input value={settings.platformName} onChange={set('platformName')} className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Support Phone (+91)">
              <input value={settings.supportPhone} onChange={set('supportPhone')} placeholder="9000000000" className={inputCls} />
            </Field>
            <Field label="Support WhatsApp (+91)">
              <input value={settings.supportWhatsApp} onChange={set('supportWhatsApp')} placeholder="9000000000" className={inputCls} />
            </Field>
          </div>
          <Field label="Support Email">
            <input value={settings.supportEmail} onChange={set('supportEmail')} type="email" placeholder="support@nivasi.in" className={inputCls} />
          </Field>
          <Field label="Play Store URL">
            <input value={settings.playStoreUrl} onChange={set('playStoreUrl')} placeholder="https://play.google.com/store/apps/..." className={inputCls} />
          </Field>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Trial Period (days)">
              <div className="flex items-center gap-2">
                <input value={settings.trialDays} onChange={set('trialDays')} type="number" min={0} className={inputCls} />
              </div>
            </Field>
            <Field label="Currency">
              <select value={settings.currency} onChange={set('currency')} className={selectCls}>
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
              </select>
            </Field>
            <Field label="Timezone">
              <select value={settings.timezone} onChange={set('timezone')} className={selectCls}>
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="UTC">UTC</option>
              </select>
            </Field>
          </div>
        </div>
      </Card>

      {/* App Configuration */}
      <Card title="App Configuration" sub="System status and diagnostics">
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-gray-50">
            <div>
              <p className="text-sm font-medium text-gray-700">App Version</p>
              <p className="text-xs text-gray-400">Current release</p>
            </div>
            <span className="text-sm font-mono text-gray-700 bg-gray-100 px-3 py-1 rounded-lg">v1.0.0</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-50">
            <div>
              <p className="text-sm font-medium text-gray-700">API Status</p>
              <p className="text-xs text-gray-400">Auto-refreshes every 30 seconds</p>
            </div>
            <div className="flex items-center gap-2">
              {apiStatus === 'checking' && (
                <span className="flex items-center gap-1.5 text-sm text-gray-400">
                  <span className="w-2 h-2 rounded-full bg-gray-300 animate-pulse" /> Checking…
                </span>
              )}
              {apiStatus === 'online' && (
                <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-green-500" /> Online
                </span>
              )}
              {apiStatus === 'offline' && (
                <span className="flex items-center gap-1.5 text-sm text-red-500 font-medium">
                  <span className="w-2 h-2 rounded-full bg-red-500" /> Offline
                </span>
              )}
              <button onClick={checkApi} className="text-xs text-blue-600 hover:underline">Refresh</button>
            </div>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-50">
            <div>
              <p className="text-sm font-medium text-gray-700">Database Status</p>
            </div>
            <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
              <span className="w-2 h-2 rounded-full bg-green-500" /> Connected
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-gray-700">Total API Calls Today</p>
            </div>
            <span className="text-sm font-semibold text-gray-900">1,247</span>
          </div>
        </div>
      </Card>

      {/* Branding */}
      <Card title="Branding" sub="Visual identity settings">
        <div className="space-y-4">
          <Field label="Primary Color">
            <div className="flex items-center gap-3">
              <input
                value={settings.primaryColor}
                onChange={set('primaryColor')}
                type="color"
                className="h-10 w-16 rounded-lg border border-gray-200 cursor-pointer p-1"
              />
              <input value={settings.primaryColor} onChange={set('primaryColor')} className={`${inputCls} flex-1`} placeholder="#1565C0" />
              <div className="w-10 h-10 rounded-xl flex-shrink-0 border border-gray-200" style={{ backgroundColor: settings.primaryColor }} />
            </div>
          </Field>
          <Field label="Company Address">
            <textarea value={settings.companyAddress} onChange={set('companyAddress')} rows={3}
              placeholder="Vadodara, Gujarat, India" className={`${inputCls} resize-none`} />
          </Field>
        </div>
        <div className="mt-5 flex justify-end">
          <SaveBtn onClick={handleSave} saved={saved} />
        </div>
      </Card>
    </div>
  );
}

// ─── Tab: Plans ───────────────────────────────────────────────────────────────

function PlansTab() {
  const [plans, setPlans] = useState<Plan[]>(() => {
    try {
      const s = localStorage.getItem('nivasi_plans');
      return s ? JSON.parse(s) : DEFAULT_PLANS;
    } catch { return DEFAULT_PLANS; }
  });
  const [savedPlan, setSavedPlan] = useState<string | null>(null);

  const updatePlan = (id: string, key: keyof Plan, value: any) =>
    setPlans((prev) => prev.map((p) => p.id === id ? { ...p, [key]: value } : p));

  const updateFeature = (planId: string, i: number, value: string) =>
    setPlans((prev) => prev.map((p) =>
      p.id === planId ? { ...p, features: p.features.map((f, fi) => fi === i ? value : f) } : p,
    ));

  const addFeature = (planId: string) =>
    setPlans((prev) => prev.map((p) =>
      p.id === planId ? { ...p, features: [...p.features, ''] } : p,
    ));

  const removeFeature = (planId: string, i: number) =>
    setPlans((prev) => prev.map((p) =>
      p.id === planId ? { ...p, features: p.features.filter((_, fi) => fi !== i) } : p,
    ));

  const savePlan = (id: string) => {
    localStorage.setItem('nivasi_plans', JSON.stringify(plans));
    setSavedPlan(id);
    setTimeout(() => setSavedPlan(null), 2500);
  };

  const PLAN_COLORS: Record<string, string> = {
    blue: 'border-blue-200 bg-blue-50/50',
    purple: 'border-purple-200 bg-purple-50/50',
    indigo: 'border-indigo-200 bg-indigo-50/50',
  };
  const PLAN_BADGE: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20',
    purple: 'bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20',
    indigo: 'bg-indigo-100 text-indigo-700',
  };

  return (
    <div>
      <Card title="Subscription Plans" sub="Edit plan names, pricing and features">
        <div className="grid grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div key={plan.id} className={`rounded-2xl border-2 p-4 ${PLAN_COLORS[plan.color] ?? 'border-gray-200'}`}>
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <input
                    value={plan.name}
                    onChange={(e) => updatePlan(plan.id, 'name', e.target.value)}
                    className="text-base font-semibold tracking-tight text-gray-900 bg-transparent border-none outline-none w-full"
                  />
                  <input
                    value={plan.flatsLabel}
                    onChange={(e) => updatePlan(plan.id, 'flatsLabel', e.target.value)}
                    className="text-xs text-gray-400 bg-transparent border-none outline-none w-full mt-0.5"
                  />
                </div>
                <button
                  onClick={() => setPlans((prev) => prev.map((p) => ({ ...p, popular: p.id === plan.id ? !p.popular : false })))}
                  className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ml-2 transition-colors ${
                    plan.popular ? PLAN_BADGE[plan.color] : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                  }`}
                >
                  {plan.popular ? '★ Popular' : 'Set Popular'}
                </button>
              </div>

              {/* Pricing */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-sm">₹</span>
                  <input
                    value={plan.price}
                    onChange={(e) => updatePlan(plan.id, 'price', Number(e.target.value))}
                    type="number"
                    className="text-xl font-semibold tracking-tight text-gray-900 bg-transparent border-none outline-none w-20"
                  />
                  <span className="text-xs text-gray-400">/month</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-xs">₹</span>
                  <input
                    value={plan.annualPrice}
                    onChange={(e) => updatePlan(plan.id, 'annualPrice', Number(e.target.value))}
                    type="number"
                    className="text-sm text-gray-500 bg-transparent border-none outline-none w-20"
                  />
                  <span className="text-xs text-gray-400">/year</span>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-1.5 mb-3">
                {plan.features.map((feat, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <Check size={12} className="text-green-500 flex-shrink-0" />
                    <input
                      value={feat}
                      onChange={(e) => updateFeature(plan.id, i, e.target.value)}
                      className="text-xs text-gray-600 bg-transparent border-none outline-none flex-1 min-w-0"
                    />
                    <button onClick={() => removeFeature(plan.id, i)} className="text-gray-300 hover:text-red-400">
                      <X size={10} />
                    </button>
                  </div>
                ))}
                <button onClick={() => addFeature(plan.id)}
                  className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 mt-1">
                  <Plus size={11} /> Add feature
                </button>
              </div>

              <button onClick={() => savePlan(plan.id)}
                className={`w-full py-2 rounded-xl text-xs font-medium transition-all ${
                  savedPlan === plan.id
                    ? 'bg-green-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-700 hover:border-blue-300'
                }`}>
                {savedPlan === plan.id ? '✓ Saved' : 'Save Plan'}
              </button>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Custom Pricing" sub="For enterprise clients negotiated individually">
        <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800">
          For enterprise clients, set a custom monthly amount when creating or editing a society via the
          <span className="font-medium"> Change Plan</span> option in Subscriptions.
          Custom pricing overrides the standard plan rates.
        </div>
      </Card>

      <Card title="Discount Codes">
        <div className="flex items-center gap-3 py-4">
          <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <CreditCard size={18} className="text-gray-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-sm font-medium text-gray-700">Discount Codes</p>
              <span className="text-xs bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20 px-2 py-0.5 rounded-full font-medium">Coming Soon</span>
            </div>
            <p className="text-xs text-gray-400">Create promotional codes to offer discounts on subscriptions</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── Tab: Notifications ───────────────────────────────────────────────────────

function NotificationsTab({ settings }: { settings: Settings }) {
  const [reminders, setReminders] = useState(() => {
    try {
      const s = localStorage.getItem('nivasi_reminder_settings');
      return s ? { ...DEFAULT_REMINDERS, ...JSON.parse(s) } : DEFAULT_REMINDERS;
    } catch { return DEFAULT_REMINDERS; }
  });

  const [templates, setTemplates] = useState({
    thirty: `Hi {secretaryName},\n\nYour Nivasi subscription for {societyName} expires in 30 days on {expiryDate}.\n\nPlan: {planName} — ₹{amount}/month\n\nPlease renew to avoid interruption.\nPay to UPI: {upiId}\n\nContact: {supportPhone}\n\nThank you,\nNivasi Team`,
    seven: `⚠️ URGENT: Hi {secretaryName},\n\nYour Nivasi subscription for {societyName} expires in just 7 days!\n\nExpiry: {expiryDate}\nPlan: {planName} — ₹{amount}/month\n\nRenew NOW to avoid service interruption.\nPay to UPI: {upiId}\n\nNeed help? {supportPhone}`,
    expired: `Hi {secretaryName},\n\nYour Nivasi subscription for {societyName} has expired.\n\nThe app will show a renewal notice to the secretary until payment is received.\n\nPay: ₹{amount} to UPI: {upiId}\n\nFor assistance: {supportPhone}\n\nWe look forward to continuing service with you.\nNivasi Team`,
  });

  const refs = {
    thirty: useRef<HTMLTextAreaElement>(null),
    seven: useRef<HTMLTextAreaElement>(null),
    expired: useRef<HTMLTextAreaElement>(null),
  };

  const toggleReminder = (key: string) => {
    const next = { ...reminders, [key]: !reminders[key as keyof typeof reminders] };
    setReminders(next);
    localStorage.setItem('nivasi_reminder_settings', JSON.stringify(next));
  };

  const [savedTemplates, setSavedTemplates] = useState(false);
  const saveTemplates = () => {
    localStorage.setItem('nivasi_templates', JSON.stringify(templates));
    setSavedTemplates(true);
    setTimeout(() => setSavedTemplates(false), 2500);
  };

  useEffect(() => {
    const saved = localStorage.getItem('nivasi_templates');
    if (saved) setTemplates(JSON.parse(saved));
  }, []);

  const insertVar = (key: keyof typeof templates, ref: React.RefObject<HTMLTextAreaElement | null>, variable: string) => {
    const ta = ref.current;
    if (!ta) {
      setTemplates((t) => ({ ...t, [key]: t[key] + variable }));
      return;
    }
    const start = ta.selectionStart ?? ta.value.length;
    const end = ta.selectionEnd ?? ta.value.length;
    const newVal = ta.value.slice(0, start) + variable + ta.value.slice(end);
    setTemplates((t) => ({ ...t, [key]: newVal }));
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  };

  const REMINDER_ROWS = [
    { key: 'days90', label: '90 days before expiry', desc: 'Early reminder for renewal planning' },
    { key: 'days60', label: '60 days before expiry', desc: 'Second reminder with invoice' },
    { key: 'days30', label: '30 days before expiry', desc: 'Urgent renewal reminder' },
    { key: 'days7',  label: '7 days before expiry',  desc: 'Final warning' },
    { key: 'days1',  label: '1 day before expiry',   desc: 'Last chance reminder' },
    { key: 'autoDeactivate', label: 'Auto-deactivate on expiry', desc: 'App shows expired message to secretary' },
  ];

  const TEMPLATE_DEFS = [
    { key: 'thirty' as const, label: '30-Day Reminder', ref: refs.thirty },
    { key: 'seven'  as const, label: '7-Day Urgent',    ref: refs.seven  },
    { key: 'expired' as const, label: 'Expired Notice', ref: refs.expired },
  ];

  return (
    <div>
      <Card title="Subscription Reminder Schedule" sub="Configure automatic reminder triggers">
        <div className="space-y-3">
          {REMINDER_ROWS.map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div>
                <p className="text-sm font-medium text-gray-700">{label}</p>
                <p className="text-xs text-gray-400">{desc}</p>
              </div>
              <Toggle
                checked={reminders[key as keyof typeof reminders]}
                onChange={() => toggleReminder(key)}
              />
            </div>
          ))}
        </div>
      </Card>

      <Card title="WhatsApp Message Templates" sub="Customise messages sent to society secretaries">
        <div className="space-y-6">
          {TEMPLATE_DEFS.map(({ key, label, ref }) => (
            <div key={key}>
              <p className="text-sm font-semibold text-gray-700 mb-2">{label}</p>
              <textarea
                ref={ref}
                value={templates[key]}
                onChange={(e) => setTemplates((t) => ({ ...t, [key]: e.target.value }))}
                rows={8}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs font-mono focus:outline-none focus:border-blue-500 resize-none"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {TEMPLATE_VARS.map((v) => (
                  <button key={v} onClick={() => insertVar(key, ref, v)}
                    className="text-xs px-2 py-1 bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/15 rounded-lg hover:bg-blue-100 font-mono transition-colors">
                    {v}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="flex justify-end pt-2">
            <SaveBtn onClick={saveTemplates} saved={savedTemplates} label="Save Templates" />
          </div>
        </div>
      </Card>

      <Card title="Email Notifications">
        <div className="flex items-center gap-3 py-3">
          <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
            <Mail size={18} className="text-gray-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-sm font-medium text-gray-700">Email Notifications</p>
              <span className="text-xs bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20 px-2 py-0.5 rounded-full font-medium">Coming Soon</span>
            </div>
            <p className="text-xs text-gray-400">Automated email reminders will be available in a future update</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── Tab: Account ─────────────────────────────────────────────────────────────

function AccountTab({ user }: { user: { name?: string; role?: string; phone?: string } | null }) {
  const [profile, setProfile] = useState({ name: user?.name ?? '' });
  const [upi, setUpi] = useState({ upiId: '', upiName: '' });
  const [company, setCompany] = useState({ companyName: '', gstin: '', companyAddress: '' });
  const [savedSection, setSavedSection] = useState<string | null>(null);

  useEffect(() => {
    const s = localStorage.getItem('nivasi_settings');
    if (s) {
      const parsed = JSON.parse(s);
      setUpi({ upiId: parsed.upiId || '', upiName: parsed.upiName || '' });
      setCompany({ companyName: parsed.companyName || '', gstin: parsed.gstin || '', companyAddress: parsed.companyAddress || '' });
    }
    setProfile({ name: user?.name ?? '' });
  }, [user]);

  const save = (section: string, data: object) => {
    const current = JSON.parse(localStorage.getItem('nivasi_settings') || '{}');
    localStorage.setItem('nivasi_settings', JSON.stringify({ ...current, ...data }));
    setSavedSection(section);
    setTimeout(() => setSavedSection(null), 2500);
  };

  const maskedPhone = user?.phone ? `+91 XXXXXX${user.phone.slice(-4)}` : '+91 XXXXXX4040';

  return (
    <div>
      <Card title="Profile" sub="Your administrator account information">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0">
            <span className="text-white text-2xl font-semibold tracking-tight tabular-nums">{(profile.name || 'A').charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <p className="font-bold text-gray-900">{profile.name || 'Admin'}</p>
            <p className="text-sm text-gray-400">{maskedPhone}</p>
            <span className="text-xs bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/15 px-2 py-0.5 rounded-full font-medium mt-1 inline-block">
              Super Administrator
            </span>
          </div>
        </div>
        <div className="space-y-3">
          <Field label="Display Name">
            <input value={profile.name} onChange={(e) => setProfile({ name: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Phone (Login)">
            <input value={maskedPhone} readOnly className={`${inputCls} bg-gray-50 text-gray-400`} />
          </Field>
        </div>
        <div className="mt-4 flex justify-end">
          <SaveBtn onClick={() => save('profile', profile)} saved={savedSection === 'profile'} label="Update Profile" />
        </div>
      </Card>

      <Card title="UPI Details" sub="Used in WhatsApp reminder templates">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Field label="UPI ID">
            <input value={upi.upiId} onChange={(e) => setUpi((u) => ({ ...u, upiId: e.target.value }))}
              placeholder="yourname@upi" className={inputCls} />
          </Field>
          <Field label="UPI Name">
            <input value={upi.upiName} onChange={(e) => setUpi((u) => ({ ...u, upiName: e.target.value }))}
              placeholder="MySwarg Payments" className={inputCls} />
          </Field>
        </div>

        {upi.upiId && (
          <div className="bg-gray-900 rounded-2xl p-4 mb-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-blue-600 font-bold text-xl">₹</span>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Pay to</p>
              <p className="text-white font-mono font-medium">{upi.upiId}</p>
              <p className="text-gray-400 text-xs mt-0.5">{upi.upiName || 'MySwarg Payments'}</p>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <SaveBtn onClick={() => save('upi', upi)} saved={savedSection === 'upi'} label="Save UPI Details" />
        </div>
      </Card>

      <Card title="Company Details" sub="For invoicing and records">
        <div className="space-y-3">
          <Field label="Company Name">
            <input value={company.companyName} onChange={(e) => setCompany((c) => ({ ...c, companyName: e.target.value }))}
              placeholder="MySwarg Technologies" className={inputCls} />
          </Field>
          <Field label="GSTIN (optional)">
            <input value={company.gstin} onChange={(e) => setCompany((c) => ({ ...c, gstin: e.target.value }))}
              placeholder="22AAAAA0000A1Z5" className={inputCls} />
          </Field>
          <Field label="Company Address">
            <textarea value={company.companyAddress} onChange={(e) => setCompany((c) => ({ ...c, companyAddress: e.target.value }))}
              rows={3} className={`${inputCls} resize-none`} placeholder="Vadodara, Gujarat, India" />
          </Field>
        </div>
        <div className="mt-4 flex justify-end">
          <SaveBtn onClick={() => save('company', company)} saved={savedSection === 'company'} label="Save Company Details" />
        </div>
      </Card>
    </div>
  );
}

// ─── Tab: Security ────────────────────────────────────────────────────────────

function SecurityTab({ user }: { user: { name?: string; phone?: string } | null }) {
  const [revokedIds, setRevokedIds] = useState<number[]>([]);
  const maskedPhone = user?.phone ? `+91 XXXXXX${user.phone.slice(-4)}` : '+91 XXXXXX4040';

  return (
    <div>
      <Card title="Authentication" sub="Login method for your account">
        <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex items-start gap-3">
          <Check size={18} className="text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-green-800">OTP Authentication Active</p>
            <p className="text-xs text-emerald-600 mt-0.5">
              Your account is secured with OTP-based authentication. No password required.
              OTP is sent to {maskedPhone}.
            </p>
          </div>
        </div>
        <div className="mt-4 p-4 bg-gray-50 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Two-Factor Authentication</p>
              <p className="text-xs text-gray-400 mt-0.5">OTP via SMS is your second factor</p>
            </div>
            <span className="text-xs bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/15 px-2 py-1 rounded-full font-medium flex items-center gap-1">
              <Check size={11} /> Enabled
            </span>
          </div>
          <div className="mt-3 text-xs text-gray-400">Phone: {maskedPhone}</div>
        </div>
      </Card>

      <Card title="Active Sessions" sub="Devices currently logged in">
        <div className="space-y-3">
          {SESSIONS.map((session, i) => (
            <div key={i} className={`flex items-center justify-between p-3 rounded-xl ${session.current ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50'}`}>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-800">{session.device}</p>
                  {session.current && <span className="text-xs bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20 px-1.5 py-0.5 rounded font-medium">Current</span>}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{session.location} · {session.time}</p>
              </div>
              {!session.current && !revokedIds.includes(i) && (
                <button onClick={() => setRevokedIds((prev) => [...prev, i])}
                  className="text-xs text-red-500 hover:text-red-700 font-medium border border-red-200 hover:border-red-300 px-3 py-1.5 rounded-lg transition-colors">
                  Revoke
                </button>
              )}
              {revokedIds.includes(i) && (
                <span className="text-xs text-gray-400">Revoked</span>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card title="Access Log" sub="Recent admin activity">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left text-xs font-medium text-gray-400 pb-2">Time</th>
              <th className="text-left text-xs font-medium text-gray-400 pb-2">Action</th>
              <th className="text-left text-xs font-medium text-gray-400 pb-2">Details</th>
            </tr>
          </thead>
          <tbody>
            {ACCESS_LOG.map((log, i) => (
              <tr key={i} className="border-b border-gray-100 last:border-0">
                <td className="py-2.5 text-xs text-gray-400 font-mono whitespace-nowrap pr-4">{log.time}</td>
                <td className="py-2.5 text-sm font-medium text-gray-800 pr-4">{log.action}</td>
                <td className="py-2.5 text-xs text-gray-500">{log.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'general',       label: 'General',           icon: Building2  },
  { id: 'plans',         label: 'Plans & Pricing',    icon: CreditCard },
  { id: 'notifications', label: 'Notifications',      icon: Bell       },
  { id: 'account',       label: 'My Account',         icon: User       },
  { id: 'security',      label: 'Security',           icon: Shield     },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [saved, setSaved] = useState(false);
  const [user, setUser] = useState<{ name?: string; role?: string; phone?: string } | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    // Read tab from URL query param
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab && TABS.some((t) => t.id === tab)) setActiveTab(tab);

    // Load persisted settings
    const savedStr = localStorage.getItem('nivasi_settings');
    if (savedStr) {
      try { setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedStr) }); } catch { /* ignore */ }
    }

    // Load user
    const userStr = localStorage.getItem('nivasi_admin_user');
    if (userStr) {
      try { setUser(JSON.parse(userStr)); } catch { /* ignore */ }
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('nivasi_settings', JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="flex gap-6 items-start">
      {/* Left Tab List */}
      <div className="w-56 flex-shrink-0">
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium transition-colors border-b border-gray-50 last:border-0 ${
                activeTab === tab.id
                  ? 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/15 border-l-[3px] border-l-blue-600'
                  : 'text-gray-600 hover:bg-gray-50 border-l-[3px] border-l-transparent'
              }`}
            >
              <tab.icon size={15} className="flex-shrink-0" />
              <span className="flex-1 text-left">{tab.label}</span>
              <ChevronRight size={13} className="text-gray-300" />
            </button>
          ))}
        </div>
      </div>

      {/* Right Content */}
      <div className="flex-1 min-w-0">
        {activeTab === 'general' && (
          <GeneralTab settings={settings} setSettings={setSettings} handleSave={handleSave} saved={saved} />
        )}
        {activeTab === 'plans' && <PlansTab />}
        {activeTab === 'notifications' && <NotificationsTab settings={settings} />}
        {activeTab === 'account' && <AccountTab user={user} />}
        {activeTab === 'security' && <SecurityTab user={user} />}
      </div>
    </div>
  );
}
