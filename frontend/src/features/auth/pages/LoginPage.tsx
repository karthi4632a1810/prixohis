import { zodResolver } from '@hookform/resolvers/zod'
import {
  LockKeyhole,
  Moon,
  ShieldCheck,
  Sun,
  UserRound,
  UserRoundPlus,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { errorMessage } from '../../../api/axios'
import { outerNavigate, useOuterPath } from '../../../lib/outerHistory'
import { useTheme } from '../../../lib/ThemeContext'
import { useAuth } from '../AuthContext'

const schema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})
type FormValues = z.infer<typeof schema>

/** The `?from=` deep-link param, if the user was bounced here from a protected route — null otherwise. */
function fromParam(outerPath: string): string | null {
  const query = new URLSearchParams(outerPath.split('?')[1] ?? '')
  return query.get('from')
}

export function LoginPage() {
  const { status, user, login } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const outerPath = useOuterPath()
  const [serverError, setServerError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)

  useEffect(() => {
    // A specific deep link always wins; otherwise land on this user's configured default
    // page once authenticated.
    if (status === 'authenticated') {
      outerNavigate(fromParam(outerPath) ?? user?.defaultLandingPath ?? '/', { replace: true })
    }
  }, [status, outerPath, user])

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      username: '',
      password: '',
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null)
    setInfoMessage(null)
    try {
      const loggedInUser = await login(values)
      outerNavigate(
        loggedInUser.mustChangePassword
          ? '/change-password'
          : (fromParam(outerPath) ?? loggedInUser.defaultLandingPath ?? '/'),
        { replace: true },
      )
    } catch (error) {
      setServerError(errorMessage(error))
    }
  })

  // Role quick-fill credentials helper
  const quickFill = (uname: string, pass: string) => {
    setValue('username', uname, { shouldValidate: true })
    setValue('password', pass, { shouldValidate: true })
    setServerError(null)
  }

  return (
    <div className="relative flex min-h-screen bg-[#f7f2ec] text-[#191919] dark:bg-[#141414] dark:text-[#ebe8e3] antialiased">
      {/* Floating Theme Toggle (top-right) */}
      <button
        type="button"
        onClick={toggleTheme}
        title="Toggle dark/light theme"
        className="absolute top-5 right-5 z-30 flex size-9 items-center justify-center rounded-full border border-black/10 bg-white/80 text-[#67748e] shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:text-[#191919] dark:border-white/10 dark:bg-[#1f1f1f]/80 dark:text-[#a09a90] dark:hover:bg-[#252525] dark:hover:text-white"
      >
        {theme === 'dark' ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
      </button>

      {/* ================= LEFT HERO PANEL ================= */}
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-gradient-to-br from-[#121110] via-[#1a1816] to-[#0f0e0d] p-10 lg:flex xl:p-14 text-white">
        {/* Subtle grid pattern background */}
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            maskImage: 'radial-gradient(ellipse at 50% 50%, black 40%, transparent 85%)',
          }}
          aria-hidden
        />

        {/* Ambient Warm Glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(750px 550px at 85% 85%, rgba(198, 99, 40, 0.24), transparent 60%), radial-gradient(500px 400px at 15% 15%, rgba(198, 99, 40, 0.12), transparent 50%)',
          }}
          aria-hidden
        />

        {/* Concentric radar circle lines in bottom-right corner */}
        <svg
          className="pointer-events-none absolute -bottom-20 -right-20 h-[480px] w-[480px] opacity-25"
          viewBox="0 0 400 400"
          fill="none"
          aria-hidden
        >
          <circle cx="200" cy="200" r="50" stroke="#c66328" strokeWidth="1" strokeDasharray="3 3" />
          <circle cx="200" cy="200" r="95" stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
          <circle cx="200" cy="200" r="145" stroke="rgba(255,255,255,0.14)" strokeWidth="1" strokeDasharray="4 4" />
          <circle cx="200" cy="200" r="195" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          <circle cx="200" cy="200" r="245" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        </svg>

        {/* Left Top Header: Transvaal Logo + Status Badge */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo-dark.svg"
              alt="Transvaal Global Tech"
              className="h-8 md:h-9 w-auto max-w-[220px] object-contain"
            />
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1 text-xs font-semibold text-emerald-300 backdrop-blur-md shadow-sm">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
            </span>
            <span>All systems operational</span>
          </div>
        </div>

        {/* Left Center: Headline, Subtitle, and 2x2 Feature Cards */}
        <div className="relative z-10 my-auto max-w-xl py-8">
          <div className="text-[11px] font-extrabold tracking-[0.22em] text-[#c6a15b] uppercase">
            HOSPITAL INFORMATION SYSTEM
          </div>

          <h1 className="font-display mt-3 text-[44px] font-extrabold leading-[1.08] tracking-tight text-white xl:text-[52px]">
            Unified care,
            <br />
            <span className="bg-gradient-to-r from-[#e08343] to-[#c66328] bg-clip-text text-transparent">
              one platform.
            </span>
          </h1>

          <p className="mt-4 max-w-lg text-[14px] leading-relaxed text-white/65">
            Registration, OPD, IPD, diagnostics, pharmacy, billing and every clinical workflow your hospital runs
            on — in a single connected workspace.
          </p>

          {/* 2x2 Clinical Workflow Badges */}
          <div className="mt-8 grid grid-cols-2 gap-3.5 max-w-md">
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 px-3.5 backdrop-blur-sm transition hover:border-[#c66328]/40 hover:bg-white/[0.06]">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-[#c66328]/35 bg-[#c66328]/20 text-xs font-bold text-[#e08343]">
                ◆
              </div>
              <span className="text-[13px] font-semibold text-white/90">OPD & IPD</span>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 px-3.5 backdrop-blur-sm transition hover:border-[#c66328]/40 hover:bg-white/[0.06]">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-[#c66328]/35 bg-[#c66328]/20 text-xs font-bold text-[#e08343]">
                ＋
              </div>
              <span className="text-[13px] font-semibold text-white/90">Pharmacy</span>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 px-3.5 backdrop-blur-sm transition hover:border-[#c66328]/40 hover:bg-white/[0.06]">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-[#c66328]/35 bg-[#c66328]/20 text-xs font-bold text-[#e08343]">
                ◎
              </div>
              <span className="text-[13px] font-semibold text-white/90">Diagnostics & Labs</span>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 px-3.5 backdrop-blur-sm transition hover:border-[#c66328]/40 hover:bg-white/[0.06]">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-[#c66328]/35 bg-[#c66328]/20 text-xs font-bold text-[#e08343]">
                ▭
              </div>
              <span className="text-[13px] font-semibold text-white/90">Billing & Claims</span>
            </div>
          </div>
        </div>

        {/* Left Bottom Stats & Compliance Row */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6">
          <div className="flex items-center gap-7 sm:gap-10">
            <div>
              <div className="font-display text-lg font-bold text-white leading-tight">99.9%</div>
              <div className="text-[10px] font-bold tracking-widest text-white/45 uppercase mt-0.5">UPTIME</div>
            </div>
            <div>
              <div className="font-display text-lg font-bold text-white leading-tight">40+</div>
              <div className="text-[10px] font-bold tracking-widest text-white/45 uppercase mt-0.5">MODULES</div>
            </div>
            <div>
              <div className="font-display text-lg font-bold text-white leading-tight">24×7</div>
              <div className="text-[10px] font-bold tracking-widest text-white/45 uppercase mt-0.5">SUPPORT</div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-white/45">
            <ShieldCheck className="size-3.5" aria-hidden />
            <span>NABH-ready audit trail</span>
          </div>
        </div>
      </div>

      {/* ================= RIGHT FORM PANEL ================= */}
      <div className="flex flex-1 flex-col items-center justify-center px-5 py-12 lg:w-[480px] lg:flex-none xl:w-[520px]">
        {/* Floating White Login Card */}
        <div className="w-full max-w-[420px] rounded-[28px] border border-black/[0.06] bg-white p-7 sm:p-9 shadow-[0_20px_50px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.03)] dark:border-white/10 dark:bg-[#1f1f1f]">
          {/* Top Brand Mark on Mobile (lg:hidden) */}
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <img src="/logo-dark.svg" alt="Transvaal" className="h-7 w-auto invert dark:invert-0" />
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-50 px-2.5 py-0.5 text-[10.5px] font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Live
            </span>
          </div>

          {/* User Icon Badge */}
          <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#c66328] to-[#9e4f20] text-white shadow-[0_10px_22px_-8px_rgba(198,99,40,0.6)]">
            <UserRoundPlus className="size-5.5 stroke-[2.2]" aria-hidden />
          </div>

          {/* Heading */}
          <h2 className="font-display text-2xl font-extrabold tracking-tight text-[#191919] dark:text-white">
            Welcome back
          </h2>
          <p className="mt-1 mb-6 text-[13px] text-[#67748e] dark:text-[#a09a90]">
            Sign in to your hospital dashboard
          </p>

          {/* Server Error Alert */}
          {serverError && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400" role="alert">
              {serverError}
            </div>
          )}

          {/* Informational Message */}
          {infoMessage && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-400" role="status">
              {infoMessage}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={onSubmit} className="space-y-4">
            {/* USERNAME */}
            <div>
              <label
                htmlFor="username"
                className="mb-1.5 block text-[11px] font-extrabold tracking-wider text-[#67748e] uppercase dark:text-[#a09a90]"
              >
                USERNAME
              </label>
              <div className="relative flex items-center rounded-xl border border-[#e5e9f2] bg-[#f0f4ff]/80 transition focus-within:border-[#c66328] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#c66328]/12 dark:border-white/10 dark:bg-[#141414] dark:focus-within:bg-[#191919]">
                <UserRound className="pointer-events-none ml-3.5 size-4 text-[#8a94ad]" aria-hidden />
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  autoFocus
                  placeholder="e.g. admin or staff ID"
                  className="w-full bg-transparent py-2.5 pl-2.5 pr-3 text-sm font-medium text-[#191919] outline-none placeholder:text-[#8a94ad] dark:text-white"
                  {...register('username')}
                />
              </div>
              {errors.username && (
                <span className="mt-1 block text-xs font-semibold text-red-600">{errors.username.message}</span>
              )}
            </div>

            {/* PASSWORD */}
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-[11px] font-extrabold tracking-wider text-[#67748e] uppercase dark:text-[#a09a90]"
              >
                PASSWORD
              </label>
              <div className="relative flex items-center rounded-xl border border-[#e5e9f2] bg-white transition focus-within:border-[#c66328] focus-within:ring-4 focus-within:ring-[#c66328]/12 dark:border-white/10 dark:bg-[#141414]">
                <LockKeyhole className="pointer-events-none ml-3.5 size-4 text-[#8a94ad]" aria-hidden />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className="w-full bg-transparent py-2.5 pl-2.5 pr-14 text-sm font-medium text-[#191919] outline-none placeholder:text-[#8a94ad] dark:text-white"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-xs font-bold text-[#191919] hover:text-[#c66328] dark:text-white transition"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {errors.password && (
                <span className="mt-1 block text-xs font-semibold text-red-600">{errors.password.message}</span>
              )}
            </div>

            {/* Options: Remember Me & Forgot Password */}
            <div className="flex items-center justify-between pt-0.5 text-xs">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-[#67748e] dark:text-[#a09a90] select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="size-3.5 rounded border-[#e5e9f2] text-[#c66328] accent-[#c66328] focus:ring-[#c66328]"
                />
                <span>Remember me</span>
              </label>

              <button
                type="button"
                onClick={() => setInfoMessage('Contact your Hospital IT Administrator or Supervisor to reset your password.')}
                className="font-bold text-[#c66328] hover:text-[#9e4f20] hover:underline transition"
              >
                Forgot password?
              </button>
            </div>

            {/* Sign in Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#c66328] to-[#9e4f20] py-3 text-sm font-bold text-white shadow-[0_12px_24px_-8px_rgba(198,99,40,0.6)] hover:from-[#d97736] hover:to-[#b85b23] active:translate-y-px transition-all disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Signing in…</span>
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {/* Divider: OR CONTINUE WITH */}
          <div className="relative my-5 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#e5e9f2] dark:border-white/10" />
            </div>
            <span className="relative bg-white px-3 text-[10px] font-extrabold tracking-widest text-[#a09a90] uppercase dark:bg-[#1f1f1f]">
              OR CONTINUE WITH
            </span>
          </div>

          {/* SSO Buttons (Google & Microsoft) */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setInfoMessage('Google SSO integration is routed through your organization identity provider.')}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#e5e9f2] bg-white py-2.5 px-3 text-xs font-bold text-[#191919] shadow-sm hover:border-[#dcc7a8] hover:bg-[#fdf8f2] dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 transition"
            >
              <svg className="size-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.94 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Google</span>
            </button>

            <button
              type="button"
              onClick={() => setInfoMessage('Microsoft Azure AD SSO is routed through your Azure active directory.')}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#e5e9f2] bg-white py-2.5 px-3 text-xs font-bold text-[#191919] shadow-sm hover:border-[#dcc7a8] hover:bg-[#fdf8f2] dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 transition"
            >
              <svg className="size-4" viewBox="0 0 23 23">
                <path fill="#f35325" d="M1 1h10v10H1z" />
                <path fill="#81bc06" d="M12 1h10v10H12z" />
                <path fill="#05a6f0" d="M1 12h10v10H1z" />
                <path fill="#ffba08" d="M12 12h10v10H12z" />
              </svg>
              <span>Microsoft</span>
            </button>
          </div>

          {/* Quick-fill Role Pills */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => quickFill('Durgaram_frontoffice', 'Prixo@123')}
              className="rounded-full bg-[#faede4] px-3.5 py-1 text-xs font-bold text-[#9e4f20] hover:bg-[#f5dfd0] dark:bg-[#9e4f20]/25 dark:text-[#e0a989] transition shadow-xs"
              title="Click to fill Front Office credentials"
            >
              Front Office
            </button>

            <button
              type="button"
              onClick={() => quickFill('ramesh.sharma', 'Prixo@123')}
              className="rounded-full bg-[#faede4] px-3.5 py-1 text-xs font-bold text-[#9e4f20] hover:bg-[#f5dfd0] dark:bg-[#9e4f20]/25 dark:text-[#e0a989] transition shadow-xs"
              title="Click to fill Doctor credentials"
            >
              Doctor
            </button>

            <button
              type="button"
              onClick={() => quickFill('admin', 'Admin@123')}
              className="rounded-full bg-[#faede4] px-3.5 py-1 text-xs font-bold text-[#9e4f20] hover:bg-[#f5dfd0] dark:bg-[#9e4f20]/25 dark:text-[#e0a989] transition shadow-xs"
              title="Click to fill Admin credentials"
            >
              Admin
            </button>
          </div>

          {/* Bottom Security Note */}
          <p className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-[#8a94ad]">
            <ShieldCheck className="size-3.5" aria-hidden />
            <span>Role-based access · audit-logged sign-in</span>
          </p>
        </div>

        {/* Footer Brand Text */}
        <div className="mt-5 text-center text-[11px] font-extrabold tracking-[0.2em] text-[#a09a90] uppercase">
          TRANSVAAL HIS • v4.2
        </div>
      </div>
    </div>
  )
}
