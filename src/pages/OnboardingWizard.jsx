import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { ingestBrandBrain, seedEmployees } from '../lib/brandBrain'
import { useAuth } from '../lib/AuthContext'

const STEPS = [
  { id: 1, label: 'Brand basics',  icon: '◎', color: '#00E87A' },
  { id: 2, label: 'Products',      icon: '⬡', color: '#7C6EF5' },
  { id: 3, label: 'Customers',     icon: '◈', color: '#F5A623' },
  { id: 4, label: 'Operations',    icon: '▣', color: '#FF6B6B' },
  { id: 5, label: 'Goals',         icon: '↗', color: '#4FC3F7' },
]

const INDUSTRIES = ['Fashion & Apparel','Beauty & Skincare','Jewelry & Accessories','Health & Wellness','Pet Care','Home Decor','Food & Beverage','Sports & Fitness','Baby & Kids','Electronics','Other D2C']

function StepBar({ current }) {
  return (
    <div className="flex items-center gap-0 mb-10">
      {STEPS.map((s, i) => (
        <div key={s.id} className="flex items-center flex-1 last:flex-none">
          <div className={`flex items-center gap-2 ${current >= s.id ? 'opacity-100' : 'opacity-30'}`}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-display font-700 flex-shrink-0 transition-all duration-300"
              style={{
                background: current >= s.id ? `${s.color}20` : '#1A1D23',
                color: current >= s.id ? s.color : '#4A5568',
                border: current >= s.id ? `1px solid ${s.color}40` : '1px solid #1A1D23',
              }}>
              {current > s.id ? '✓' : s.id}
            </div>
            <span className="terminal-text text-[10px] hidden md:block" style={{ color: current >= s.id ? s.color : '#4A5568' }}>
              {s.label.toUpperCase()}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className="flex-1 h-px mx-3 transition-all duration-300"
              style={{ background: current > s.id ? STEPS[i].color : '#1A1D23' }} />
          )}
        </div>
      ))}
    </div>
  )
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="terminal-text text-[10px] opacity-50 block mb-1.5">{label.toUpperCase()}</label>
      {hint && <p className="text-[#4A5568] text-[11px] mb-2 font-body">{hint}</p>}
      {children}
    </div>
  )
}

