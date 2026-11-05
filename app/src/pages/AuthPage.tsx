import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import gsap from 'gsap';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Recycle,
  ShieldCheck,
  Sparkles,
  Sprout,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { LogoMark } from '@/components/illustrations';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/features/auth/AuthContext';
import {
  loginSchema,
  registerSchema,
  type LoginFormValues,
  type RegisterFormValues,
} from '@/features/auth/schemas';
import { cn } from '@/lib/utils';
import './AuthPage.css';

export function AuthPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialMode =
    searchParams.get('mode') === 'register' ? 'register' : 'login';
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [registrationNotice, setRegistrationNotice] = useState<string | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const formContentRef = useRef<HTMLDivElement | null>(null);

  const { user, signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/app', { replace: true });
    }
  }, [user, navigate]);

  // GSAP initial entrance animation
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      gsap.defaults({ ease: 'expo.out', force3D: true });
      const tl = gsap.timeline();
      tl.fromTo(
        '[data-gsap="auth-card"]',
        { autoAlpha: 0, y: 20, scale: 0.985 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 0.95 }
      )
        .fromTo(
          '[data-gsap="auth-left-item"]',
          { autoAlpha: 0, y: 16 },
          { autoAlpha: 1, y: 0, duration: 0.85, stagger: 0.08 },
          '-=0.72'
        )
        .fromTo(
          '[data-gsap="auth-photo"]',
          { autoAlpha: 0, scale: 0.97, y: 16 },
          { autoAlpha: 1, scale: 1, y: 0, duration: 0.95 },
          '-=0.7'
        )
        .fromTo(
          '[data-gsap="auth-photo-img"]',
          { scale: 1.08 },
          {
            scale: 1,
            duration: 1.35,
            clearProps: 'transform,willChange',
          },
          '-=0.95'
        )
        .fromTo(
          '[data-gsap="auth-right"]',
          { autoAlpha: 0, x: 16 },
          { autoAlpha: 1, x: 0, duration: 0.9 },
          '-=1.05'
        );
    }, root);

    return () => ctx.revert();
  }, []);

  const switchAuthMode = (nextMode: 'login' | 'register') => {
    if (nextMode === mode) return;
    setMode(nextMode);
    setServerError(null);
    setRegistrationNotice(null);
    setSearchParams(nextMode === 'register' ? { mode: 'register' } : {});

    if (formContentRef.current) {
      gsap.killTweensOf(formContentRef.current);
      gsap.fromTo(
        formContentRef.current,
        { autoAlpha: 0, y: 10 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.55,
          ease: 'expo.out',
          force3D: true,
          clearProps: 'transform',
        }
      );
    }
  };

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
    },
  });

  async function onLoginSubmit(values: LoginFormValues) {
    setServerError(null);
    setIsSubmitting(true);
    try {
      const { error } = await signIn(values);
      if (error) {
        setServerError(error);
        return;
      }
      toast.success('Selamat datang kembali di SirkulaFood!');
      navigate('/app');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onRegisterSubmit(values: RegisterFormValues) {
    setServerError(null);
    setRegistrationNotice(null);
    setIsSubmitting(true);
    try {
      const { error, requiresEmailConfirmation } = await signUp(values);
      if (error) {
        setServerError(error);
        return;
      }
      if (requiresEmailConfirmation) {
        setRegistrationNotice(
          'Pendaftaran diterima. Cek inbox dan folder spam untuk tautan verifikasi, lalu masuk setelah email terverifikasi.'
        );
        return;
      }
      toast.success('Akun berhasil dibuat!');
      navigate('/app');
    } catch {
      setServerError(
        'Permintaan pendaftaran gagal dikirim. Periksa koneksi internet lalu coba lagi.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    const { error } = await resetPassword(resetEmail);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('Tautan atur ulang kata sandi telah dikirim ke email kamu.');
    setForgotOpen(false);
  }

  return (
    <div
      ref={containerRef}
      className="auth-page min-h-dvh px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 flex items-center justify-center"
    >
      <div
        data-gsap="auth-card"
        className="mx-auto grid w-full max-w-[1240px] overflow-hidden rounded-[28px] border border-[#cde0d2] bg-white shadow-xl lg:min-h-[760px] lg:grid-cols-[1.02fr_0.98fr]"
      >
        {/* Left Visual Showcase Panel */}
        <section className="auth-showcase-panel flex flex-col justify-between p-7 text-white sm:p-10 lg:p-12">
          <div className="space-y-7">
            <div
              data-gsap="auth-left-item"
              className="flex flex-wrap items-center justify-between gap-3"
            >
              <Link to="/" className="inline-flex items-center gap-2.5 group">
                <LogoMark className="size-9 transition-transform group-hover:scale-105" />
                <span className="text-xl font-bold tracking-tight text-white">
                  Sirkula<span className="text-[#74e39a]">Food</span>
                </span>
              </Link>

              <Link
                to="/"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-[#e2f3e8] backdrop-blur-xs transition-colors hover:bg-white/20 hover:text-white"
              >
                <ArrowLeft className="size-3.5" aria-hidden="true" />
                <span>Kembali ke Beranda</span>
              </Link>
            </div>

            <div className="space-y-4 pt-2">
              <span
                data-gsap="auth-left-item"
                className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#8ce9af]"
              >
                <Sprout className="size-3.5" aria-hidden="true" />
                <span>
                  {mode === 'register'
                    ? 'Bergabung Bersama SirkulaFood'
                    : 'Ekosistem Sirkular Pangan'}
                </span>
              </span>

              <h1
                data-gsap="auth-left-item"
                className="max-w-lg text-3xl font-extrabold leading-[1.15] tracking-tight text-white sm:text-4xl"
              >
                {mode === 'register' ? (
                  <>
                    Mulai Ubah Sisa Makanan Menjadi{' '}
                    <span className="relative inline-block text-[#74e39a]">
                      Berkah
                      <svg
                        className="-bottom-1.5 left-0 w-full text-[#52b788]"
                        viewBox="0 0 180 12"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                      >
                        <path
                          d="M3 8.5C22 2.5 41 11.5 60 6.5C79 1.5 98 10.5 117 5.5C136 0.5 155 9.5 177 4.5"
                          stroke="currentColor"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>{' '}
                    Hari Ini
                  </>
                ) : (
                  <>
                    Selamat Datang Kembali di Gerakan{' '}
                    <span className="relative inline-block text-[#74e39a]">
                      Sirkular
                      <svg
                        className="-bottom-1.5 left-0 w-full text-[#52b788]"
                        viewBox="0 0 180 12"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                      >
                        <path
                          d="M3 8.5C22 2.5 41 11.5 60 6.5C79 1.5 98 10.5 117 5.5C136 0.5 155 9.5 177 4.5"
                          stroke="currentColor"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                  </>
                )}
              </h1>

              <p
                data-gsap="auth-left-item"
                className="max-w-md text-sm leading-relaxed text-[#cbe2d4] sm:text-[15px]"
              >
                Catat sisa makanan harian, kenali pola pemborosan bersama AI Gemini, dan salurkan limbah organik ke 7 jalur pengolahan berkelanjutan.
              </p>

              <ul
                data-gsap="auth-left-item"
                className="grid gap-2.5 pt-2 text-xs font-medium text-[#e7f5ec] sm:text-sm"
              >
                <li className="flex items-center gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#16783F] text-[#74e39a]">
                    <Check className="size-3.5" aria-hidden="true" />
                  </span>
                  <span>Catat berat, kondisi, dan sumber sisa makanan dengan mudah</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#16783F] text-[#74e39a]">
                    <Sparkles className="size-3.5" aria-hidden="true" />
                  </span>
                  <span>Analisis pola & saran pencegahan bersama AI Gemini</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#16783F] text-[#74e39a]">
                    <Recycle className="size-3.5" aria-hidden="true" />
                  </span>
                  <span>Panduan kompos, maggot BSF, pakan ternak, eco-enzyme & biogas</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Framed Photo with Floating Badge */}
          <div data-gsap="auth-photo" className="auth-photo-showcase mt-8">
            <img
              data-gsap="auth-photo-img"
              src="https://images.pexels.com/photos/31416063/pexels-photo-31416063.jpeg?auto=compress&cs=tinysrgb&w=1400"
              alt="Tangan memilah sisa sayuran organik untuk diolah menjadi kompos"
              className="auth-photo"
              loading="lazy"
            />
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#051f11]/85 via-[#051f11]/20 to-transparent"
              aria-hidden="true"
            />
            <div className="absolute inset-x-4 bottom-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/25 bg-white/95 px-4 py-3 text-[#0f2418] shadow-lg backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#d8f3dc] text-[#16783F]">
                  <ShieldCheck className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-[11px] font-bold text-[#0b3b24]">
                    7 Jalur Pengolahan Sirkular
                  </p>
                  <p className="text-[10px] text-[#52645a]">
                    Keamanan pangan & isolasi data RLS terjaga
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-[#e3f4e9] px-2.5 py-1 text-[10px] font-extrabold text-[#16783F]">
                Aktif 24/7
              </span>
            </div>
          </div>
        </section>

        {/* Right User-Friendly Form Section */}
        <section
          data-gsap="auth-right"
          className="flex items-center justify-center bg-[#fcfefd] p-6 sm:p-10 lg:p-12"
        >
          <div className="w-full max-w-[440px] space-y-6">
            {/* Segmented Pill Toggle: Masuk / Daftar */}
            <div
              role="tablist"
              aria-label="Pilih masuk atau daftar akun"
              className="grid grid-cols-2 rounded-2xl border border-[#dce8df] bg-[#eff6f1] p-1.5"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'login'}
                onClick={() => switchAuthMode('login')}
                className={cn(
                  'rounded-xl py-2.5 text-xs sm:text-sm font-bold transition-all',
                  mode === 'login'
                    ? 'bg-[#0b3b24] text-white shadow-sm'
                    : 'text-[#4a5d52] hover:text-[#0f2418]'
                )}
              >
                Masuk ke Akun
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'register'}
                onClick={() => switchAuthMode('register')}
                className={cn(
                  'rounded-xl py-2.5 text-xs sm:text-sm font-bold transition-all',
                  mode === 'register'
                    ? 'bg-[#0b3b24] text-white shadow-sm'
                    : 'text-[#4a5d52] hover:text-[#0f2418]'
                )}
              >
                Daftar Akun Baru
              </button>
            </div>

            <div ref={formContentRef}>
              {mode === 'login' ? (
                <form
                  onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                  noValidate
                  className="space-y-4"
                >
                  <div>
                    <h2 className="text-2xl font-extrabold tracking-tight text-[#0c2617]">
                      Masuk ke akunmu
                    </h2>
                    <p className="mt-1 text-xs text-[#52645a]">
                      Masukkan email dan kata sandi untuk mengakses dashboard pengelolaan limbahmu.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="login-email"
                      className="text-xs font-bold text-[#14231a]"
                    >
                      Alamat Email
                    </Label>
                    <div className="relative">
                      <Mail
                        className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2"
                        aria-hidden="true"
                      />
                      <Input
                        id="login-email"
                        type="email"
                        autoComplete="email"
                        placeholder="nama@email.com"
                        className="pl-10 h-11 rounded-xl bg-white border-[#cde0d2]"
                        {...loginForm.register('email')}
                      />
                    </div>
                    {loginForm.formState.errors.email ? (
                      <p className="text-xs font-medium text-[#A32B1F]">
                        {loginForm.formState.errors.email.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="login-password"
                        className="text-xs font-bold text-[#14231a]"
                      >
                        Kata Sandi
                      </Label>
                      <button
                        type="button"
                        onClick={() => setForgotOpen(true)}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        Lupa kata sandi?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock
                        className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2"
                        aria-hidden="true"
                      />
                      <Input
                        id="login-password"
                        type={showLoginPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        placeholder="Masukkan kata sandi"
                        className="pl-10 pr-10 h-11 rounded-xl bg-white border-[#cde0d2]"
                        {...loginForm.register('password')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword((prev) => !prev)}
                        aria-label={
                          showLoginPassword
                            ? 'Sembunyikan kata sandi'
                            : 'Tampilkan kata sandi'
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showLoginPassword ? (
                          <EyeOff className="size-4" aria-hidden="true" />
                        ) : (
                          <Eye className="size-4" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                    {loginForm.formState.errors.password ? (
                      <p className="text-xs font-medium text-[#A32B1F]">
                        {loginForm.formState.errors.password.message}
                      </p>
                    ) : null}
                  </div>

                  {serverError ? (
                    <div
                      role="alert"
                      className="flex items-start gap-2.5 rounded-xl border border-[#f5c2bc] bg-[#FCE6E3] p-3 text-xs font-medium text-[#A32B1F]"
                    >
                      <AlertTriangle
                        className="size-4 shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <span>{serverError}</span>
                    </div>
                  ) : null}

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-11 rounded-full bg-[#0b3b24] hover:bg-primary text-white font-bold shadow-sm"
                  >
                    <span>{isSubmitting ? 'Memproses...' : 'Masuk Sekarang'}</span>
                    <ArrowRight className="size-4 ml-1.5" aria-hidden="true" />
                  </Button>

                  <p className="text-center text-xs text-[#52645a]">
                    Belum punya akun?{' '}
                    <button
                      type="button"
                      onClick={() => switchAuthMode('register')}
                      className="font-bold text-primary hover:underline"
                    >
                      Daftar akun baru gratis
                    </button>
                  </p>
                </form>
              ) : (
                <form
                  onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
                  noValidate
                  className="space-y-4"
                >
                  <div>
                    <h2 className="text-2xl font-extrabold tracking-tight text-[#0c2617]">
                      Buat akun baru
                    </h2>
                    <p className="mt-1 text-xs text-[#52645a]">
                      Daftar dalam 30 detik untuk mulai mencatat dan mengelola sisa makananmu.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="reg-name"
                      className="text-xs font-bold text-[#14231a]"
                    >
                      Nama Lengkap
                    </Label>
                    <div className="relative">
                      <User
                        className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2"
                        aria-hidden="true"
                      />
                      <Input
                        id="reg-name"
                        type="text"
                        autoComplete="name"
                        placeholder="Contoh: Radit Pratama"
                        className="pl-10 h-11 rounded-xl bg-white border-[#cde0d2]"
                        {...registerForm.register('fullName')}
                      />
                    </div>
                    {registerForm.formState.errors.fullName ? (
                      <p className="text-xs font-medium text-[#A32B1F]">
                        {registerForm.formState.errors.fullName.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="reg-email"
                      className="text-xs font-bold text-[#14231a]"
                    >
                      Alamat Email
                    </Label>
                    <div className="relative">
                      <Mail
                        className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2"
                        aria-hidden="true"
                      />
                      <Input
                        id="reg-email"
                        type="email"
                        autoComplete="email"
                        placeholder="nama@email.com"
                        className="pl-10 h-11 rounded-xl bg-white border-[#cde0d2]"
                        {...registerForm.register('email')}
                      />
                    </div>
                    {registerForm.formState.errors.email ? (
                      <p className="text-xs font-medium text-[#A32B1F]">
                        {registerForm.formState.errors.email.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="reg-password"
                        className="text-xs font-bold text-[#14231a]"
                      >
                        Kata Sandi
                      </Label>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                        <CheckCircle2
                          className="size-3 text-[#16783F]"
                          aria-hidden="true"
                        />
                        <span>Minimal 8 karakter</span>
                      </span>
                    </div>
                    <div className="relative">
                      <Lock
                        className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2"
                        aria-hidden="true"
                      />
                      <Input
                        id="reg-password"
                        type={showRegPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="Buat kata sandi (min. 8 karakter)"
                        className="pl-10 pr-10 h-11 rounded-xl bg-white border-[#cde0d2]"
                        {...registerForm.register('password')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword((prev) => !prev)}
                        aria-label={
                          showRegPassword
                            ? 'Sembunyikan kata sandi'
                            : 'Tampilkan kata sandi'
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showRegPassword ? (
                          <EyeOff className="size-4" aria-hidden="true" />
                        ) : (
                          <Eye className="size-4" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                    {registerForm.formState.errors.password ? (
                      <p className="text-xs font-medium text-[#A32B1F]">
                        {registerForm.formState.errors.password.message}
                      </p>
                    ) : null}
                  </div>

                  {serverError ? (
                    <div
                      role="alert"
                      className="flex items-start gap-2.5 rounded-xl border border-[#f5c2bc] bg-[#FCE6E3] p-3 text-xs font-medium text-[#A32B1F]"
                    >
                      <AlertTriangle
                        className="size-4 shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <span>{serverError}</span>
                    </div>
                  ) : null}

                  {registrationNotice ? (
                    <div
                      role="status"
                      className="flex items-start gap-2.5 rounded-xl border border-[#b7e2c6] bg-[#E3F4E9] p-3 text-xs font-medium text-[#0F4D2E]"
                    >
                      <Check
                        className="size-4 shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <span>{registrationNotice}</span>
                    </div>
                  ) : null}

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-11 rounded-full bg-[#0b3b24] hover:bg-primary text-white font-bold shadow-sm"
                  >
                    <span>
                      {isSubmitting ? 'Membuat akun...' : 'Buat Akun SirkulaFood'}
                    </span>
                    <ArrowRight className="size-4 ml-1.5" aria-hidden="true" />
                  </Button>

                  <p className="text-center text-xs text-[#52645a]">
                    Sudah punya akun?{' '}
                    <button
                      type="button"
                      onClick={() => switchAuthMode('login')}
                      className="font-bold text-primary hover:underline"
                    >
                      Masuk di sini
                    </button>
                  </p>
                </form>
              )}
            </div>

            <p className="text-center text-[11px] text-muted-foreground">
              Dengan menggunakan SirkulaFood, kamu menyetujui{' '}
              <button
                type="button"
                onClick={() => setTermsOpen(true)}
                className="font-semibold underline hover:text-primary"
              >
                Syarat & Kebijakan Privasi
              </button>
              .
            </p>
          </div>
        </section>

        {/* Dialog Lupa Kata Sandi */}
        <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
          <DialogContent className="rounded-2xl max-w-sm">
            <DialogHeader>
              <DialogTitle>Atur ulang kata sandi</DialogTitle>
              <DialogDescription>
                Masukkan email akunmu untuk menerima tautan atur ulang kata sandi.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleResetSubmit} className="space-y-4 pt-2">
              <Input
                type="email"
                required
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="nama@email.com"
                className="rounded-xl"
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setForgotOpen(false)}
                  className="rounded-xl"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  className="rounded-xl bg-primary hover:bg-sf-dark text-white"
                >
                  Kirim tautan
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog Syarat & Kebijakan Privasi */}
        <Dialog open={termsOpen} onOpenChange={setTermsOpen}>
          <DialogContent className="rounded-2xl max-w-md">
            <DialogHeader>
              <DialogTitle>Syarat & Kebijakan Privasi SirkulaFood</DialogTitle>
              <DialogDescription>
                Prinsip keamanan data dan pengelolaan sisa makanan harian.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2.5 text-xs leading-relaxed text-muted-foreground">
              <p>
                1. Data porsi, berat sisa, dan tindakan sirkular dibatasi hanya
                untuk akunmu melalui Row Level Security (RLS), serta dapat
                dipantau secara agregat oleh Admin Platform.
              </p>
              <p>
                2. Fitur AI Insights hanya menganalisis metrik deterministik
                catatan limbah untuk memberikan rekomendasi pencegahan dan
                pengolahan sirkular.
              </p>
              <p>
                3. Sistem mengunci sisa makan di piring agar tidak pernah
                direkomendasikan untuk konsumsi manusia.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
