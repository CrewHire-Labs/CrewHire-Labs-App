import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

const TEAM_COLORS = {
  revenue:   '#00E87A',
  marketing: '#7C6EF5',
  growth:    '#F5A623',
  ops:       '#FF6B6B',
}

const ROLE_META = {
  sales:       { label: 'Sales Agent',       abbr: 'SA', desc: 'Upsells · Cart recovery · Offers' },
  retention:   { label: 'Retention Agent',   abbr: 'RA', desc: 'Churn alerts · Win-back · VIP' },
  support:     { label: 'Support Agent',     abbr: 'SU', desc: 'FAQs · Returns · Order queries' },
  content:     { label: 'Content Agent',     abbr: 'CA', desc: 'Blogs · SEO · Emails · Copy' },
  social:      { label: 'Social Agent',      abbr: 'SO', desc: 'Instagram · Reels · Captions' },
  campaign:    { label: 'Campaign Agent',    abbr: 'CM', desc: 'Festivals · WhatsApp · Offers' },
  partnership: { label: 'Partnership Agent', abbr: 'PA', desc: 'Influencers · Affiliates' },
  lead:        { label: 'Lead Agent',        abbr: 'LA', desc: 'Outreach · DMs · Pipeline' },
  analytics:   { label: 'Analytics Agent',   abbr: 'AN', desc: 'MRR · ROAS · LTV · Reports' },
  founder:     { label: 'Founder Agent',     abbr: 'FA', desc: 'Daily briefing · Alerts · Pulse' },
}

function StatCard({ label, value, sub, color = '#00E87A' }) {
  return (
    <div className="card-dark rounded-xl p-5">
      <p className="terminal-text text-[10px] opacity-40 mb-2">{label}</p>
      <p className="font-display font-700 text-[26px] text-[#E8E6DF]" style={{ color }}>{value}</p>
      {sub && <p className="terminal-text text-[10px] opacity-40 mt-1">{sub}</p>}
    </div>
  )
}

