import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'

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
    <div className="flex min-h-full flex-col items-center justify-center bg-water-50 px-6 py-12">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg shadow-water-100">
        <h1 className="mb-1 text-center text-2xl font-semibold text-water-700">💧 Drink Water</h1>
        <p className="mb-6 text-center text-sm text-slate-500">
          {mode === 'signin' ? 'เข้าสู่ระบบเพื่อเริ่มติดตามการดื่มน้ำ' : 'สร้างบัญชีใหม่'}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            placeholder="อีเมล"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-slate-200 px-4 py-2 outline-none focus:border-water-500"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="รหัสผ่าน"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-slate-200 px-4 py-2 outline-none focus:border-water-500"
          />

          {error && <p className="text-sm text-red-500">{error}</p>}
          {info && <p className="text-sm text-water-600">{info}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-1 rounded-lg bg-water-500 py-2 font-medium text-white transition hover:bg-water-600 disabled:opacity-50"
          >
            {mode === 'signin' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
          </button>
        </form>

        <div className="my-4 flex items-center gap-3 text-xs text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          หรือ
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <button
          onClick={handleGoogleLogin}
          className="w-full rounded-lg border border-slate-200 py-2 font-medium text-slate-700 transition hover:bg-slate-50"
        >
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
