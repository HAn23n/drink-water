import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9C16.66 14.2 17.64 11.94 17.64 9.2z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.98v2.33A9 9 0 0 0 9 18z"
      />
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.66 9c0-.59.1-1.16.29-1.7V4.97H.98A9 9 0 0 0 0 9c0 1.45.35 2.83.98 4.03l2.97-2.33z" />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .98 4.97l2.97 2.33C4.66 5.17 6.65 3.58 9 3.58z"
      />
    </svg>
  )
}

export function LoginPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setSubmitting(true)

    const { error: authError } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })

    setSubmitting(false)
    if (authError) {
      setError(authError.message)
      return
    }
    if (mode === 'signup') {
      setInfo('สมัครสำเร็จ กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี')
    }
  }

  async function handleGoogleLogin() {
    setError(null)
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (authError) setError(authError.message)
  }

  return (
    <div className="relative flex min-h-full flex-col items-center justify-center overflow-hidden bg-water-50 px-6 py-12">
      {/* floating ambient blobs — purely decorative, sit behind the card */}
      <div
        className="absolute top-[-10%] left-[-10%] h-72 w-72 rounded-full opacity-50 blur-3xl [animation:blob-drift_14s_ease-in-out_infinite]"
        style={{ background: 'radial-gradient(circle, var(--color-water-400), transparent 70%)' }}
      />
      <div
        className="absolute right-[-12%] bottom-[8%] h-80 w-80 rounded-full opacity-40 blur-3xl [animation:blob-drift_17s_ease-in-out_infinite_reverse]"
        style={{ background: 'radial-gradient(circle, var(--color-coral-400), transparent 70%)' }}
      />
      <div
        className="absolute top-[18%] right-[6%] h-40 w-40 rounded-full opacity-40 blur-2xl [animation:blob-drift_12s_ease-in-out_infinite]"
        style={{ background: 'radial-gradient(circle, var(--color-sun-400), transparent 70%)' }}
      />

      <div className="relative w-full max-w-sm rounded-[28px] bg-white p-8 shadow-[0_30px_60px_-24px_rgba(11,79,115,0.35)]">
        <span className="mb-4 inline-flex items-center gap-1 rounded-full bg-water-50 px-3 py-1 text-xs font-medium text-water-700">
          💧 PWA ฟรี 100%
        </span>

        <h1 className="font-display mb-1 text-3xl font-semibold text-water-700">
          Drink <span className="bg-gradient-to-r from-water-500 to-water-700 bg-clip-text text-transparent">Water</span>
        </h1>
        <p className="mb-6 text-sm text-slate-500">
          {mode === 'signin'
            ? 'เข้าสู่ระบบเพื่อเริ่มติดตามการดื่มน้ำ'
            : 'ตั้งเป้าหมายที่ใช่ แล้วมาสร้างนิสัยดื่มน้ำไปด้วยกัน'}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            placeholder="อีเมล"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-water-500 focus:ring-4 focus:ring-water-100"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="รหัสผ่าน"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-water-500 focus:ring-4 focus:ring-water-100"
          />

          {error && <p className="text-sm text-coral-500">{error}</p>}
          {info && <p className="text-sm text-water-600">{info}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-1 rounded-full bg-gradient-to-r from-water-500 to-water-600 py-3 font-medium text-white shadow-lg shadow-water-500/30 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-water-500/40 disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none"
          >
            {mode === 'signin' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          หรือ
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <button
          onClick={handleGoogleLogin}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 py-3 font-medium text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
        >
          <GoogleIcon />
          เข้าสู่ระบบด้วย Google
        </button>

        <p className="mt-6 text-center text-sm text-slate-500">
          {mode === 'signin' ? 'ยังไม่มีบัญชี?' : 'มีบัญชีอยู่แล้ว?'}{' '}
          <button
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            className="font-medium text-water-600 hover:underline"
          >
            {mode === 'signin' ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}
          </button>
        </p>
      </div>
    </div>
  )
}
