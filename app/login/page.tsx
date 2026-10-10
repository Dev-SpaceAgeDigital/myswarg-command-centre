'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

function isColdStartError(err: unknown): boolean {
  const e = err as { response?: { status?: number }; message?: string; code?: string };
  return (
    !e.response ||
    e.response.status === 502 ||
    e.response.status === 503 ||
    e.code === 'ERR_NETWORK' ||
    e.message === 'Network Error'
  );
}

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [connectingMsg, setConnectingMsg] = useState(false);
  const [error, setError] = useState('');
  const { sendOtp, verifyOtp, user } = useAuth();
  const router = useRouter();
  const connectingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (user) router.replace('/dashboard');
  }, [user, router]);

  useEffect(() => {
    if (loading) {
      connectingTimer.current = setTimeout(() => setConnectingMsg(true), 4000);
    } else {
      if (connectingTimer.current) clearTimeout(connectingTimer.current);
      setConnectingMsg(false);
    }
    return () => {
      if (connectingTimer.current) clearTimeout(connectingTimer.current);
    };
  }, [loading]);

  const handleSendOtp = async () => {
    setError('');
    const cleanPhone = phone.trim().replace(/\s/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      setError('Enter a valid 10-digit phone number.');
      return;
    }
    setLoading(true);
    try {
      await sendOtp(cleanPhone);
      setPhone(cleanPhone);
      setShowOtp(true);
      toast.success('OTP sent successfully');
    } catch (err: unknown) {
      if (isColdStartError(err)) {
        setError('Server is starting up, please wait...');
      } else {
        setError('Failed to send OTP. Check the phone number and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    try {
      setLoading(true);
      setError('');

      if (otpValue.length !== 6) {
        setError('Please enter the 6-digit OTP');
        return;
      }

      const cleanPhone = phone.trim().replace(/\s/g, '');
      await verifyOtp(cleanPhone, otpValue);

      setTimeout(() => {
        window.location.replace('/dashboard');
      }, 300);
    } catch (err: unknown) {
      console.error('Verify error:', err);
      if (isColdStartError(err)) {
        setError('Server is starting up, please wait...');
      } else {
        const e = err as { response?: { data?: { message?: string } }; message?: string };
        setError(e.response?.data?.message || e.message || 'Invalid OTP');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChangeNumber = () => {
    setShowOtp(false);
    setOtpValue('');
    setError('');
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[55%] flex-col justify-between relative overflow-hidden bg-hero p-12">
        <div className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
        <div className="absolute -top-32 -right-24 w-[420px] h-[420px] rounded-full bg-sun-400/25 blur-[110px]" />

        {/* Floating hearts */}
        {[
          { left: '12%', bottom: '18%', delay: '0s', size: 'text-lg' },
          { left: '38%', bottom: '8%', delay: '2.2s', size: 'text-2xl' },
          { left: '64%', bottom: '22%', delay: '4.1s', size: 'text-base' },
          { left: '84%', bottom: '10%', delay: '1.3s', size: 'text-xl' },
        ].map((h, i) => (
          <span
            key={i}
            className={`heart-drift pointer-events-none absolute ${h.size}`}
            style={{ left: h.left, bottom: h.bottom, animationDelay: h.delay }}
          >
            💛
          </span>
        ))}

        {/* Brand */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 bg-mint-50 rounded-2xl flex items-center justify-center shadow-lg shadow-black/20 ring-2 ring-white/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/mark.png" alt="MySwarg" className="w-9 h-9 object-contain" />
          </div>
          <div className="leading-tight">
            <p className="font-display text-white text-lg font-semibold tracking-tight">MySwarg</p>
            <p className="text-sun-300 text-[11px] font-semibold uppercase tracking-[0.14em]">Command Centre</p>
          </div>
        </div>

        {/* Hero copy */}
        <div className="relative z-10 max-w-lg animate-fade-up">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold text-blue-900 bg-sun-400 shadow-lg shadow-sun-500/30 mb-6">
            <span className="animate-wiggle inline-block">👋</span>
            Welcome home, admin
          </span>
          <h1 className="text-white text-[46px] leading-[1.08] font-semibold tracking-tight">
            Every home,{' '}
            <span className="relative inline-block text-sun-300">
              a little Swarg.
              <svg className="absolute left-0 -bottom-2 w-full" viewBox="0 0 200 12" fill="none" preserveAspectRatio="none">
                <path d="M2 9c40-6 120-8 196-3" stroke="#FFD32C" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
              </svg>
            </span>
          </h1>
          <p className="text-base text-white/70 mt-6 leading-relaxed">
            Manage societies, partners and subscriptions from a single powerful dashboard.
          </p>

          {/* Feature cards */}
          <div className="grid grid-cols-3 gap-3 mt-10">
            {[
              { emoji: '🏡', label: 'Multi-society', sub: 'Unified control' },
              { emoji: '🤝', label: 'Partner Network', sub: 'Grow your reach' },
              { emoji: '📈', label: 'Analytics', sub: 'Real-time insight' },
            ].map((f, i) => (
              <div
                key={f.label}
                className="rounded-2xl p-4 bg-white/10 ring-1 ring-inset ring-white/15 backdrop-blur-sm hover:bg-white/15 transition-colors"
                style={{ animation: `float 6s ease-in-out ${i * 0.8}s infinite` }}
              >
                <span className="text-2xl">{f.emoji}</span>
                <p className="text-white text-sm font-semibold mt-3">{f.label}</p>
                <p className="text-white/55 text-xs mt-0.5">{f.sub}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-white/40 text-xs">© 2026 MySwarg · Made with 💛 in India</p>
      </div>

      {/* Right panel */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-6 sm:px-10 py-12 bg-gradient-to-b from-mint-50 via-white to-white overflow-hidden">
        <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-sun-300/20 blur-3xl" />

        {/* Wordmark */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo.png" alt="MySwarg" className="relative w-40 mb-10 drop-shadow-sm" />

        <div className="relative w-full max-w-sm animate-fade-up">
          <h2 className="text-[28px] font-semibold tracking-tight text-gray-900 mb-1.5">
            {showOtp ? 'Check your phone 📱' : 'Welcome back 👋'}
          </h2>
          <p className="text-sm text-gray-500 mb-8">
            {showOtp ? 'Enter the 6-digit code we just sent you' : 'Sign in to your admin account'}
          </p>

          {connectingMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-blue-50 ring-1 ring-inset ring-blue-100 flex items-start gap-3">
              <div className="w-4 h-4 mt-0.5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600 flex-shrink-0" />
              <p className="text-sm text-blue-700">
                Connecting to server… (this may take 30 seconds on first load)
              </p>
            </div>
          )}

          {!showOtp ? (
            <>
              {/* Step 1: Phone input */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <div className="flex items-center bg-white border border-gray-200 rounded-xl h-12 overflow-hidden shadow-xs hover:border-gray-300 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all">
                  <span className="pl-4 pr-3 text-gray-600 text-sm font-medium border-r border-gray-200 h-full flex items-center gap-1.5 bg-gray-50">
                    🇮🇳 +91
                  </span>
                  <input
                    type="tel"
                    placeholder="10-digit mobile number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
                    className="flex-1 h-full px-4 text-sm tracking-wide outline-none bg-transparent"
                  />
                </div>
              </div>

              <button
                onClick={handleSendOtp}
                disabled={loading}
                className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading && <span className="w-4 h-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </button>
            </>
          ) : (
            <>
              {/* Step 2: OTP input */}
              <div className="flex items-center justify-between mb-5 p-3 rounded-xl bg-gray-50 ring-1 ring-inset ring-gray-200/70">
                <p className="text-sm text-gray-600">
                  Sent to{' '}
                  <span className="font-semibold text-gray-900">
                    +91 {phone}
                  </span>
                </p>
                <button
                  onClick={handleChangeNumber}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  Change Number
                </button>
              </div>
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-2">Enter OTP</label>
                <div className="space-y-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpValue}
                    onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                    className="w-full h-14 text-center text-2xl font-semibold tracking-[0.5em] bg-white border border-gray-200 rounded-xl focus:outline-none"
                    placeholder="• • • • • •"
                    autoFocus
                  />
                  {process.env.NODE_ENV === 'development' && (
                    <p className="text-xs text-gray-400 text-center">Dev OTP: 123456</p>
                  )}
                </div>
              </div>

              <button
                onClick={handleVerify}
                disabled={loading}
                className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading && <span className="w-4 h-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
                {loading ? 'Verifying...' : 'Verify & Login'}
              </button>
            </>
          )}

          {error && (
            <div className="mt-4 p-3.5 rounded-xl bg-red-50 ring-1 ring-inset ring-red-100 animate-fade-in">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <p className="mt-8 text-center text-xs text-gray-400">
            🔒 Protected by one-time password verification
          </p>
        </div>

        <p className="relative mt-auto pt-12 text-xs text-gray-400">MySwarg Command Centre v1.0</p>
      </div>
    </div>
  );
}
