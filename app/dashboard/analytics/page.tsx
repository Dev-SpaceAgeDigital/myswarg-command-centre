'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  ComposedChart, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Line,
} from 'recharts';
import { TrendingUp, Building2, Users, CreditCard, Download, Home } from 'lucide-react';
import api from '@/lib/api';

// ─── Static Data ──────────────────────────────────────────────────────────────

const ALL_REVENUE_DATA = [
  { month: 'Jul 25', mrr: 4990,   societies: 10 },
  { month: 'Aug 25', mrr: 9980,   societies: 20 },
  { month: 'Sep 25', mrr: 17955,  societies: 36 },
  { month: 'Oct 25', mrr: 29940,  societies: 60 },
  { month: 'Nov 25', mrr: 44910,  societies: 90 },
  { month: 'Dec 25', mrr: 62370,  societies: 125 },
  { month: 'Jan 26', mrr: 74940,  societies: 150 },
  { month: 'Feb 26', mrr: 89910,  societies: 180 },
  { month: 'Mar 26', mrr: 104880, societies: 210 },
  { month: 'Apr 26', mrr: 119850, societies: 240 },
  { month: 'May 26', mrr: 134820, societies: 270 },
  { month: 'Jun 26', mrr: 149790, societies: 300 },
];

const NEW_SOCIETIES_DATA = [
  { month: 'Jan', count: 8 },
  { month: 'Feb', count: 12 },
  { month: 'Mar', count: 15 },
  { month: 'Apr', count: 10 },
  { month: 'May', count: 18 },
  { month: 'Jun', count: 14 },
];

const HEALTH_DATA = [
  { month: 'Jan', active: 8,   trial: 3,  expiring: 1,  expired: 0 },
  { month: 'Feb', active: 18,  trial: 5,  expiring: 2,  expired: 1 },
  { month: 'Mar', active: 35,  trial: 8,  expiring: 3,  expired: 1 },
  { month: 'Apr', active: 58,  trial: 12, expiring: 5,  expired: 2 },
  { month: 'May', active: 85,  trial: 15, expiring: 8,  expired: 3 },
  { month: 'Jun', active: 115, trial: 18, expiring: 12, expired: 5 },
];

const TOP_CITIES = [
  { city: 'Vadodara',    societies: 45, mrr: 22455, growth: '+12%', positive: true },
  { city: 'Ahmedabad',   societies: 38, mrr: 18962, growth: '+18%', positive: true },
  { city: 'Surat',       societies: 28, mrr: 13972, growth: '+8%',  positive: true },
  { city: 'Rajkot',      societies: 22, mrr: 10978, growth: '+5%',  positive: true },
  { city: 'Gandhinagar', societies: 15, mrr:  7485, growth: '-2%',  positive: false },
];

const MILESTONES = [
  { color: 'bg-green-500',  text: '100 societies reached',  date: 'March 2026' },
  { color: 'bg-blue-500',   text: '₹1L MRR reached',        date: 'April 2026' },
  { color: 'bg-purple-500', text: 'Gujarat expansion',       date: 'Feb 2026'   },
  { color: 'bg-orange-500', text: 'First premium client',    date: 'Jan 2026'   },
];

const PLAN_COLORS = ['#69CDB9', '#138A79', '#095A51', '#FFD32C'];

// ─── Tooltip Styles ───────────────────────────────────────────────────────────

