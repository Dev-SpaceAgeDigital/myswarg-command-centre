'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Home, TrendingUp, AlertTriangle, ArrowUpRight, Plus, CreditCard, MessageSquare, Send } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import api from '@/lib/api';

interface Stats {
  societies: number;
  wings: number;
  residents: number;
}

interface Society {
  id: string;
  name: string;
  city: string;
  subscriptionStatus: string;
  wings: { id: string }[];
  createdAt: string;
}

interface SubscriptionSummary {
  totalActive: number;
  totalExpiring30: number;
  totalExpired: number;
  monthlyRevenue: number;
  annualRevenue: number;
}

const colorMap: Record<string, { bg: string; icon: string; glow: string }> = {
  blue:   { bg: 'bg-blue-50 ring-blue-100',       icon: 'text-blue-600',    glow: 'from-blue-500/10' },
  purple: { bg: 'bg-purple-50 ring-purple-100',   icon: 'text-purple-600',  glow: 'from-purple-500/10' },
  green:  { bg: 'bg-emerald-50 ring-emerald-100', icon: 'text-emerald-600', glow: 'from-emerald-500/10' },
  orange: { bg: 'bg-orange-50 ring-orange-100',   icon: 'text-orange-600',  glow: 'from-orange-500/10' },
};

function StatCard({
  title, value, icon: Icon, color, trend, alert: isAlert, onClick,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  trend: string;
  alert?: boolean;
  onClick?: () => void;
}) {
  const c = colorMap[color] ?? colorMap.blue;
  return (
    <div
      onClick={onClick}
      className={`group relative overflow-hidden bg-white rounded-2xl p-5 border shadow-sm ${isAlert ? 'border-orange-200' : 'border-gray-200/70'} hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className={`pointer-events-none absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${c.glow} to-transparent blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
      <div className="relative flex items-center justify-between mb-5">
        <div className={`w-10 h-10 ${c.bg} ring-1 ring-inset rounded-xl flex items-center justify-center`}>
          <Icon size={19} className={c.icon} />
        </div>
        <ArrowUpRight size={16} className="text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
      </div>
      <p className="relative text-[13px] font-medium text-gray-500">{title}</p>
      <p className="relative text-[28px] leading-tight font-semibold tracking-tight text-gray-900 mt-1 tabular-nums">{value}</p>
      <p className={`relative inline-flex items-center gap-1.5 text-xs mt-3 font-medium ${isAlert ? 'text-orange-600' : 'text-emerald-600'}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${isAlert ? 'bg-orange-500' : 'bg-emerald-500'}`} />
        {trend}
      </p>
    </div>
  );
}

const revenueData = [
  { month: 'Jan', revenue: 45000 },
  { month: 'Feb', revenue: 52000 },
  { month: 'Mar', revenue: 61000 },
  { month: 'Apr', revenue: 58000 },
  { month: 'May', revenue: 72000 },
  { month: 'Jun', revenue: 89000 },
];

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [societies, setSocieties] = useState<Society[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, societiesRes, subsRes] = await Promise.all([
          api.get('/superadmin/stats'),
          api.get('/superadmin/societies'),
          api.get('/subscriptions/summary'),
        ]);
        setStats(statsRes.data.data);
        setSocieties(societiesRes.data.data || []);
        setSubscriptions(subsRes.data.data);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const subscriptionData = [
    { name: 'Active',  value: societies.filter(s => s.subscriptionStatus === 'ACTIVE').length  || stats?.societies || 0, color: '#138A79' },
    { name: 'Trial',   value: societies.filter(s => s.subscriptionStatus === 'TRIAL').length   || 0,                      color: '#FFD32C' },
    { name: 'Expired', value: societies.filter(s => s.subscriptionStatus === 'EXPIRED').length || 0,                      color: '#F87171' },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-36 !rounded-3xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-16 !rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-40 !rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* ── Welcome Banner ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-hero rounded-3xl p-6 sm:p-8 mb-6 shadow-xl shadow-blue-900/20">
        <div className="absolute inset-0 bg-grid [mask-image:linear-gradient(to_right,transparent,black_60%)]" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/mark.png" alt="" aria-hidden className="pointer-events-none absolute -right-10 -bottom-14 w-56 opacity-[0.08] rotate-12" />
        <span className="heart-drift pointer-events-none absolute right-[30%] bottom-2 text-lg">💛</span>
        <span className="heart-drift pointer-events-none absolute right-[8%] bottom-4 text-sm" style={{ animationDelay: '3s' }}>💛</span>
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <p className="text-sun-300 text-sm font-semibold flex items-center gap-1.5">
              {(() => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; })()}, Admin <span className="inline-block animate-wiggle origin-[70%_70%]">👋</span>
            </p>
            <p className="font-display text-white text-2xl sm:text-[30px] font-semibold tracking-tight mt-1">Here&apos;s how your MySwarg family is doing</p>
            <p className="text-white/60 text-xs mt-2">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="grid grid-cols-3 md:flex rounded-2xl bg-white/10 ring-1 ring-inset ring-white/15 backdrop-blur-sm divide-x divide-white/15">
            <div className="px-3 sm:px-6 py-3.5 min-w-0">
              <p className="text-white/60 text-[10px] sm:text-[11px] font-medium uppercase tracking-wider">Societies</p>
              <p className="text-lg sm:text-2xl font-semibold text-white mt-1 tabular-nums truncate">{stats?.societies ?? 0}</p>
            </div>
            <div className="px-3 sm:px-6 py-3.5 min-w-0">
              <p className="text-white/60 text-[10px] sm:text-[11px] font-medium uppercase tracking-wider">MRR</p>
              <p className="text-lg sm:text-2xl font-semibold text-mint-200 mt-1 tabular-nums truncate">
                ₹{(subscriptions?.monthlyRevenue ?? 0).toLocaleString('en-IN')}
              </p>
            </div>
            <div className="px-3 sm:px-6 py-3.5 min-w-0">
              <p className="text-white/60 text-[10px] sm:text-[11px] font-medium uppercase tracking-wider">Expiring</p>
              <p className="text-lg sm:text-2xl font-semibold text-sun-300 mt-1 tabular-nums truncate">{subscriptions?.totalExpiring30 ?? 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Add Society',    icon: Plus,          href: '/dashboard/societies',     bg: 'bg-blue-50 group-hover:bg-blue-600',      text: 'text-blue-600 group-hover:text-white',    hover: 'hover:border-blue-200'    },
          { label: 'Record Payment', icon: CreditCard,    href: '/dashboard/subscriptions', bg: 'bg-emerald-50 group-hover:bg-emerald-600', text: 'text-emerald-600 group-hover:text-white', hover: 'hover:border-emerald-200' },
          { label: 'New Ticket',     icon: MessageSquare, href: '/dashboard/support',       bg: 'bg-sun-100 group-hover:bg-sun-400',      text: 'text-sun-700 group-hover:text-blue-900',  hover: 'hover:border-sun-300'  },
          { label: 'Send Reminders', icon: Send,          href: '/dashboard/subscriptions', bg: 'bg-purple-50 group-hover:bg-purple-600',   text: 'text-purple-600 group-hover:text-white',  hover: 'hover:border-purple-200'  },
        ].map(({ label, icon: Icon, href, bg, text, hover }) => (
          <button key={label} onClick={() => router.push(href)}
            className={`group flex items-center gap-3 p-3.5 rounded-2xl border border-gray-200/70 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-sm font-medium text-gray-700 text-left ${hover}`}>
            <div className={`p-2.5 rounded-xl transition-colors ${bg}`}>
              <Icon size={16} className={`transition-colors ${text}`} />
            </div>
            <span className="flex-1">{label}</span>
            <ArrowUpRight size={14} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block" />
          </button>
        ))}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        <StatCard title="Total Societies"  value={stats?.societies ?? 0}  icon={Building2}     color="blue"   trend="+2 this month" onClick={() => router.push('/dashboard/societies')} />
        <StatCard title="Total Wings"      value={stats?.wings ?? 0}      icon={Home}          color="purple" trend="Active wings" />
        <StatCard title="Monthly Revenue"  value={`₹${(subscriptions?.monthlyRevenue ?? 0).toLocaleString('en-IN')}`} icon={TrendingUp} color="green" trend="+12% vs last month" onClick={() => router.push('/dashboard/subscriptions')} />
        <StatCard title="Expiring Soon"    value={subscriptions?.totalExpiring30 ?? 0} icon={AlertTriangle} color="orange" trend="Next 30 days" alert={!!subscriptions?.totalExpiring30} onClick={() => router.push('/dashboard/subscriptions?filter=expiring')} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Revenue bar chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-200/70">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Revenue Overview</h2>
              <p className="text-xs text-gray-400 mt-0.5">Last 6 months</p>
            </div>
            <span className="text-xs bg-sun-100 text-sun-800 ring-1 ring-inset ring-sun-500/30 font-semibold px-2.5 py-1 rounded-full">🚀 23% growth</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revenueData} barSize={32}>
              <defs>
                <linearGradient id="revenueBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#138A79" />
                  <stop offset="100%" stopColor="#69CDB9" stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke="#E6EFEC" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#8EA19C' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 12, fill: '#8EA19C' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value) => [`₹${Number(value).toLocaleString()}`, 'Revenue']}
                cursor={{ fill: '#EBFAF6', radius: 8 }}
                contentStyle={{ borderRadius: '12px', border: '1px solid #E0E9E6', boxShadow: '0 12px 20px -4px rgba(16,24,40,0.08)' }}
              />
              <Bar dataKey="revenue" fill="url(#revenueBar)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Subscription pie */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200/70">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Subscription Status</h2>
          <p className="text-xs text-gray-400 mb-4">Current distribution</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={subscriptionData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={3}
                cornerRadius={6}
                stroke="none"
                dataKey="value"
              >
                {subscriptionData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1 mt-3">
            {subscriptionData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm px-2.5 py-1.5 rounded-lg hover:bg-gray-50">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-gray-600">{item.name}</span>
                </div>
                <span className="font-semibold text-gray-900 tabular-nums">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent societies */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200/70">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-semibold text-gray-900">Societies</h2>
            <a href="/dashboard/societies" className="text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-full flex items-center gap-1">
              View all <ArrowUpRight size={12} />
            </a>
          </div>
          <div className="space-y-1 -mx-2">
            {societies.slice(0, 5).map((society) => (
              <div key={society.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-50 to-indigo-50 ring-1 ring-inset ring-blue-100 rounded-xl flex items-center justify-center">
                    <Building2 size={16} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{society.name}</p>
                    <p className="text-xs text-gray-400">{society.city} · {society.wings?.length ?? 0} wings</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/15 font-medium px-2 py-0.5 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Active</span>
              </div>
            ))}
            {societies.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <div className="text-4xl mb-2 animate-float">🏡</div>
                <p className="text-sm">No societies yet — your first home is just a click away!</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent activity */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200/70">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="relative space-y-5 before:absolute before:left-[4px] before:top-2 before:bottom-2 before:w-px before:bg-gray-100">
            {[...societies]
              .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
              .slice(0, 5)
              .map((s) => (
                <div key={s.id} className="flex items-start gap-3">
                  <div className="relative w-[9px] h-[9px] rounded-full mt-1.5 flex-shrink-0 bg-emerald-500 ring-4 ring-emerald-50" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-700">New society added — <span className="font-medium text-gray-900">{s.name}</span></p>
                    <p className="text-xs text-gray-400 mt-0.5">{timeAgo(s.createdAt || new Date().toISOString())}</p>
                  </div>
                </div>
              ))
            }
            {societies.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No activity yet ✨</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
