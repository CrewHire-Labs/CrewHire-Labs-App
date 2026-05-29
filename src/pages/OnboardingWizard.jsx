import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { ingestBrandBrain, seedEmployees } from '../lib/brandBrain'
import { useAuth } from '../lib/AuthContext'

// ── IMPORTANT FIX ──
// Input components are defined OUTSIDE the parent component
// so React does not recreate them on every keystroke.
// This was the typing glitch bug.

const STEPS = [
  { id: 1, label: 'Brand basics',  icon: '◎', color: '#00E87A' },
  { id: 2, label: 'Products',      icon: '⬡', color: '#7C6EF5' },
  { id: 3, label: 'Customers',     icon: '◈', color: '#F5A623' },
  { id: 4, label: 'Operations',    icon: '▣', color: '#FF6B6B' },
  { id: 5, label: 'Goals',         icon: '↗', color: '#4FC3F7' },
]

const INDUSTRIES = [
  'Fashion & Apparel','Beauty & Skincare','Jewelry & Accessories',
  'Health & Wellness','Pet Care','Home Decor','Food & Beverage',
  'Sports & Fitness','Baby & Kids','Electronics','Other D2C',
]

const GOALS = [
  'Increase sales and revenue',
  'Improve customer retention',
  'Scale content and marketing',
  'Reduce support workload',
  'Improve repeat purchase rate',
  'Launch a new product line',
]

// Required fields per step — agents need these to work
const REQUIRED = {
  1: ['brand_name','industry','brand_tone','target_audience','usp'],
  2: ['product_catalog','bestsellers','price_range'],
  3: ['avg_order_value','top_complaints'],
  4: ['return_policy','shipping_info','faq_text'],
  5: ['primary_goal','team_size'],
}

// ── Standalone components (outside parent = no re-creation on state change)
function TextInput({ value, onChange, placeholder, type = 'text', required }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      className="input-dark px-4 py-3.5 rounded-xl text-[13px] font-body w-full"
    />
  )
}

function TextArea({ value, onChange, placeholder, rows = 3, required }) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      required={required}
      className="input-dark px-4 py-3 rounded-xl text-[13px] font-body resize-none w-full"
    />
  )
}

function Field({ label, hint, required, children }) {
  return (
    <div>
      <label className="terminal-text text-[10px] opacity-50 block mb-1.5 flex items-center gap-1.5">
        {label.toUpperCase()}
        {required && <span className="text-[#00E87A] text-[10px]">*</span>}
      </label>
      {hint && <p className="text-[#4A5568] text-[11px] mb-2 font-body leading-relaxed">{hint}</p>}
      {children}
    </div>
  )
}

