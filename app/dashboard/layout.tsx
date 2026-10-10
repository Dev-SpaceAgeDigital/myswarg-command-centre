'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, Building2, Users, CreditCard,
  BarChart3, Settings, LogOut, Bell, HelpCircle,
  MessageCircle, Mail, FileText, User, X, MessageSquare,
  ChevronLeft, ChevronRight, Search, Menu,
} from 'lucide-react';
import api from '@/lib/api';

// ─── Nav config ───────────────────────────────────────────────────────────────

const mainNavItems = [
  { label: 'Dashboard',     href: '/dashboard',              icon: LayoutDashboard },
  { label: 'Societies',     href: '/dashboard/societies',    icon: Building2       },
  { label: 'Partners',      href: '/dashboard/partners',     icon: Users           },
  { label: 'Subscriptions', href: '/dashboard/subscriptions',icon: CreditCard      },
  { label: 'Analytics',     href: '/dashboard/analytics',   icon: BarChart3       },
  { label: 'Support',       href: '/dashboard/support',      icon: MessageSquare   },
];

const bottomNavItems = [
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
];

const PAGE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard', societies: 'Society Management', partners: 'Partner Network',
  subscriptions: 'Subscriptions', analytics: 'Analytics', settings: 'Settings',
  support: 'Support', notifications: 'Notifications',
};

const getPageTitle = (path: string) => {
  const seg = path.split('/').filter(Boolean);
  return PAGE_LABELS[seg[1]] ?? PAGE_LABELS[seg[0]] ?? 'Dashboard';
};

const getBreadcrumbs = (path: string) => {
  const seg = path.split('/').filter(Boolean);
  const crumbs: { label: string; href: string }[] = [{ label: 'Dashboard', href: '/dashboard' }];
  if (seg[1] && PAGE_LABELS[seg[1]]) {
    crumbs.push({ label: PAGE_LABELS[seg[1]], href: `/dashboard/${seg[1]}` });
  }
  if (seg[2]) crumbs.push({ label: 'Detail', href: path });
  if (seg[4]) crumbs.push({ label: 'Wing', href: path });
  return crumbs;
};

// ─── NavLink ──────────────────────────────────────────────────────────────────

function NavLink({
  item, pathname, collapsed,
}: {
  item: { label: string; href: string; icon: React.ElementType };
  pathname: string;
  collapsed: boolean;
}) {
  const isActive =
    pathname === item.href ||
    (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));

  return (
    <Link
      href={item.href}
      title={item.label}
      className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-[13.5px] font-medium ${
        collapsed ? 'justify-center' : ''
      } ${
        isActive
          ? 'bg-sun-400 text-blue-900 font-semibold shadow-lg shadow-sun-500/25'
          : 'text-white/70 hover:text-white hover:bg-white/10'
      }`}
    >
      {isActive && !collapsed && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] animate-heartbeat">💛</span>
      )}
      <item.icon
        size={18}
        strokeWidth={isActive ? 2.2 : 1.8}
        className={`flex-shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-blue-800' : 'text-white/55 group-hover:text-sun-300'}`}
      />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}

// ─── Search Overlay ───────────────────────────────────────────────────────────

interface SearchItem { id: string; name: string; sub: string; type: 'society' | 'partner'; }

