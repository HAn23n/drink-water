import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Logo } from '../../components/Logo'

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 18 18" aria-hidden="true">
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
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleGoogleLogin() {
    setError(null)
    setSubmitting(true)
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    // On success the browser redirects to Google, so we only land here on error.
    if (authError) {
      setError(authError.message)
      setSubmitting(false)
    }
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

      <div className="relative w-full max-w-sm rounded-[28px] bg-white p-8 text-center shadow-[0_30px_60px_-24px_rgba(11,79,115,0.35)]">
        <span className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-water-50 px-3 py-1 text-xs font-medium text-water-700">
          <Logo className="h-3.5 w-3.5" /> PWA ฟรี 100%
        </span>

        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[26px] bg-gradient-to-br from-water-400 to-water-600 shadow-lg shadow-water-500/30">
          <Logo white className="h-11 w-11" />
        </div>

        <h1 className="font-display mb-2 text-3xl font-semibold text-water-700">
          Drink <span className="bg-gradient-to-r from-water-500 to-water-700 bg-clip-text text-transparent">Water</span>
        </h1>
        <p className="mb-8 text-sm text-slate-500">
          ตั้งเป้าหมายที่ใช่ แล้วมาสร้างนิสัยดื่มน้ำไปด้วยกัน
        </p>

        {error && <p className="mb-4 text-sm text-coral-500">{error}</p>}

        <button
          onClick={handleGoogleLogin}
          disabled={submitting}
          className="flex w-full items-center justify-center gap-3 rounded-full border border-slate-200 py-3.5 font-medium text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none"
        >
          <GoogleIcon />
          {submitting ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบด้วย Google'}
        </button>

        <p className="mt-6 text-xs text-slate-400">
          เข้าสู่ระบบด้วยบัญชี Google ของคุณ ปลอดภัยและไม่ต้องจำรหัสผ่าน
        </p>
      </div>
    </div>
  )
}
