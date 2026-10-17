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

type Step = 'phone' | 'pin' | 'code' | 'newpin';

const weakPin = (pin: string): string | null => {
  if (/^(\d)\1+$/.test(pin)) return 'Choose a PIN that is not all the same digit.';
  const d = pin.split('').map(Number);
  const up = d.every((v, i) => i === 0 || v === d[i - 1] + 1);
  const down = d.every((v, i) => i === 0 || v === d[i - 1] - 1);
  if (up || down) return 'Choose a PIN that is not a simple sequence like 123456.';
  return null;
};

function PrimaryButton({ onClick, loading, label, loadingLabel }: { onClick: () => void; loading: boolean; label: string; loadingLabel: string }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
    >
      {loading && <span className="w-4 h-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
      {loading ? loadingLabel : label}
    </button>
  );
}

export default function LoginPage() {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [code, setCode] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [connectingMsg, setConnectingMsg] = useState(false);
  const [error, setError] = useState('');
  const { checkPhone, loginWithPin, activate, user } = useAuth();
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

  const fail = (err: unknown, fallback: string) => {
    if (isColdStartError(err)) {
      setError('Server is starting up, please wait...');
      return;
    }
    const e = err as { response?: { data?: { message?: string } }; message?: string };
    setError(e.response?.data?.message || e.message || fallback);
  };

  const goHome = () => setTimeout(() => window.location.replace('/dashboard'), 300);

  const handleContinue = async () => {
    setError('');
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError('Enter a valid 10-digit mobile number.');
      return;
    }
    setLoading(true);
    try {
      const status = await checkPhone(phone);
      setPin(''); setCode(''); setNewPin(''); setConfirmPin('');
      setStep(status === 'ACTIVATE' ? 'code' : 'pin');
      if (status === 'NEEDS_CODE') {
        setError('This account has no PIN yet. Ask the platform owner for an activation code.');
        setStep('code');
      }
    } catch (err) {
      fail(err, 'Could not check this number. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePinLogin = async () => {
    setError('');
    if (pin.length !== 6) { setError('Your PIN has 6 digits.'); return; }
    setLoading(true);
    try {
      await loginWithPin(phone, pin);
      goHome();
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { code?: string } } };
      if (e.response?.status === 409 && e.response?.data?.code === 'NEEDS_ACTIVATION') {
        setStep('code');
        setError('');
      } else {
        setPin('');
        fail(err, 'Incorrect phone number or PIN.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCodeNext = () => {
    setError('');
    if (code.length !== 8) { setError('The activation code has 8 digits.'); return; }
    setStep('newpin');
  };

  const handleActivate = async () => {
    setError('');
    if (newPin.length !== 6) { setError('Your PIN must have 6 digits.'); return; }
    const weak = weakPin(newPin);
    if (weak) { setError(weak); return; }
    if (newPin !== confirmPin) { setError('The two PINs do not match.'); return; }
    setLoading(true);
    try {
      await activate(phone, code, newPin);
      goHome();
    } catch (err: unknown) {
      const e = err as { response?: { status?: number } };
      // A bad code sends them back to re-enter it; a bad PIN stays on this step.
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? '';
      if (e.response?.status === 400 && /code/i.test(msg)) { setCode(''); setStep('code'); }
      fail(err, 'Could not activate this account.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeNumber = () => {
    setStep('phone');
    setPin(''); setCode(''); setNewPin(''); setConfirmPin('');
    setError('');
  };

  const digits = (setter: (v: string) => void, max: number) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setter(e.target.value.replace(/\D/g, '').slice(0, max));

  const headings: Record<Step, [string, string]> = {
    phone: ['Welcome back 👋', 'Sign in to your admin account'],
    pin: ['Enter your PIN 🔐', 'Use the 6-digit PIN you chose'],
    code: ['Activate your account ✨', 'Enter the 8-digit code you were given'],
    newpin: ['Choose your PIN 🔑', 'You will use it every time you sign in'],
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
          <h2 className="text-[28px] font-semibold tracking-tight text-gray-900 mb-1.5">{headings[step][0]}</h2>
          <p className="text-sm text-gray-500 mb-8">{headings[step][1]}</p>

          {connectingMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-blue-50 ring-1 ring-inset ring-blue-100 flex items-start gap-3">
              <div className="w-4 h-4 mt-0.5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600 flex-shrink-0" />
              <p className="text-sm text-blue-700">
                Connecting to server… (this may take 30 seconds on first load)
              </p>
            </div>
          )}

          {step !== 'phone' && (
            <div className="flex items-center justify-between mb-5 p-3 rounded-xl bg-gray-50 ring-1 ring-inset ring-gray-200/70">
              <p className="text-sm font-semibold text-gray-900">+91 {phone}</p>
              <button onClick={handleChangeNumber} className="text-xs font-semibold text-blue-600 hover:text-blue-700">
                Change Number
              </button>
            </div>
          )}

          {step === 'phone' && (
            <>
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                <div className="flex items-center bg-white border border-gray-200 rounded-xl h-12 overflow-hidden shadow-xs hover:border-gray-300 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all">
                  <span className="pl-4 pr-3 text-gray-600 text-sm font-medium border-r border-gray-200 h-full flex items-center gap-1.5 bg-gray-50">
                    🇮🇳 +91
                  </span>
                  <input
                    type="tel"
                    placeholder="10-digit mobile number"
                    value={phone}
                    onChange={digits(setPhone, 10)}
                    onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
                    className="flex-1 h-full px-4 text-sm tracking-wide outline-none bg-transparent"
                    autoFocus
                  />
                </div>
              </div>
              <PrimaryButton onClick={handleContinue} loading={loading} label="Continue" loadingLabel="Checking..." />
            </>
          )}

          {step === 'pin' && (
            <>
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-2">PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="current-password"
                  maxLength={6}
                  value={pin}
                  onChange={digits(setPin, 6)}
                  onKeyDown={(e) => e.key === 'Enter' && handlePinLogin()}
                  className="w-full h-14 text-center text-2xl font-semibold tracking-[0.5em] bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500"
                  placeholder="••••••"
                  autoFocus
                />
              </div>
              <PrimaryButton onClick={handlePinLogin} loading={loading} label="Sign in" loadingLabel="Signing in..." />
              <button
                onClick={() => { setError(''); setStep('code'); }}
                className="mt-4 w-full text-center text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                I have an activation code
              </button>
              <p className="mt-2 text-center text-xs text-gray-400">
                Forgot your PIN? Ask the platform owner for a new activation code.
              </p>
            </>
          )}

          {step === 'code' && (
            <>
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-2">Activation code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={8}
                  value={code}
                  onChange={digits(setCode, 8)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCodeNext()}
                  className="w-full h-14 text-center text-2xl font-semibold tracking-[0.4em] bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500"
                  placeholder="• • • •  • • • •"
                  autoFocus
                />
              </div>
              <PrimaryButton onClick={handleCodeNext} loading={false} label="Next" loadingLabel="" />
              <button
                onClick={() => { setError(''); setStep('pin'); }}
                className="mt-4 w-full text-center text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                I already have a PIN
              </button>
            </>
          )}

          {step === 'newpin' && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">New PIN (6 digits)</label>
                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="new-password"
                  maxLength={6}
                  value={newPin}
                  onChange={digits(setNewPin, 6)}
                  className="w-full h-14 text-center text-2xl font-semibold tracking-[0.5em] bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500"
                  placeholder="••••••"
                  autoFocus
                />
              </div>
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirm PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="new-password"
                  maxLength={6}
                  value={confirmPin}
                  onChange={digits(setConfirmPin, 6)}
                  onKeyDown={(e) => e.key === 'Enter' && handleActivate()}
                  className="w-full h-14 text-center text-2xl font-semibold tracking-[0.5em] bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500"
                  placeholder="••••••"
                />
              </div>
              <PrimaryButton onClick={handleActivate} loading={loading} label="Set PIN & sign in" loadingLabel="Activating..." />
            </>
          )}

          {error && (
            <div className="mt-4 p-3.5 rounded-xl bg-red-50 ring-1 ring-inset ring-red-100 animate-fade-in">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <p className="mt-8 text-center text-xs text-gray-400">
            🔒 Protected by PIN sign-in and one-time activation codes
          </p>
        </div>

        <p className="relative mt-auto pt-12 text-xs text-gray-400">MySwarg Command Centre v1.0</p>
      </div>
    </div>
  );
}
