import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'

function Logo() {
  return (
    <svg height="40" viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="CrewHire Labs">
      <defs>
        <linearGradient id="ag" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00E87A" stopOpacity="0.9"/>
          <stop offset="100%" stopColor="#00663A" stopOpacity="0.7"/>
        </linearGradient>
      </defs>
      <path d="M 38 6 A 34 34 0 0 1 70 34" stroke="url(#ag)" strokeWidth="9" strokeLinecap="round" fill="none"/>
      <path d="M 70 44 A 34 34 0 0 1 38 72" stroke="url(#ag)" strokeWidth="9" strokeLinecap="round" fill="none"/>
      <path d="M 38 15 A 25 25 0 0 1 60 34" stroke="url(#ag)" strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.55"/>
      <path d="M 60 44 A 25 25 0 0 1 38 64" stroke="url(#ag)" strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.55"/>
      <ellipse cx="50" cy="43" rx="12" ry="15" fill="#C8E6C9" opacity="0.85"/>
      <g stroke="#00E87A" strokeWidth="1.2" fill="none">
        <line x1="16" y1="35" x2="38" y2="35"/>
        <line x1="16" y1="35" x2="16" y2="28"/><line x1="16" y1="28" x2="24" y2="28"/>
        <line x1="16" y1="35" x2="10" y2="35"/>
        <line x1="16" y1="35" x2="16" y2="42"/><line x1="16" y1="42" x2="24" y2="42"/>
      </g>
      <g fill="#00E87A"><circle cx="24" cy="28" r="2"/><circle cx="24" cy="42" r="2"/><circle cx="10" cy="35" r="2"/></g>
      <text x="82" y="42" fontFamily="Syne,sans-serif" fontSize="24" fontWeight="800" fill="#E8E6DF" letterSpacing="-0.5">Crew</text>
      <text x="134" y="42" fontFamily="Syne,sans-serif" fontSize="24" fontWeight="800" fill="#00E87A" letterSpacing="-0.5">Hire</text>
      <line x1="82" y1="50" x2="110" y2="50" stroke="#00E87A" strokeWidth="0.7" opacity="0.4"/>
      <text x="113" y="58" fontFamily="Syne,sans-serif" fontSize="10" fontWeight="600" fill="#00E87A" letterSpacing="3.5">LABS</text>
      <line x1="150" y1="50" x2="192" y2="50" stroke="#00E87A" strokeWidth="0.7" opacity="0.4"/>
    </svg>
  )
}