const tooltipStyle = {
  contentStyle: {
    borderRadius: '12px',
    border: 'none',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
    fontSize: '12px',
  },
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, trend, icon: Icon, iconBg, iconColor,
}: {
  label: string;
  value: string | number;
  sub: string;
  trend?: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-200/70 shadow-sm">
      <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center mb-3`}>
        <Icon size={20} className={iconColor} />
      </div>
      <p className="text-2xl font-semibold tracking-tight tabular-nums text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
      {trend && (
        <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
          <TrendingUp size={10} /> {trend}
        </p>
      )}
    </div>
  );
}

// ─── Chart Card ───────────────────────────────────────────────────────────────

function ChartCard({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200/70 shadow-sm">
      <h2 className="text-base font-semibold tracking-tight text-gray-900">{title}</h2>
      {sub && <p className="text-xs text-gray-400 mt-0.5 mb-4">{sub}</p>}
      {!sub && <div className="mb-4" />}
      {children}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [societies, setSocieties] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any>(null);
  const [dateRange, setDateRange] = useState('6months');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, societiesRes, subscriptionsRes] = await Promise.all([
        api.get('/superadmin/stats'),
        api.get('/superadmin/societies'),
        api.get('/subscriptions/summary'),
      ]);
      setStats(statsRes.data.data);
      setSocieties(societiesRes.data.data || []);
      setSubscriptions(subscriptionsRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Derived data ────────────────────────────────────────────────────────────

  const revenueSlice =
    dateRange === '3months' ? ALL_REVENUE_DATA.slice(-3) :
    dateRange === '6months' ? ALL_REVENUE_DATA.slice(-6) :
    ALL_REVENUE_DATA;

  const planData = [
    { name: 'Starter ₹499',   value: societies.filter((s) => s.planType === 'STARTER').length  || Math.max(societies.length - 2, 0), color: PLAN_COLORS[0] },
    { name: 'Standard ₹999',  value: societies.filter((s) => s.planType === 'STANDARD').length || 0, color: PLAN_COLORS[1] },
    { name: 'Premium ₹1,499', value: societies.filter((s) => s.planType === 'PREMIUM').length  || 0, color: PLAN_COLORS[2] },
    { name: 'Custom',         value: societies.filter((s) => s.planType === 'CUSTOM').length   || 0, color: PLAN_COLORS[3] },
  ].filter((d) => d.value > 0);

  const cityCount = societies.reduce((acc: Record<string, number>, s: any) => {
    if (s.city) acc[s.city] = (acc[s.city] || 0) + 1;
    return acc;
  }, {});
  const cityChartData = Object.entries(cityCount)
    .map(([city, count]) => ({ city, count }))
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 8);

  const totalPlanCount = planData.reduce((sum, p) => sum + p.value, 0);

  // ── Export CSV ──────────────────────────────────────────────────────────────

  const exportCSV = () => {
    const headers = ['Society', 'City', 'Plan', 'Amount', 'Start', 'End', 'Status'];
    const rows = societies.map((s: any) => [
      s.name, s.city, s.planType || 'STARTER', s.monthlyAmount || 499,
      s.subscriptionStart || '', s.subscriptionEnd || '', s.subscriptionStatus || 'ACTIVE',
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nivasi_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Skeleton ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100">
              <div className="skeleton h-10 w-10 mb-4" style={{ borderRadius: '12px' }} />
              <div className="skeleton h-6 w-24 mb-2" />
              <div className="skeleton h-3 w-32" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 skeleton h-72 rounded-2xl" />
          <div className="skeleton h-72 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="skeleton h-64 rounded-2xl" />
          <div className="skeleton h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">Platform performance overview</p>
        </div>
        <div className="flex gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="border border-gray-200 rounded-xl px-4 py-2 text-sm bg-white focus:outline-none focus:border-blue-500"
          >
            <option value="3months">Last 3 months</option>
            <option value="6months">Last 6 months</option>
            <option value="12months">Last 12 months</option>
          </select>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 border border-gray-200 bg-white text-gray-600 px-4 py-2 rounded-xl text-sm hover:bg-gray-50 transition-colors no-print"
          >
            <Download size={16} /> Export CSV
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 border border-gray-200 bg-white text-gray-600 px-4 py-2 rounded-xl text-sm hover:bg-gray-50 transition-colors no-print"
          >
            <Download size={16} /> Export PDF
          </button>
        </div>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Monthly Recurring Revenue"
          value={`₹${(subscriptions?.monthlyRevenue ?? 0).toLocaleString('en-IN')}`}
          sub={`₹${(((subscriptions?.annualRevenue ?? 0) / 100000)).toFixed(1)}L annual run rate`}
          trend="+12% vs last month"
          icon={TrendingUp}
          iconBg="bg-green-50"
          iconColor="text-emerald-600"
        />
        <KpiCard
          label="Total Societies"
          value={stats?.societies ?? 0}
          sub="Registered societies"
          trend="+3 this month"
          icon={Building2}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <KpiCard
          label="Total Wings"
          value={stats?.wings ?? 0}
          sub="Active wings"
          icon={Home}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
        />
        <KpiCard
          label="Platform Residents"
          value={stats?.residents ?? 0}
          sub="Registered members"
          icon={Users}
          iconBg="bg-teal-50"
          iconColor="text-teal-600"
        />
      </div>

      {/* ── Row 1: Revenue Growth + Plan Distribution ─────────────────────────── */}
      <div className="grid grid-cols-5 gap-4">
        {/* Revenue Growth — 3/5 */}
        <div className="col-span-3">
          <ChartCard title="Revenue Growth" sub="MRR and society count over time">
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={revenueSlice}>
                <defs>
                  <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#095A51" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#095A51" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E6EFEC" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#8EA19C' }} axisLine={false} tickLine={false} />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11, fill: '#8EA19C' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11, fill: '#8EA19C' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(value: any, name?: any) => [
                    name === 'mrr' ? `₹${Number(value).toLocaleString('en-IN')}` : value,
                    name === 'mrr' ? 'MRR' : 'Societies',
                  ]}
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="mrr"
                  fill="url(#mrrGrad)"
                  stroke="#095A51"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="societies"
                  stroke="#F2B90B"
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="4 2"
                />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-6 mt-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-blue-700" />
                <span className="text-xs text-gray-500">MRR</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-sun-500 border-dashed" style={{ borderTop: '2px dashed #F2B90B', background: 'none' }} />
                <span className="text-xs text-gray-500">Societies</span>
              </div>
            </div>
          </ChartCard>
        </div>

        {/* Plan Distribution — 2/5 */}
        <div className="col-span-2">
          <ChartCard title="Plan Distribution" sub="Societies by plan tier">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={planData.length > 0 ? planData : [{ name: 'No data', value: 1, color: '#E0E9E6' }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {(planData.length > 0 ? planData : [{ color: '#E0E9E6' }]).map((entry: any, i: number) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip {...tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-2">
              {planData.map((p) => {
                const pct = totalPlanCount > 0 ? Math.round((p.value / totalPlanCount) * 100) : 0;
                return (
                  <div key={p.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                      <span className="text-gray-600 truncate">{p.name}</span>
                    </div>
                    <span className="font-semibold text-gray-900 flex-shrink-0 ml-2">{p.value} <span className="text-gray-400 font-normal">({pct}%)</span></span>
                  </div>
                );
              })}
              {planData.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-2">No plan data yet</p>
              )}
            </div>
          </ChartCard>
        </div>
      </div>

      {/* ── Row 2: New Societies + Geographic Distribution ────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        {/* New Societies bar chart */}
        <ChartCard title="New Societies Added" sub="Monthly acquisition for past 6 months">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={NEW_SOCIETIES_DATA} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E6EFEC" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#8EA19C' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#8EA19C' }} axisLine={false} tickLine={false} />
              <Tooltip
                {...tooltipStyle}
                formatter={(value: any) => [value, 'Societies Added']}
              />
              <Bar dataKey="count" fill="#095A51" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Geographic Distribution */}
        <ChartCard
          title="Societies by City"
          sub={cityChartData.length > 0 ? `Top ${cityChartData.length} cities` : 'No data yet'}
        >
          {cityChartData.length === 0 ? (
            <div className="h-56 flex items-center justify-center">
              <p className="text-sm text-gray-400">Add societies to see geographic data</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(cityChartData.length * 36 + 20, 180)}>
              <BarChart data={cityChartData} layout="vertical" barSize={18}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E6EFEC" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#8EA19C' }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="city"
                  width={80}
                  tick={{ fontSize: 11, fill: '#62756F' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(value: any) => [value, 'Societies']}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {cityChartData.map((_: any, i: number) => (
                    <Cell
                      key={i}
                      fill={`hsl(${215 - i * 12}, ${80 - i * 5}%, ${45 + i * 4}%)`}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ── Row 3: Subscription Health ───────────────────────────────────────── */}
      <ChartCard title="Subscription Health Overview" sub="Society status trends over 6 months">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={HEALTH_DATA}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E6EFEC" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#8EA19C' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#8EA19C' }} axisLine={false} tickLine={false} />
            <Tooltip {...tooltipStyle} />
            <Legend
              wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
              formatter={(value: string) => value.charAt(0).toUpperCase() + value.slice(1)}
            />
            <Area type="monotone" dataKey="active"   stackId="1" fill="#16A34A" stroke="#16A34A"   fillOpacity={0.7} />
            <Area type="monotone" dataKey="trial"    stackId="1" fill="#D97706" stroke="#D97706"   fillOpacity={0.7} />
            <Area type="monotone" dataKey="expiring" stackId="1" fill="#EA580C" stroke="#EA580C"   fillOpacity={0.7} />
            <Area type="monotone" dataKey="expired"  stackId="1" fill="#DC2626" stroke="#DC2626"   fillOpacity={0.7} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ── Row 4: Top Cities + Milestones ───────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        {/* Top Cities Table */}
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold tracking-tight text-gray-900">Top Cities</h2>
            <p className="text-xs text-gray-400 mt-0.5">By society count and estimated MRR</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200/70 bg-gray-50/80">
                <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">City</th>
                <th className="text-center text-xs font-medium text-gray-400 px-4 py-3">Societies</th>
                <th className="text-right text-xs font-medium text-gray-400 px-4 py-3">Est. MRR</th>
                <th className="text-center text-xs font-medium text-gray-400 px-4 py-3">Growth</th>
              </tr>
            </thead>
            <tbody>
              {TOP_CITIES.map((row) => (
                <tr key={row.city} className="border-t border-gray-100 hover:bg-blue-50/40">
                  <td className="px-5 py-3 font-medium text-gray-900">{row.city}</td>
                  <td className="px-4 py-3 text-center text-gray-700">{row.societies}</td>
                  <td className="px-4 py-3 text-right text-gray-700">₹{row.mrr.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      row.positive ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/15' : 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/15'
                    }`}>
                      {row.growth}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Milestones */}
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-6">
          <h2 className="text-base font-semibold tracking-tight text-gray-900 mb-1">Milestones</h2>
          <p className="text-xs text-gray-400 mb-5">Platform achievements</p>
          <div className="space-y-4">
            {MILESTONES.map((m, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${m.color}`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{m.text}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{m.date}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Next milestone</span>
              <span className="font-medium text-blue-600">500 societies 🎯</span>
            </div>
            <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all"
                style={{ width: `${Math.min(((stats?.societies ?? 0) / 500) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">{stats?.societies ?? 0} / 500 societies</p>
          </div>
        </div>
      </div>
    </div>
  );
}