export default function OnboardingWizard() {
  const { user, refreshBrand } = useAuth()
  const [step, setStep]         = useState(1)
  const [saving, setSaving]     = useState(false)
  const [done, setDone]         = useState(false)
  const [data, setData]         = useState({
    // Step 1
    brand_name: '', industry: '', tagline: '', website: '', shopify_url: '', geo: 'IN',
    brand_tone: '', target_audience: '', usp: '',
    // Step 2
    product_catalog: '', bestsellers: '', price_range: '',
    // Step 3
    avg_order_value: '', repeat_rate: '', top_complaints: '',
    // Step 4
    return_policy: '', shipping_info: '', faq_text: '',
    // Step 5
    primary_goal: '', monthly_revenue: '', team_size: '',
  })

  const set = (k, v) => setData(d => ({ ...d, [k]: v }))

  const TA = ({ field, rows = 3, placeholder }) => (
    <textarea
      value={data[field]}
      onChange={e => set(field, e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="input-dark px-4 py-3 rounded-xl text-[13px] font-body resize-none"
    />
  )

  const IN = ({ field, placeholder, type = 'text' }) => (
    <input
      type={type}
      value={data[field]}
      onChange={e => set(field, e.target.value)}
      placeholder={placeholder}
      className="input-dark px-4 py-3.5 rounded-xl text-[13px] font-body"
    />
  )

  const handleNext = () => {
    if (step === 1 && !data.brand_name.trim()) return
    setStep(s => Math.min(s + 1, 5))
  }

  const handleComplete = async () => {
    setSaving(true)
    try {
      // 1. Create brand record
      const { data: brand, error: brandErr } = await supabase
        .from('brands')
        .insert({
          user_id: user.id,
          name: data.brand_name,
          tagline: data.tagline,
          website: data.website,
          shopify_url: data.shopify_url,
          industry: data.industry,
          geo: data.geo,
          onboarded: true,
        })
        .select()
        .single()

      if (brandErr) throw brandErr

      // 2. Save brand details
      await supabase.from('brand_details').insert({
        brand_id: brand.id,
        brand_tone: data.brand_tone,
        target_audience: data.target_audience,
        usp: data.usp,
        product_catalog: data.product_catalog,
        bestsellers: data.bestsellers,
        price_range: data.price_range,
        avg_order_value: data.avg_order_value,
        repeat_rate: data.repeat_rate,
        top_complaints: data.top_complaints,
        return_policy: data.return_policy,
        shipping_info: data.shipping_info,
        faq_text: data.faq_text,
        primary_goal: data.primary_goal,
        monthly_revenue: data.monthly_revenue,
        team_size: data.team_size,
      })

      // 3. Ingest into Brand Brain (chunks → pgvector)
      await ingestBrandBrain(brand.id, data)

      // 4. Seed employee roster
      await seedEmployees(brand.id)

      // 5. Refresh auth context
      await refreshBrand()

      setDone(true)
    } catch (err) {
      console.error('Onboarding error:', err)
      alert('Something went wrong. Please try again.')
    }
    setSaving(false)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#060608] flex items-center justify-center px-5">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full border border-[#00E87A]/30 bg-[#00E87A]/10 flex items-center justify-center mx-auto mb-6">
            <span className="text-[#00E87A] text-3xl">✓</span>
          </div>
          <h2 className="font-display font-700 text-[28px] text-[#E8E6DF] mb-3">Your crew is ready.</h2>
          <p className="text-[#4A5568] text-[14px] leading-relaxed mb-8">
            Brand Brain loaded. 10 agents standing by. Time to hire your first one.
          </p>
          <a href="/dashboard" className="btn-primary block py-4 rounded-2xl text-[15px] text-center">
            Go to dashboard →
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#060608] px-5 py-10 relative overflow-hidden">
      <div className="grain" aria-hidden="true" />
      <div className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: 'linear-gradient(rgba(0,232,122,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(0,232,122,0.02) 1px,transparent 1px)',
          backgroundSize: '40px 40px',
        }} />

      <div className="relative z-10 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <a href="/" className="terminal-text text-[11px] opacity-30 hover:opacity-60">← CrewHire Labs</a>
          <p className="terminal-text text-[10px] opacity-30">BRAND ONBOARDING</p>
        </div>

        <div className="card-dark rounded-2xl p-7 md:p-10">
          <div className="mb-6">
            <p className="terminal-text text-[10px] text-[#00E87A] opacity-70 mb-2">
              STEP {step} OF 5
            </p>
            <h1 className="font-display font-700 text-[22px] text-[#E8E6DF] mb-1">
              {step === 1 && 'Tell us about your brand'}
              {step === 2 && 'Your products'}
              {step === 3 && 'Your customers'}
              {step === 4 && 'Operations & support'}
              {step === 5 && 'Your goals'}
            </h1>
            <p className="text-[#4A5568] text-[13px]">
              {step === 1 && 'This becomes your Brand Brain — everything your crew needs to know.'}
              {step === 2 && "Your agents will know your catalog, prices, and bestsellers from day one."}
              {step === 3 && 'The more we know about your customers, the better your crew performs.'}
              {step === 4 && 'Your Support Agent needs these to handle queries automatically.'}
              {step === 5 && 'This helps us prioritise which agents to activate first.'}
            </p>
          </div>

          <StepBar current={step} />

          <div className="space-y-5">

            {/* STEP 1 */}
            {step === 1 && (
              <>
                <Field label="Brand name" hint="The name customers know you by.">
                  <IN field="brand_name" placeholder="e.g. Nyla Beauty" />
                </Field>
                <Field label="Industry">
                  <select value={data.industry} onChange={e => set('industry', e.target.value)}
                    className="input-dark px-4 py-3.5 rounded-xl text-[13px] font-body appearance-none">
                    {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field label="Website">
                    <IN field="website" placeholder="https://yourbrand.com" type="url" />
                  </Field>
                  <Field label="Shopify URL (if applicable)">
                    <IN field="shopify_url" placeholder="yourbrand.myshopify.com" />
                  </Field>
                </div>
                <Field label="Brand tone & voice" hint="How does your brand sound? e.g. Friendly, bold, luxury, playful">
                  <IN field="brand_tone" placeholder="e.g. Warm, premium, science-backed" />
                </Field>
                <Field label="Target audience" hint="Who buys from you?">
                  <IN field="target_audience" placeholder="e.g. Women 22-35, skincare enthusiasts in metros" />
                </Field>
                <Field label="What makes you different (USP)">
                  <IN field="usp" placeholder="e.g. Clean ingredients, dermatologist tested, Indian skin focus" />
                </Field>
                <Field label="Your region">
                  <div className="flex gap-3">
                    {[['IN','🇮🇳 India — INR'],['GLOBAL','🌍 Global — USD']].map(([val, label]) => (
                      <button key={val} type="button" onClick={() => set('geo', val)}
                        className={`flex-1 py-3 rounded-xl text-[13px] font-display font-600 border transition-all ${
                          data.geo === val ? 'bg-[#00E87A] text-[#060608] border-[#00E87A]' : 'border-[#1A1D23] text-[#4A5568] hover:text-[#E8E6DF]'
                        }`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </Field>
              </>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <>
                <Field label="Product catalog" hint="Paste your product list — names, variants, descriptions. The more detail, the better your Sales Agent performs.">
                  <TA field="product_catalog" rows={5} placeholder="Example:&#10;1. Vitamin C Serum - 30ml - ₹899 - For brightening&#10;2. Hyaluronic Moisturiser - 50ml - ₹1,299 - For hydration&#10;3. SPF 50 Sunscreen - 50ml - ₹799 - Daily use" />
                </Field>
                <Field label="Bestsellers" hint="Top 3-5 products by sales volume.">
                  <IN field="bestsellers" placeholder="e.g. Vitamin C Serum, SPF Sunscreen, Night Cream" />
                </Field>
                <Field label="Price range">
                  <IN field="price_range" placeholder="e.g. ₹499 – ₹2,999" />
                </Field>
              </>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <>
                <Field label="Average order value">
                  <IN field="avg_order_value" placeholder="e.g. ₹1,200 or $45" />
                </Field>
                <Field label="Repeat purchase rate" hint="What % of customers buy again within 90 days? Estimate is fine.">
                  <IN field="repeat_rate" placeholder="e.g. 25% buy again within 3 months" />
                </Field>
                <Field label="Top customer complaints or questions" hint="What do customers complain about or ask most often? Your Support Agent will handle these automatically.">
                  <TA field="top_complaints" rows={4} placeholder="e.g. Delivery delays, shade matching, returns process, ingredient queries, whether products are safe for sensitive skin..." />
                </Field>
              </>
            )}

            {/* STEP 4 */}
            {step === 4 && (
              <>
                <Field label="Return & refund policy">
                  <TA field="return_policy" rows={3} placeholder="e.g. 7-day easy returns for unused products. Refund processed within 5-7 business days to original payment method..." />
                </Field>
                <Field label="Shipping information">
                  <TA field="shipping_info" rows={3} placeholder="e.g. Free shipping above ₹499. Standard delivery 5-7 days. Express 2-3 days at ₹99 extra. Pan India delivery..." />
                </Field>
                <Field label="FAQ content" hint="Paste your existing FAQs or write the most common Q&As. Your Support Agent will use these to handle queries 24/7.">
                  <TA field="faq_text" rows={6} placeholder="Q: Are your products dermatologist tested?&#10;A: Yes, all products are tested by certified dermatologists...&#10;&#10;Q: Are ingredients cruelty-free?&#10;A: Absolutely, we are 100% cruelty free and vegan..." />
                </Field>
              </>
            )}

            {/* STEP 5 */}
            {step === 5 && (
              <>
                <Field label="Primary goal for next 3 months" hint="This determines which agents we activate first.">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      'Increase sales and revenue',
                      'Improve customer retention',
                      'Scale content and marketing',
                      'Reduce support workload',
                      'Improve repeat purchase rate',
                      'Launch a new product line',
                    ].map(goal => (
                      <button key={goal} type="button" onClick={() => set('primary_goal', goal)}
                        className={`px-4 py-3 rounded-xl text-[12px] font-body text-left border transition-all ${
                          data.primary_goal === goal
                            ? 'border-[#00E87A]/60 bg-[#00E87A]/10 text-[#E8E6DF]'
                            : 'border-[#1A1D23] text-[#4A5568] hover:text-[#E8E6DF] hover:border-[#2A2D33]'
                        }`}>
                        {goal}
                      </button>
                    ))}
                  </div>
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field label="Monthly revenue (approx)" hint="Helps calibrate your crew.">
                    <IN field="monthly_revenue" placeholder="e.g. ₹3L/mo or $5k/mo" />
                  </Field>
                  <Field label="Team size">
                    <select value={data.team_size} onChange={e => set('team_size', e.target.value)}
                      className="input-dark px-4 py-3.5 rounded-xl text-[13px] font-body appearance-none">
                      <option value="">Select...</option>
                      <option>Just me (solo founder)</option>
                      <option>2-5 people</option>
                      <option>6-15 people</option>
                      <option>16+ people</option>
                    </select>
                  </Field>
                </div>
              </>
            )}

          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-[#1A1D23]">
            <button onClick={() => setStep(s => Math.max(s-1, 1))}
              disabled={step === 1}
              className="btn-ghost px-5 py-3 rounded-xl text-[13px]">
              ← Back
            </button>

            <p className="terminal-text text-[10px] opacity-30">
              {step} / 5
            </p>

            {step < 5 ? (
              <button onClick={handleNext}
                className="btn-primary px-7 py-3 rounded-xl text-[13px]">
                Next →
              </button>
            ) : (
              <button onClick={handleComplete} disabled={saving}
                className="btn-primary px-7 py-3 rounded-xl text-[13px]">
                {saving ? 'Building Brand Brain...' : 'Launch my crew →'}
              </button>
            )}
          </div>
        </div>

        {/* Skip */}
        <p className="text-center mt-5">
          <a href="/dashboard" className="terminal-text text-[10px] opacity-20 hover:opacity-50 transition-opacity">
            Skip for now — fill in later
          </a>
        </p>
      </div>
    </div>
  )
}