export default function AuthPage() {
  const [mode, setMode]       = useState('login')  // login | signup | verify
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr]         = useState('')
  const { signIn, signUp }    = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErr(''); setLoading(true)

    if (mode === 'signup') {
      if (password !== confirm) { setErr('Passwords do not match.'); setLoading(false); return }
      if (password.length < 8)  { setErr('Password must be at least 8 characters.'); setLoading(false); return }
      const { error } = await signUp(email, password)
      if (error) setErr(error.message)
      else setMode('verify')
    } else {
      const { error } = await signIn(email, password)
      if (error) setErr(error.message === 'Invalid login credentials' ? 'Wrong email or password.' : error.message)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#060608] flex flex-col items-center justify-center px-5 relative overflow-hidden">
      <div className="grain" aria-hidden="true" />

      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle,rgba(0,232,122,0.07) 0%,transparent 70%)' }} />

      {/* Grid */}
      <div className="absolute inset-0 pointer-events-none opacity-50"
        style={{
          backgroundImage: 'linear-gradient(rgba(0,232,122,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,232,122,0.025) 1px,transparent 1px)',
          backgroundSize: '40px 40px',
        }} />

      <div className="relative z-10 w-full max-w-sm">

        {/* Logo */}
        <div className="flex justify-center mb-10"
          style={{ filter: 'drop-shadow(0 0 16px rgba(0,232,122,0.25))' }}>
          <Logo />
        </div>

        {mode === 'verify' ? (
          /* Verify state */
          <div className="card-dark rounded-2xl p-8 text-center hud">
            <div className="w-14 h-14 rounded-full border border-[#00E87A]/30 bg-[#00E87A]/10 flex items-center justify-center mx-auto mb-5">
              <span className="text-[#00E87A] text-2xl">✓</span>
            </div>
            <h2 className="font-display font-700 text-[20px] text-[#E8E6DF] mb-2">Check your email</h2>
            <p className="text-[#4A5568] text-[13px] leading-relaxed mb-6">
              We sent a verification link to <span className="text-[#E8E6DF]">{email}</span>. Click it to activate your account.
            </p>
            <p className="terminal-text text-[10px] opacity-30">AFTER VERIFYING → COME BACK AND LOG IN</p>
            <button onClick={() => setMode('login')} className="btn-ghost w-full py-3 rounded-xl text-[13px] mt-5">
              Back to login →
            </button>
          </div>
        ) : (
          /* Auth form */
          <div className="card-dark rounded-2xl p-8 hud">

            {/* Mode tabs */}
            <div className="flex gap-1 p-1 rounded-xl bg-[#080A0D] border border-[#1A1D23] mb-7">
              {['login','signup'].map(m => (
                <button key={m} onClick={() => { setMode(m); setErr('') }}
                  className={`flex-1 py-2.5 rounded-lg text-[13px] font-display font-600 transition-all ${
                    mode === m ? 'bg-[#00E87A] text-[#060608]' : 'text-[#4A5568] hover:text-[#E8E6DF]'
                  }`}>
                  {m === 'login' ? 'Log in' : 'Sign up'}
                </button>
              ))}
            </div>

            {mode === 'signup' && (
              <div className="border border-[#00E87A]/20 bg-[#00E87A]/5 rounded-xl px-4 py-3 mb-5">
                <p className="terminal-text text-[10px] text-[#00E87A] opacity-70">7-DAY FREE TRIAL · NO CARD NEEDED</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="terminal-text text-[10px] opacity-50 block mb-2">EMAIL</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com" required
                  className="input-dark px-4 py-3.5 rounded-xl text-[14px]" />
              </div>

              <div>
                <label className="terminal-text text-[10px] opacity-50 block mb-2">PASSWORD</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'Min. 8 characters' : '••••••••'} required
                  className="input-dark px-4 py-3.5 rounded-xl text-[14px]" />
              </div>

              {mode === 'signup' && (
                <div>
                  <label className="terminal-text text-[10px] opacity-50 block mb-2">CONFIRM PASSWORD</label>
                  <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                    placeholder="Repeat password" required
                    className="input-dark px-4 py-3.5 rounded-xl text-[14px]" />
                </div>
              )}

              {err && (
                <div className="border border-red-500/20 bg-red-500/5 rounded-xl px-4 py-3">
                  <p className="terminal-text text-[11px] text-red-400">{err}</p>
                </div>
              )}

              <button type="submit" disabled={loading}
                className="btn-primary w-full py-4 rounded-xl text-[14px] mt-2">
                {loading
                  ? 'Please wait...'
                  : mode === 'login' ? 'Log in to dashboard →' : 'Create account & start trial →'}
              </button>
            </form>

            {mode === 'login' && (
              <p className="text-center text-[12px] text-[#4A5568] mt-5">
                Don't have an account?{' '}
                <button onClick={() => { setMode('signup'); setErr('') }}
                  className="text-[#00E87A] hover:underline font-500">
                  Sign up free
                </button>
              </p>
            )}

          </div>
        )}

        <p className="text-center terminal-text text-[10px] opacity-20 mt-8">
          <a href="/privacy" className="hover:opacity-60 transition-opacity">PRIVACY</a>
          &nbsp;·&nbsp;
          <a href="/terms"   className="hover:opacity-60 transition-opacity">TERMS</a>
          &nbsp;·&nbsp;
          <a href="/"        className="hover:opacity-60 transition-opacity">← HOME</a>
        </p>
      </div>
    </div>
  )
}