function StepBar({ current }) {
  return (
    <div className="flex items-center mb-10">
      {STEPS.map((s, i) => (
        <div key={s.id} className="flex items-center flex-1 last:flex-none">
          <div className={`flex items-center gap-2 ${current >= s.id ? 'opacity-100' : 'opacity-30'}`}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-display font-600 flex-shrink-0 transition-all duration-300"
              style={{
                background: current >= s.id ? `${s.color}20` : '#1A1D23',
                color: current >= s.id ? s.color : '#4A5568',
                border: `1px solid ${current >= s.id ? s.color + '40' : '#1A1D23'}`,
              }}>
              {current > s.id ? '✓' : s.id}
            </div>
            <span className="terminal-text text-[10px] hidden md:block"
              style={{ color: current >= s.id ? s.color : '#4A5568' }}>
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

function ValidationError({ msg }) {
  return (
    <div className="border border-red-500/20 bg-red-500/5 rounded-xl px-4 py-3 mt-2">
      <p className="terminal-text text-[11px] text-red-400">{msg}</p>
    </div>
  )
}

export default function OnboardingWizard() {
  const { user, refreshBrand } = useAuth()
  const [step, setStep]   = useState(1)
  const [saving, setSaving] = useState(false)
  const [done, setDone]   = useState(false)
  const [error, setError] = useState('')

  const [data, setData] = useState({
    brand_name: '', industry: 'Fashion & Apparel', tagline: '',
    website: '', shopify_url: '', geo: 'IN',
    brand_tone: '', target_audience: '', usp: '',
    product_catalog: '', bestsellers: '', price_range: '',
    avg_order_value: '', repeat_rate: '', top_complaints: '',
    return_policy: '', shipping_info: '', faq_text: '',
    primary_goal: '', monthly_revenue: '', team_size: '',
  })

  // Stable setter — won't cause child re-renders
  const set = useCallback((k, v) => setData(d => ({ ...d, [k]: v })), [])

  // Validate required fields for current step
  const validate = (s) => {
    const required = REQUIRED[s] || []
    for (const field of required) {
      if (!data[field] || !data[field].toString().trim()) {
        const label = field.replace(/_/g, ' ')
        return `Please fill in: ${label}`
      }
    }
    return null
  }

  const handleNext = () => {
    const err = validate(step)
    if (err) { setError(err); return }
    setError('')
    setStep(s => Math.min(s + 1, 5))
    window.scrollTo(0, 0)
  }

  const handleBack = () => {
    setError('')
    setStep(s => Math.max(s - 1, 1))
    window.scrollTo(0, 0)
  }

  const handleComplete = async () => {
    const err = validate(5)
    if (err) { setError(err); return }
    setSaving(true)
    setError('')
    try {
      // 1. Create brand
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
        .select().single()
      if (brandErr) throw brandErr

      // 2. Save brand details
      const { error: detailErr } = await supabase.from('brand_details').insert({
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
      if (detailErr) throw detailErr

      // 3. Ingest Brand Brain
      await ingestBrandBrain(brand.id, data)

      // 4. Seed employees
      await seedEmployees(brand.id)

      // 5. Refresh session
      await refreshBrand()
      setDone(true)
    } catch (e) {
      console.error('Onboarding error:', e)
      setError('Something went wrong saving your data. Please try again.')
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
          <h2 className="font-display font-700 text-[28px] text-[#E8E6DF] mb-3">Brand Brain loaded.</h2>
          <p className="text-[#4A5568] text-[14px] leading-relaxed mb-3">
            Your brand data is ingested. 10 agents are standing by. Time to hire your first crew.
          </p>
          <p className="terminal-text text-[10px] text-[#00E87A] opacity-60 mb-8">
            You can edit your brand details anytime from Settings.
          </p>
          <a href="/" className="btn-primary block py-4 rounded-2xl text-[15px] text-center">
            Go to dashboard →
          </a>
        </div>
      </div>
    )
  }

  const stepTitles = {
    1: { title: 'Tell us about your brand', sub: 'This becomes your Brand Brain — everything your crew needs to know about who you are.' },
    2: { title: 'Your products', sub: 'Your Sales Agent will use this to make recommendations, upsell, and recover carts accurately.' },
    3: { title: 'Your customers', sub: 'The more we know about your customers, the smarter your Retention and Support agents will be.' },
    4: { title: 'Operations & support', sub: 'Your Support Agent will use your FAQs and policies to handle every customer query 24/7.' },
    5: { title: 'Goals & context', sub: 'This determines which agents we prioritise activating first for your brand.' },
  }

  return (
    <div className="min-h-screen bg-[#060608] px-5 py-10">
      <div className="grain" aria-hidden="true" />
      <div className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: 'linear-gradient(rgba(0,232,122,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(0,232,122,0.02) 1px,transparent 1px)',
          backgroundSize: '40px 40px',
        }} />

      <div className="relative z-10 max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <a href="https://crewhirelabs.online" className="terminal-text text-[11px] opacity-30 hover:opacity-60">← CrewHire Labs</a>
          <p className="terminal-text text-[10px] opacity-30">BRAND SETUP · {step}/5</p>
        </div>

        <div className="card-dark rounded-2xl p-7 md:p-10">

          {/* Step header */}
          <div className="mb-6">
            <p className="terminal-text text-[10px] text-[#00E87A] opacity-70 mb-2">STEP {step} OF 5</p>
            <h1 className="font-display font-700 text-[22px] text-[#E8E6DF] mb-1">
              {stepTitles[step].title}
            </h1>
            <p className="text-[#4A5568] text-[13px] leading-relaxed">
              {stepTitles[step].sub}
            </p>
            <p className="terminal-text text-[10px] opacity-30 mt-2">
              Fields marked <span className="text-[#00E87A]">*</span> are required for your agents to work properly.
            </p>
          </div>

          <StepBar current={step} />

          <div className="space-y-5">

            {/* ── STEP 1: Brand basics ── */}
            {step === 1 && (
              <>
                <Field label="Brand name" required hint="The name your customers know you by.">
                  <TextInput
                    value={data.brand_name}
                    onChange={e => set('brand_name', e.target.value)}
                    placeholder="e.g. Nyla Beauty"
                    required
                  />
                </Field>

                <Field label="Industry" required>
                  <select
                    value={data.industry}
                    onChange={e => set('industry', e.target.value)}
                    className="input-dark px-4 py-3.5 rounded-xl text-[13px] font-body w-full appearance-none">
                    {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field label="Website" hint="Your main website URL.">
                    <TextInput
                      value={data.website}
                      onChange={e => set('website', e.target.value)}
                      placeholder="https://yourbrand.com"
                      type="url"
                    />
                  </Field>
                  <Field label="Shopify store URL" hint="If you use Shopify.">
                    <TextInput
                      value={data.shopify_url}
                      onChange={e => set('shopify_url', e.target.value)}
                      placeholder="yourbrand.myshopify.com"
                    />
                  </Field>
                </div>

                <Field label="One-line tagline" hint="How would you describe your brand in one sentence?">
                  <TextInput
                    value={data.tagline}
                    onChange={e => set('tagline', e.target.value)}
                    placeholder="e.g. Clean skincare for Indian skin"
                  />
                </Field>

                <Field label="Brand tone & voice" required
                  hint="How does your brand communicate? Your Content and Campaign agents will write in this tone.">
                  <TextArea
                    value={data.brand_tone}
                    onChange={e => set('brand_tone', e.target.value)}
                    placeholder="e.g. Warm, science-backed, and empowering. We talk like a knowledgeable friend — never cold or corporate. We use simple English, avoid jargon, and always focus on the customer's skin goals."
                    rows={3}
                    required
                  />
                </Field>

                <Field label="Target audience" required
                  hint="Who are your ideal customers? Be specific — age, location, lifestyle, concerns.">
                  <TextArea
                    value={data.target_audience}
                    onChange={e => set('target_audience', e.target.value)}
                    placeholder="e.g. Women aged 22–38 in Indian metro cities. Working professionals who care about clean ingredients. They research before buying, follow skincare creators on Instagram, and have budgets of ₹500–₹3,000 per product."
                    rows={3}
                    required
                  />
                </Field>

                <Field label="What makes you different (USP)" required
                  hint="Why should someone buy from you over anyone else? Be honest and specific.">
                  <TextArea
                    value={data.usp}
                    onChange={e => set('usp', e.target.value)}
                    placeholder="e.g. The only Indian skincare brand using clinically validated Ayurvedic actives combined with modern dermatology. All products are dermatologist tested, free from parabens, and made for Indian skin tones and climate."
                    rows={3}
                    required
                  />
                </Field>

                <Field label="Your region" required>
                  <div className="flex gap-3">
                    {[['IN','🇮🇳 India — INR'],['GLOBAL','🌍 Global — USD']].map(([val, lbl]) => (
                      <button key={val} type="button" onClick={() => set('geo', val)}
                        className={`flex-1 py-3 rounded-xl text-[13px] font-display font-600 border transition-all ${
                          data.geo === val
                            ? 'bg-[#00E87A] text-[#060608] border-[#00E87A]'
                            : 'border-[#1A1D23] text-[#4A5568] hover:text-[#E8E6DF]'
                        }`}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                </Field>
              </>
            )}

            {/* ── STEP 2: Products ── */}
            {step === 2 && (
              <>
                <Field label="Full product catalog" required
                  hint="List all your products with names, sizes, prices, and what they do. The more detail here, the better your Sales Agent recommends and recovers carts.">
                  <TextArea
                    value={data.product_catalog}
                    onChange={e => set('product_catalog', e.target.value)}
                    rows={7}
                    required
                    placeholder={`e.g.
1. Vitamin C Brightening Serum — 30ml — ₹899
   For: dull skin, dark spots, uneven tone
   Key ingredients: 15% Vitamin C, Niacinamide, Hyaluronic Acid

2. Hydrating Night Cream — 50ml — ₹1,299
   For: dry skin, overnight repair
   Key ingredients: Ceramides, Shea Butter, Peptides

3. SPF 50 Sunscreen — 50ml — ₹799
   For: daily UV protection, no white cast
   Key ingredients: Zinc Oxide, Titanium Dioxide`}
                  />
                </Field>

                <Field label="Bestsellers" required
                  hint="Your top 3–5 products by sales. Your Sales Agent will push these first.">
                  <TextInput
                    value={data.bestsellers}
                    onChange={e => set('bestsellers', e.target.value)}
                    placeholder="e.g. Vitamin C Serum, SPF 50 Sunscreen, Night Cream"
                    required
                  />
                </Field>

                <Field label="Price range" required hint="Lowest to highest product price.">
                  <TextInput
                    value={data.price_range}
                    onChange={e => set('price_range', e.target.value)}
                    placeholder="e.g. ₹499 – ₹2,999"
                    required
                  />
                </Field>

                <Field label="Discount / offer patterns" hint="Do you run regular sales? What discounts do you offer?">
                  <TextInput
                    value={data.discount_info || ''}
                    onChange={e => set('discount_info', e.target.value)}
                    placeholder="e.g. 15% off on first order. Festival sales: Diwali, Holi. Bundle deals for 3+ products."
                  />
                </Field>
              </>
            )}

            {/* ── STEP 3: Customers ── */}
            {step === 3 && (
              <>
                <Field label="Average order value" required hint="What does a typical customer spend per order?">
                  <TextInput
                    value={data.avg_order_value}
                    onChange={e => set('avg_order_value', e.target.value)}
                    placeholder="e.g. ₹1,200 per order"
                    required
                  />
                </Field>

                <Field label="Repeat purchase rate" hint="What % of customers buy again within 90 days? Estimate is fine.">
                  <TextInput
                    value={data.repeat_rate}
                    onChange={e => set('repeat_rate', e.target.value)}
                    placeholder="e.g. About 25% buy again within 3 months"
                  />
                </Field>

                <Field label="Most common customer questions" required
                  hint="What do customers ask most often before or after buying? Your Support Agent will answer these automatically.">
                  <TextArea
                    value={data.top_complaints}
                    onChange={e => set('top_complaints', e.target.value)}
                    rows={5}
                    required
                    placeholder={`e.g.
- Is this product safe for sensitive skin?
- What is the shelf life after opening?
- Which product is best for oily skin?
- Do you deliver to [city]?
- How long does shipping take?
- Can I return if I don't like it?
- Are the ingredients cruelty-free?`}
                  />
                </Field>

                <Field label="Typical churn reasons" hint="Why do customers stop buying from you? Helps the Retention Agent catch them early.">
                  <TextArea
                    value={data.churn_reasons || ''}
                    onChange={e => set('churn_reasons', e.target.value)}
                    rows={3}
                    placeholder="e.g. Customers often churn after 1 purchase if they don't see results in 4 weeks. Some switch to cheaper options. A few complain about delivery time."
                  />
                </Field>

                <Field label="VIP / loyal customer traits" hint="What do your best customers look like?">
                  <TextInput
                    value={data.vip_traits || ''}
                    onChange={e => set('vip_traits', e.target.value)}
                    placeholder="e.g. 3+ orders, subscribe to emails, tag us on Instagram, spend ₹5,000+ total"
                  />
                </Field>
              </>
            )}

            {/* ── STEP 4: Operations ── */}
            {step === 4 && (
              <>
                <Field label="Return & refund policy" required
                  hint="Your full return policy. Your Support Agent will quote this exactly to customers.">
                  <TextArea
                    value={data.return_policy}
                    onChange={e => set('return_policy', e.target.value)}
                    rows={4}
                    required
                    placeholder="e.g. We accept returns within 7 days of delivery for unused, sealed products. Opened products can only be returned if defective. Refunds are processed within 5–7 business days to the original payment method. To initiate a return, email hello@yourbrand.com with your order number."
                  />
                </Field>

                <Field label="Shipping & delivery information" required
                  hint="All delivery details — timelines, charges, tracking, etc.">
                  <TextArea
                    value={data.shipping_info}
                    onChange={e => set('shipping_info', e.target.value)}
                    rows={4}
                    required
                    placeholder="e.g. Free standard shipping on orders above ₹499. Standard delivery: 5–7 business days. Express delivery: 2–3 days at ₹99. We ship pan-India via Delhivery and Shiprocket. Tracking link is emailed after dispatch within 24 hours of order placement."
                  />
                </Field>

                <Field label="Full FAQ content" required
                  hint="Paste all your existing FAQs. The more complete this is, the better your Support Agent handles queries without you.">
                  <TextArea
                    value={data.faq_text}
                    onChange={e => set('faq_text', e.target.value)}
                    rows={10}
                    required
                    placeholder={`Q: Are your products dermatologist tested?
A: Yes, all our products are tested and approved by certified dermatologists before launch.

Q: Are ingredients cruelty-free and vegan?
A: All our products are 100% cruelty-free and vegan. We never test on animals.

Q: Which products are safe during pregnancy?
A: Our Hydrating Night Cream and SPF Sunscreen are pregnancy-safe. Avoid Vitamin C Serum during first trimester — consult your doctor.

Q: How long before I see results?
A: Most customers see visible improvement in 4–6 weeks of consistent use.

Q: Do you have products for sensitive skin?
A: Yes — our Gentle Cleanser and Hydrating Night Cream are specifically formulated for sensitive skin.`}
                  />
                </Field>

                <Field label="Current sales channels" hint="Where do you sell? Helps agents know your full business context.">
                  <TextInput
                    value={data.sales_channels || ''}
                    onChange={e => set('sales_channels', e.target.value)}
                    placeholder="e.g. Our website, Amazon, Nykaa, Instagram Shop, offline pop-ups"
                  />
                </Field>
              </>
            )}

            {/* ── STEP 5: Goals ── */}
            {step === 5 && (
              <>
                <Field label="Primary goal for next 3 months" required
                  hint="This determines which agents we activate first. Pick the one most critical right now.">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {GOALS.map(goal => (
                      <button key={goal} type="button" onClick={() => set('primary_goal', goal)}
                        className={`px-4 py-3.5 rounded-xl text-[13px] font-body text-left border transition-all leading-snug ${
                          data.primary_goal === goal
                            ? 'border-[#00E87A]/60 bg-[#00E87A]/10 text-[#E8E6DF]'
                            : 'border-[#1A1D23] text-[#4A5568] hover:text-[#E8E6DF] hover:border-[#2A2D33]'
                        }`}>
                        {data.primary_goal === goal && <span className="text-[#00E87A] mr-2">✓</span>}
                        {goal}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="Biggest current challenge" hint="What is slowing your brand down the most right now?">
                  <TextArea
                    value={data.biggest_challenge || ''}
                    onChange={e => set('biggest_challenge', e.target.value)}
                    rows={3}
                    placeholder="e.g. We spend too much time manually replying to customer DMs. We can't keep up with content creation. Our ROAS has dropped and we don't know why."
                  />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field label="Monthly revenue (approx)" hint="Helps calibrate what your agents focus on.">
                    <TextInput
                      value={data.monthly_revenue}
                      onChange={e => set('monthly_revenue', e.target.value)}
                      placeholder="e.g. ₹3L/mo or $5k/mo"
                    />
                  </Field>
                  <Field label="Current team size" required>
                    <select
                      value={data.team_size}
                      onChange={e => set('team_size', e.target.value)}
                      className="input-dark px-4 py-3.5 rounded-xl text-[13px] font-body w-full appearance-none">
                      <option value="">Select your team size...</option>
                      <option>Just me (solo founder)</option>
                      <option>2–5 people</option>
                      <option>6–15 people</option>
                      <option>16+ people</option>
                    </select>
                  </Field>
                </div>

                <Field label="Anything else agents should know?" hint="Any extra context about your brand, customers, or business that doesn't fit above.">
                  <TextArea
                    value={data.extra_context || ''}
                    onChange={e => set('extra_context', e.target.value)}
                    rows={3}
                    placeholder="e.g. We launched 8 months ago. We are strongest in Mumbai and Bangalore. Our customers prefer WhatsApp communication over email. We run a loyalty program called GlowClub."
                  />
                </Field>
              </>
            )}

          </div>

          {/* Validation error */}
          {error && <ValidationError msg={error} />}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-[#1A1D23]">
            <button onClick={handleBack} disabled={step === 1}
              className="btn-ghost px-5 py-3 rounded-xl text-[13px]">
              ← Back
            </button>
            <p className="terminal-text text-[10px] opacity-30">{step} / 5</p>
            {step < 5 ? (
              <button onClick={handleNext} className="btn-primary px-7 py-3 rounded-xl text-[13px]">
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

      </div>
    </div>
  )
}