function SearchOverlay({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [allItems, setAllItems] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    inputRef.current?.focus();
    Promise.all([
      api.get('/superadmin/societies').catch(() => ({ data: { data: [] } })),
      api.get('/superadmin/subadmins').catch(() => ({ data: { data: [] } })),
    ]).then(([sr, pr]) => {
      const societies: SearchItem[] = (sr.data.data || []).map((s: { id: string; name: string; city: string }) => ({
        id: s.id, name: s.name, sub: s.city, type: 'society' as const,
      }));
      const partners: SearchItem[] = (pr.data.data || []).map((p: { id: string; name: string; region: string }) => ({
        id: p.id, name: p.name, sub: p.region, type: 'partner' as const,
      }));
      setAllItems([...societies, ...partners]);
    }).finally(() => setLoading(false));
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? allItems.filter(i => i.name.toLowerCase().includes(q) || i.sub.toLowerCase().includes(q))
    : allItems.slice(0, 8);
  const societies = filtered.filter(i => i.type === 'society').slice(0, 4);
  const partners = filtered.filter(i => i.type === 'partner').slice(0, 4);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const go = (item: SearchItem) => {
    router.push(item.type === 'society' ? `/dashboard/societies/${item.id}` : `/dashboard/partners/${item.id}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4">
      <div className="modal-backdrop absolute inset-0" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl ring-1 ring-gray-900/5 w-full max-w-xl overflow-hidden animate-scale-in">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <Search size={18} className="text-blue-500 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search societies, partners..."
            className="flex-1 text-[15px] text-gray-900 placeholder-gray-400 bg-transparent"
          />
          <kbd className="text-[11px] text-gray-500 bg-gray-50 border border-gray-200 rounded-md px-1.5 py-0.5 font-mono shadow-xs">Esc</kbd>
        </div>
        <div className="max-h-96 overflow-y-auto p-2">
          {loading ? (
            <div className="flex justify-center py-6">
              <div className="w-5 h-5 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-11 h-11 mx-auto mb-3 rounded-2xl bg-gray-50 flex items-center justify-center">
                <Search size={18} className="text-gray-300" />
              </div>
              <p className="text-sm text-gray-500">No results for &ldquo;{query}&rdquo;</p>
            </div>
          ) : (
            <>
              {societies.length > 0 && (
                <>
                  <p className="px-3 pt-2 pb-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    Societies ({societies.length})
                  </p>
                  {societies.map(s => (
                    <button key={s.id} onClick={() => go(s)} className="group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-blue-50/60 text-left">
                      <div className="w-9 h-9 bg-blue-50 ring-1 ring-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Building2 size={14} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{s.name}</p>
                        <p className="text-xs text-gray-400">{s.sub}</p>
                      </div>
                    </button>
                  ))}
                </>
              )}
              {partners.length > 0 && (
                <>
                  <p className="px-3 pt-3 pb-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    Partners ({partners.length})
                  </p>
                  {partners.map(p => (
                    <button key={p.id} onClick={() => go(p)} className="group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-blue-50/60 text-left">
                      <div className="w-9 h-9 bg-purple-50 ring-1 ring-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Users size={14} className="text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.sub}</p>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </>
          )}
        </div>
        <div className="px-5 py-2.5 border-t border-gray-100 bg-gray-50/80 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            <kbd className="font-mono bg-white border border-gray-200 rounded-md px-1.5 py-0.5 shadow-xs">Esc</kbd> to close
          </p>
          <p className="text-xs text-gray-400">Quick search</p>
        </div>
      </div>
    </div>
  );
}

// ─── Profile Dropdown ─────────────────────────────────────────────────────────

function ProfileDropdown({
  user, onLogout,
}: {
  user: { name?: string; role?: string } | null;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const navigate = (path: string) => { setOpen(false); router.push(path); };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((x) => !x)}
        className="w-9 h-9 bg-gradient-to-br from-sun-300 to-sun-500 rounded-full flex items-center justify-center ring-2 ring-white shadow-md hover:ring-sun-200 hover:scale-105 transition-all"
        title={user?.name ?? 'Admin'}
      >
        <span className="text-blue-900 text-sm font-bold">{user?.name?.charAt(0)?.toUpperCase() ?? 'A'}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-12 bg-white rounded-2xl shadow-xl ring-1 ring-gray-900/5 p-1.5 z-30 w-56 overflow-hidden animate-scale-in origin-top-right">
          <div className="px-3 py-2.5 border-b border-gray-100 mb-1">
            <p className="text-sm font-semibold text-gray-900 truncate">{user?.name ?? 'Admin'}</p>
            <p className="text-xs text-gray-400">Super Administrator</p>
          </div>
          <button
            onClick={() => navigate('/dashboard/settings?tab=account')}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <User size={15} className="text-gray-400" /> My Account
          </button>
          <button
            onClick={() => navigate('/dashboard/settings')}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Settings size={15} className="text-gray-400" /> Settings
          </button>
          <div className="border-t border-gray-100 my-1" />
          <button
            onClick={() => { setOpen(false); onLogout(); }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={15} /> Logout
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Help Button ──────────────────────────────────────────────────────────────

function HelpButton() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const settings = (() => {
    try {
      const s = typeof window !== 'undefined' ? localStorage.getItem('nivasi_settings') : null;
      return s ? JSON.parse(s) : {};
    } catch { return {}; }
  })();

  const supportPhone = settings.supportWhatsApp || settings.supportPhone || '9000000000';
  const supportEmail = settings.supportEmail || 'support@nivasi.in';

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((x) => !x)}
        className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
        title="Help & Support"
      >
        <HelpCircle size={18} />
      </button>

      {open && (
        <div className="absolute right-0 top-12 bg-white rounded-2xl shadow-xl ring-1 ring-gray-900/5 py-4 px-4 z-30 w-72 animate-scale-in origin-top-right">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-gray-900">Need Help?</p>
            <button onClick={() => setOpen(false)} className="text-gray-300 hover:text-gray-500">
              <X size={14} />
            </button>
          </div>
          <p className="text-xs text-gray-500 mb-4">Contact our support team</p>

          <div className="space-y-2">
            <a
              href={`https://wa.me/91${supportPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-green-50 hover:bg-green-100 rounded-xl ring-1 ring-green-100 transition-colors"
            >
              <MessageCircle size={16} className="text-green-600 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-green-800">WhatsApp Support</p>
                <p className="text-xs text-green-600">+91 {supportPhone}</p>
              </div>
            </a>

            <a
              href={`mailto:${supportEmail}`}
              className="flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-xl ring-1 ring-blue-100 transition-colors"
            >
              <Mail size={16} className="text-blue-600 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-blue-800">Email Support</p>
                <p className="text-xs text-blue-600 truncate">{supportEmail}</p>
              </div>
            </a>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl opacity-60">
              <FileText size={16} className="text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-gray-600">Documentation</p>
                <p className="text-xs text-gray-400">Coming soon</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState<{ name?: string; role?: string } | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = localStorage.getItem('nivasi_admin_token');
    if (!token) { router.replace('/login'); return; }
    const saved = localStorage.getItem('nivasi_admin_user');
    if (saved) setUser(JSON.parse(saved));
    const savedCollapsed = localStorage.getItem('nivasi_sidebar_collapsed');
    if (savedCollapsed) setCollapsed(JSON.parse(savedCollapsed));
    setChecking(false);
  }, [router]);

  useEffect(() => {
    const refreshBadge = () => {
      try {
        const n = localStorage.getItem('nivasi_notifications');
        if (n) setUnreadCount(JSON.parse(n).filter((x: { read: boolean }) => !x.read).length);
      } catch {}
    };
    refreshBadge();
    window.addEventListener('nivasi_notif_update', refreshBadge);
    return () => window.removeEventListener('nivasi_notif_update', refreshBadge);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('nivasi_sidebar_collapsed', JSON.stringify(next));
      return next;
    });
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('nivasi_admin_token');
    localStorage.removeItem('nivasi_admin_user');
    document.cookie = 'nivasi_admin_token=; path=/; max-age=0';
    window.location.href = '/login';
  };

  const sidebarW = collapsed ? 'w-16' : 'w-64';
  const breadcrumbs = getBreadcrumbs(pathname);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center animate-fade-in">
          <div className="relative w-16 h-16 mx-auto mb-5">
            <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/mark.png" alt="MySwarg" className="relative w-16 h-16 object-contain animate-float" />
          </div>
          <p className="text-sm font-medium text-gray-500">Getting your MySwarg home ready… 🏡</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-blue-950/40 backdrop-blur-sm z-30 lg:hidden animate-fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Search overlay */}
      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}

      {/* Sidebar */}
      <aside
        className={`no-print fixed left-0 top-0 h-screen bg-hero flex flex-col z-40 lg:z-20 transition-all duration-300 overflow-hidden ${sidebarW} ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Ambient glow */}
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent_40%)]" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 w-64 h-64 rounded-full bg-sun-400/10 blur-3xl" />

        {/* Logo */}
        <div className={`relative h-[72px] flex items-center border-b border-white/10 ${collapsed ? 'justify-center px-0' : 'px-5'}`}>
          <div className="group w-10 h-10 bg-mint-50 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-black/20 ring-2 ring-white/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/mark.png" alt="MySwarg" className="w-8 h-8 object-contain group-hover:animate-wiggle" />
          </div>
          {!collapsed && (
            <div className="ml-3 leading-tight">
              <p className="font-display text-white font-semibold text-[17px] tracking-tight">MySwarg</p>
              <p className="text-sun-300 text-[10.5px] font-semibold uppercase tracking-[0.14em]">Command Centre</p>
            </div>
          )}
        </div>

        {/* Main nav */}
        <nav className="relative flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          {!collapsed && (
            <p className="px-3 pb-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-white/40">Menu</p>
          )}
          {mainNavItems.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} collapsed={collapsed} />
          ))}
        </nav>

        {/* Divider + Settings */}
        <div className="relative px-3 pb-3">
          <div className="border-t border-white/10 mb-3" />
          {bottomNavItems.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} collapsed={collapsed} />
          ))}
        </div>

        {/* User bar */}
        {!collapsed && (
          <div className="relative px-3 pb-3">
            <div
              className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-white/[0.08] ring-1 ring-inset ring-white/10 hover:bg-white/[0.14] cursor-pointer"
              onClick={() => router.push('/dashboard/settings?tab=account')}
            >
              <div className="relative w-9 h-9 bg-gradient-to-br from-sun-300 to-sun-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-md shadow-black/10">
                <span className="text-blue-900 text-sm font-bold">{user?.name?.charAt(0)?.toUpperCase() ?? 'A'}</span>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-blue-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-[13px] font-medium truncate">{user?.name ?? 'Admin'}</p>
                <p className="text-white/55 text-[11px]">{user?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Wing Admin'}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleLogout(); }}
                className="p-1.5 rounded-lg text-white/50 hover:text-red-300 hover:bg-red-500/15 transition-colors"
                title="Logout"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        )}

        {/* Collapse toggle + version */}
        <div className={`relative px-3 pb-3 ${collapsed ? 'flex flex-col items-center' : ''}`}>
          <button
            onClick={toggleCollapsed}
            className="hidden lg:flex w-full items-center justify-center gap-2 p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors text-xs font-medium"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /><span>Collapse</span></>}
          </button>
          {!collapsed && <p className="text-white/30 text-[11px] text-center pb-1 mt-1">Made with 💛 · v1.0.0</p>}
        </div>
      </aside>

      {/* Header */}
      <header
        className={`no-print fixed top-0 right-0 left-0 h-16 flex items-center justify-between px-4 sm:px-6 z-10 transition-all duration-300 bg-white/70 backdrop-blur-xl backdrop-saturate-150 border-b ${
          scrolled ? 'border-gray-200/80 shadow-sm' : 'border-transparent'
        } ${collapsed ? 'lg:left-16' : 'lg:left-64'}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(x => !x)}
            className="lg:hidden p-2 -ml-1 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl"
          >
            <Menu size={18} />
          </button>

          {/* Breadcrumbs */}
          <nav className="flex items-center gap-1.5 text-sm min-w-0">
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1.5 min-w-0">
                {i > 0 && <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />}
                {i === breadcrumbs.length - 1 ? (
                  <span className="font-semibold text-gray-900 truncate">{crumb.label}</span>
                ) : (
                  <Link href={crumb.href} className="text-gray-500 hover:text-gray-900 truncate">
                    {crumb.label}
                  </Link>
                )}
              </span>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Search bar */}
          <button
            onClick={() => setSearchOpen(true)}
            className="hidden sm:flex items-center gap-2 pl-3 pr-2 py-1.5 w-56 bg-gray-100/80 hover:bg-gray-100 ring-1 ring-inset ring-gray-200/70 rounded-xl text-sm text-gray-400 transition-colors mr-1"
          >
            <Search size={14} />
            <span className="flex-1 text-left">Search…</span>
            <kbd className="text-[11px] text-gray-500 bg-white border border-gray-200 rounded-md px-1.5 font-mono shadow-xs">⌘K</kbd>
          </button>
          <button
            onClick={() => setSearchOpen(true)}
            className="sm:hidden p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl"
          >
            <Search size={18} />
          </button>

          <HelpButton />

          <Link
            href="/dashboard/notifications"
            className="relative p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold px-1 ring-2 ring-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>

          <div className="w-px h-6 bg-gray-200 mx-1.5" />

          <ProfileDropdown user={user} onLogout={handleLogout} />
        </div>
      </header>

      {/* Main content */}
      <main
        className={`pt-16 min-h-screen transition-all duration-300 ${collapsed ? 'lg:ml-16' : 'lg:ml-64'}`}
      >
        <div key={pathname} className="page-enter mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