function HireModal({ employee, brandId, onClose, onHired }) {
  const [hiring, setHiring] = useState(false)
  const meta = ROLE_META[employee.role] || {}
  const color = TEAM_COLORS[employee.team] || '#00E87A'

  const hire = async () => {
    setHiring(true)
    const { error } = await supabase.from('employees')
      .update({ status: 'active', hired_at: new Date().toISOString() })
      .eq('id', employee.id)
    if (!error) onHired()
    setHiring(false)
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-5">
      <div className="card-dark rounded-2xl p-8 max-w-sm w-full hud border"
        style={{ borderColor: `${color}30` }}>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-[16px] font-display font-700"
            style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>
            {meta.abbr}
          </div>
          <div>
            <h3 className="font-display font-700 text-[18px] text-[#E8E6DF]">{meta.label}</h3>
            <p className="text-[#4A5568] text-[12px]">{meta.desc}</p>
          </div>
        </div>

        <div className="border border-[#1A1D23] rounded-xl p-4 mb-6 bg-[#080A0D]">
          <p className="terminal-text text-[10px] opacity-40 mb-2">WHAT THIS AGENT DOES</p>
          <p className="text-[#4A5568] text-[13px] leading-relaxed">
            {employee.role === 'sales' && 'Monitors your store for upsell opportunities, sends cart recovery sequences, and recommends products to customers based on their purchase history and your Brand Brain.'}
            {employee.role === 'retention' && 'Detects customers at risk of churning, triggers win-back campaigns, identifies VIP customers, and nudges repeat purchases at the right moment.'}
            {employee.role === 'support' && 'Handles FAQs, return queries, and order questions automatically using your Brand Brain. Escalates only what truly needs your attention.'}
            {employee.role === 'content' && 'Writes SEO blogs, email copy, product descriptions, and landing page content — all in your brand tone, trained on your Brand Brain.'}
            {employee.role === 'founder' && 'Delivers a morning briefing every day: wins, issues, priority actions, and a pulse on your business metrics. Your daily co-pilot.'}
            {!['sales','retention','support','content','founder'].includes(employee.role) && `Handles all ${meta.desc.toLowerCase()} tasks automatically, trained on your brand.`}
          </p>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-ghost flex-1 py-3 rounded-xl text-[13px]">
            Cancel
          </button>
          <button onClick={hire} disabled={hiring}
            className="btn-primary flex-1 py-3 rounded-xl text-[13px]">
            {hiring ? 'Hiring...' : `Hire ${employee.name} →`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user, brand, trialDaysLeft, signOut } = useAuth()
  const [employees, setEmployees] = useState([])
  const [tasks, setTasks]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [hiring, setHiring]       = useState(null)
  const [activeTab, setActiveTab] = useState('crew')

  useEffect(() => {
    if (brand) {
      loadEmployees()
      loadTasks()
    }
  }, [brand])

  async function loadEmployees() {
    const { data } = await supabase
      .from('employees')
      .select('*')
      .eq('brand_id', brand.id)
      .order('phase', { ascending: true })
    setEmployees(data || [])
    setLoading(false)
  }

  async function loadTasks() {
    const { data } = await supabase
      .from('agent_tasks')
      .select('*, employees(role,name)')
      .eq('brand_id', brand.id)
      .order('ran_at', { ascending: false })
      .limit(20)
    setTasks(data || [])
  }

  const active   = employees.filter(e => e.status === 'active')
  const inactive = employees.filter(e => e.status !== 'active')

  const TABS = [
    { id: 'crew',     label: 'My Crew' },
    { id: 'activity', label: 'Activity' },
    { id: 'brain',    label: 'Brand Brain' },
  ]

  if (!brand) {
    return (
      <div className="min-h-screen bg-[#060608] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#4A5568] mb-5 text-[14px]">No brand found. Let's set one up.</p>
          <a href="/onboarding" className="btn-primary px-7 py-3.5 rounded-xl text-[14px]">
            Set up my brand →
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#060608]">
      <div className="grain" aria-hidden="true"/>

      {/* Top bar */}
      <header className="border-b border-[#1A1D23] bg-[#080A0D] px-5 md:px-8 h-14 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 flex items-center justify-center relative">
            <div className="absolute inset-0 rounded-full border border-[#00E87A] opacity-40"/>
            <div className="w-2 h-2 rounded-full bg-[#00E87A]"/>
          </div>
          <span className="font-display font-700 text-[14px] text-[#E8E6DF]">CrewHire</span>
          <span className="text-[#1A1D23]">·</span>
          <span className="terminal-text text-[11px] text-[#00E87A] opacity-70 truncate max-w-32">{brand.name}</span>
        </div>

        <div className="flex items-center gap-3">
          {trialDaysLeft > 0 && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#00E87A]/20 bg-[#00E87A]/5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00E87A] anim-pulse"/>
              <span className="terminal-text text-[10px] text-[#00E87A]">{trialDaysLeft}d free trial left</span>
            </div>
          )}
          <button onClick={signOut} className="terminal-text text-[10px] opacity-30 hover:opacity-60 transition-opacity">
            SIGN OUT
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-5 md:px-8 py-8">

        {/* Welcome */}
        <div className="mb-8 anim-fade-up">
          <p className="terminal-text text-[10px] opacity-40 mb-1">DASHBOARD</p>
          <h1 className="font-display font-700 text-[22px] text-[#E8E6DF]">
            {brand.name}
            <span className="anim-shimmer ml-2 text-[18px]"> · Your AI Crew</span>
          </h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 anim-fade-up d2">
          <StatCard label="ACTIVE AGENTS"    value={active.length}       sub={`of ${employees.length} hired`} />
          <StatCard label="TRIAL DAYS LEFT"  value={trialDaysLeft}       sub="upgrade anytime" color="#F5A623" />
          <StatCard label="TASKS RAN"        value={tasks.length}        sub="total logged" color="#7C6EF5" />
          <StatCard label="BRAND BRAIN"      value={brand.onboarded ? 'Ready' : 'Setup'}  sub="memory status" color={brand.onboarded ? '#00E87A' : '#FF6B6B'} />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-[#0D0F12] border border-[#1A1D23] w-fit mb-6 anim-fade-up d3">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 rounded-lg text-[13px] font-display font-600 transition-all ${
                activeTab === t.id
                  ? 'bg-[#00E87A] text-[#060608]'
                  : 'text-[#4A5568] hover:text-[#E8E6DF]'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* CREW TAB */}
        {activeTab === 'crew' && (
          <div className="anim-fade-up d4">

            {/* Active employees */}
            {active.length > 0 && (
              <div className="mb-8">
                <p className="terminal-text text-[10px] opacity-40 mb-4">ACTIVE AGENTS</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {active.map(emp => {
                    const meta  = ROLE_META[emp.role] || {}
                    const color = TEAM_COLORS[emp.team] || '#00E87A'
                    return (
                      <div key={emp.id} className="card-dark rounded-2xl p-5"
                        style={{ borderColor: `${color}25` }}>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[12px] font-display font-700"
                            style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>
                            {meta.abbr}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-display font-600 text-[13px] text-[#E8E6DF]">{meta.label}</p>
                            <p className="terminal-text text-[10px] opacity-40">{emp.name}</p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full anim-pulse" style={{ background: color }}/>
                            <span className="terminal-text text-[9px]" style={{ color }}>ACTIVE</span>
                          </div>
                        </div>
                        <p className="text-[#4A5568] text-[11px]">{meta.desc}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Available to hire */}
            <div>
              <p className="terminal-text text-[10px] opacity-40 mb-4">
                {active.length === 0 ? 'HIRE YOUR FIRST AGENT' : 'AVAILABLE TO HIRE'}
              </p>

              {active.length === 0 && (
                <div className="border border-[#00E87A]/20 bg-[#00E87A]/5 rounded-xl p-5 mb-5">
                  <p className="text-[#E8E6DF] text-[13px] font-500 mb-1">Start with these 3 agents</p>
                  <p className="text-[#4A5568] text-[12px] leading-relaxed">
                    Hire <span className="text-[#00E87A]">Finn (Founder)</span>, <span className="text-[#00E87A]">Sana (Sales)</span>, and <span className="text-[#00E87A]">Sid (Support)</span> first. These three cover your most immediate needs — daily intelligence, revenue, and customer queries.
                  </p>
                </div>
              )}

              {loading ? (
                <div className="flex items-center gap-3 py-8">
                  <div className="w-4 h-4 rounded-full border border-[#00E87A] border-t-transparent anim-spin"/>
                  <span className="terminal-text text-[11px] opacity-40">Loading agents...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {inactive.map(emp => {
                    const meta  = ROLE_META[emp.role] || {}
                    const color = TEAM_COLORS[emp.team] || '#4A5568'
                    const isPhase1 = emp.phase === 1
                    return (
                      <div key={emp.id}
                        className={`card-dark rounded-2xl p-5 ${isPhase1 ? 'cursor-pointer' : 'opacity-50'}`}
                        onClick={() => isPhase1 && setHiring(emp)}>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[12px] font-display font-700"
                            style={{ background: `${color}12`, color, border: `1px solid ${color}20` }}>
                            {meta.abbr}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-display font-600 text-[13px] text-[#E8E6DF]">{meta.label}</p>
                            <p className="terminal-text text-[10px] opacity-40">{emp.name}</p>
                          </div>
                          <span className="terminal-text text-[9px] opacity-40">
                            {emp.phase === 1 ? 'AVAILABLE' : `PHASE ${emp.phase}`}
                          </span>
                        </div>
                        <p className="text-[#4A5568] text-[11px] mb-4">{meta.desc}</p>
                        {isPhase1 && (
                          <div className="btn-ghost w-full py-2.5 rounded-xl text-[12px] text-center font-display font-600"
                            style={{ borderColor: `${color}30`, color }}>
                            Hire {emp.name} →
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ACTIVITY TAB */}
        {activeTab === 'activity' && (
          <div className="anim-fade-up d4">
            {tasks.length === 0 ? (
              <div className="card-dark rounded-2xl p-10 text-center">
                <p className="terminal-text text-[10px] opacity-30 mb-3">NO ACTIVITY YET</p>
                <p className="text-[#4A5568] text-[13px]">Hire and activate agents to see their activity here.</p>
              </div>
            ) : (
              <div className="card-dark rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-[#1A1D23] flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00E87A] anim-pulse"/>
                  <span className="terminal-text text-[11px] opacity-50">AGENT ACTIVITY LOG</span>
                </div>
                {tasks.map((task, i) => {
                  const role  = task.employees?.role
                  const color = TEAM_COLORS[Object.keys(ROLE_META).includes(role) ? 'revenue' : 'ops'] || '#4A5568'
                  const meta  = ROLE_META[role] || { abbr: '??', label: 'Agent' }
                  return (
                    <div key={task.id} className="flex items-start gap-3 px-5 py-3.5 border-b border-[#1A1D23]/50 last:border-0 hover:bg-white/[0.01]">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-display font-700 flex-shrink-0 mt-0.5"
                        style={{ background: `${color}15`, color, border: `1px solid ${color}25` }}>
                        {meta.abbr}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-display font-600 text-[#E8E6DF] mb-0.5">{meta.label}</p>
                        <p className="text-[11px] text-[#4A5568] leading-relaxed">{task.result || task.type}</p>
                      </div>
                      <span className="terminal-text text-[10px] opacity-30 flex-shrink-0">
                        {new Date(task.ran_at).toLocaleDateString()}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* BRAND BRAIN TAB */}
        {activeTab === 'brain' && (
          <div className="anim-fade-up d4 space-y-4">
            <div className="card-dark rounded-2xl p-6">
              <p className="terminal-text text-[10px] opacity-40 mb-4">BRAND BRAIN STATUS</p>
              {[
                { label: 'Brand tone & voice', done: !!brand.onboarded, color: '#00E87A' },
                { label: 'Product catalog',    done: !!brand.onboarded, color: '#00E87A' },
                { label: 'Customer data',      done: !!brand.onboarded, color: '#7C6EF5' },
                { label: 'FAQs & policies',    done: !!brand.onboarded, color: '#F5A623' },
                { label: 'Business goals',     done: !!brand.onboarded, color: '#FF6B6B' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-3 border-b border-[#1A1D23] last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: item.done ? item.color : '#2A2D33' }}/>
                    <span className="text-[13px]" style={{ color: item.done ? '#E8E6DF' : '#4A5568' }}>{item.label}</span>
                  </div>
                  <span className="terminal-text text-[10px]"
                    style={{ color: item.done ? item.color : '#2A2D33' }}>
                    {item.done ? 'SYNCED' : 'MISSING'}
                  </span>
                </div>
              ))}
            </div>

            {!brand.onboarded && (
              <div className="border border-[#00E87A]/20 bg-[#00E87A]/5 rounded-xl p-5 flex items-center justify-between">
                <div>
                  <p className="font-display font-600 text-[14px] text-[#E8E6DF] mb-1">Brand Brain is empty</p>
                  <p className="text-[#4A5568] text-[12px]">Complete the onboarding wizard to feed your Brand Brain.</p>
                </div>
                <a href="/onboarding" className="btn-primary px-5 py-3 rounded-xl text-[13px] whitespace-nowrap ml-4">
                  Setup →
                </a>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Hire modal */}
      {hiring && (
        <HireModal
          employee={hiring}
          brandId={brand.id}
          onClose={() => setHiring(null)}
          onHired={() => { setHiring(null); loadEmployees(); loadTasks(); }}
        />
      )}
    </div>
  )
}
