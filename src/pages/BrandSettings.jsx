import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { ingestBrandBrain } from '../lib/brandBrain'
import { useAuth } from '../lib/AuthContext'

// ── Standalone inputs (outside parent — no re-render glitch)
function TextInput({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input
      type={type}
      value={value ?? ''}
      onChange={onChange}
      placeholder={placeholder}
      className="input-dark px-4 py-3.5 rounded-xl text-[13px] font-body w-full"
    />
  )
}

function TextArea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea
      value={value ?? ''}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
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

const TABS = [
  { id: 'basics',    label: 'Brand basics',  color: '#00E87A' },
  { id: 'products',  label: 'Products',      color: '#7C6EF5' },
  { id: 'customers', label: 'Customers',     color: '#F5A623' },
  { id: 'ops',       label: 'Operations',    color: '#FF6B6B' },
  { id: 'goals',     label: 'Goals',         color: '#4FC3F7' },
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

export default function BrandSettings() {
  const { user, brand, refreshBrand } = useAuth()
  const [activeTab, setActiveTab] = useState('basics')
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(true)

  const [bData, setBData] = useState({
    name: '', industry: '', tagline: '', website: '', shopify_url: '', geo: 'IN',
  })
  const [dData, setDData] = useState({
    brand_tone: '', target_audience: '', usp: '',
    product_catalog: '', bestsellers: '', price_range: '', discount_info: '',
    avg_order_value: '', repeat_rate: '', top_complaints: '', churn_reasons: '', vip_traits: '',
    return_policy: '', shipping_info: '', faq_text: '', sales_channels: '',
    primary_goal: '', monthly_revenue: '', team_size: '', biggest_challenge: '', extra_context: '',
  })

  useEffect(() => {
    if (!brand) return
    loadDetails()
  }, [brand])

  async function loadDetails() {
    setLoading(true)
    // Load brand basics
    setBData({
      name: brand.name || '',
      industry: brand.industry || '',
      tagline: brand.tagline || '',
      website: brand.website || '',
      shopify_url: brand.shopify_url || '',
      geo: brand.geo || 'IN',
    })
    // Load brand details
    const { data: det } = await supabase
      .from('brand_details')
      .select('*')
      .eq('brand_id', brand.id)
      .single()
    if (det) {
      setDData({
        brand_tone:       det.brand_tone       || '',
        target_audience:  det.target_audience  || '',
        usp:              det.usp              || '',
        product_catalog:  det.product_catalog  || '',
        bestsellers:      det.bestsellers      || '',
        price_range:      det.price_range      || '',
        discount_info:    det.discount_info    || '',
        avg_order_value:  det.avg_order_value  || '',
        repeat_rate:      det.repeat_rate      || '',
        top_complaints:   det.top_complaints   || '',
        churn_reasons:    det.churn_reasons    || '',
        vip_traits:       det.vip_traits       || '',
        return_policy:    det.return_policy    || '',
        shipping_info:    det.shipping_info    || '',
        faq_text:         det.faq_text         || '',
        sales_channels:   det.sales_channels   || '',
        primary_goal:     det.primary_goal     || '',
        monthly_revenue:  det.monthly_revenue  || '',
        team_size:        det.team_size        || '',
        biggest_challenge:det.biggest_challenge|| '',
        extra_context:    det.extra_context    || '',
      })
    }
    setLoading(false)
  }

  const setB  = useCallback((k, v) => setBData(d => ({ ...d, [k]: v })), [])
  const setD  = useCallback((k, v) => setDData(d => ({ ...d, [k]: v })), [])

  const handleSave = async () => {
    if (!bData.name.trim()) { setError('Brand name is required.'); return }
    setSaving(true); setError(''); setSaved(false)

    try {
      // Update brand table
      const { error: bErr } = await supabase
        .from('brands')
        .update({
          name:        bData.name,
          industry:    bData.industry,
          tagline:     bData.tagline,
          website:     bData.website,
          shopify_url: bData.shopify_url,
          geo:         bData.geo,
        })
        .eq('id', brand.id)
      if (bErr) throw bErr

      // Upsert brand_details
      const { error: dErr } = await supabase
        .from('brand_details')
        .upsert({
          brand_id:         brand.id,
          brand_tone:       dData.brand_tone,
          target_audience:  dData.target_audience,
          usp:              dData.usp,
          product_catalog:  dData.product_catalog,
          bestsellers:      dData.bestsellers,
          price_range:      dData.price_range,
          discount_info:    dData.discount_info,
          avg_order_value:  dData.avg_order_value,
          repeat_rate:      dData.repeat_rate,
          top_complaints:   dData.top_complaints,
          churn_reasons:    dData.churn_reasons,
          vip_traits:       dData.vip_traits,
          return_policy:    dData.return_policy,
          shipping_info:    dData.shipping_info,
          faq_text:         dData.faq_text,
          sales_channels:   dData.sales_channels,
          primary_goal:     dData.primary_goal,
          monthly_revenue:  dData.monthly_revenue,
          team_size:        dData.team_size,
          biggest_challenge:dData.biggest_challenge,
          extra_context:    dData.extra_context,
        }, { onConflict: 'brand_id' })
      if (dErr) throw dErr

      // Re-ingest Brand Brain with updated data
      await ingestBrandBrain(brand.id, { ...bData, ...dData, brand_name: bData.name })

      await refreshBrand()
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      console.error('Settings save error:', e)
      setError('Failed to save. Please try again.')
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060608] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-full border border-[#00E87A] border-t-transparent anim-spin"/>
          <span className="terminal-text text-[11px] opacity-40">LOADING BRAND DATA...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#060608]">
      <div className="grain" aria-hidden="true"/>

      {/* Header */}
      <header className="border-b border-[#1A1D23] bg-[#080A0D] px-5 md:px-8 h-14 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <a href="/" className="terminal-text text-[11px] opacity-30 hover:opacity-60 hover:text-[#00E87A] transition-all">← Dashboard</a>
          <span className="text-[#1A1D23]">·</span>
          <span className="terminal-text text-[11px] text-[#00E87A] opacity-70">BRAND SETTINGS</span>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#00E87A]/30 bg-[#00E87A]/10">
              <span className="text-[#00E87A] text-[12px]">✓</span>
              <span className="terminal-text text-[10px] text-[#00E87A]">SAVED · BRAND BRAIN UPDATED</span>
            </div>
          )}
          <button onClick={handleSave} disabled={saving}
            className="btn-primary px-5 py-2.5 rounded-xl text-[13px]">
            {saving ? 'Saving...' : 'Save & update Brain →'}
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-5 md:px-8 py-8">

        {/* Page title */}
        <div className="mb-8">
          <h1 className="font-display font-700 text-[22px] text-[#E8E6DF] mb-1">Brand settings</h1>
          <p className="text-[#4A5568] text-[13px]">
            Edit your brand details. Every save re-ingests your Brand Brain so your agents always have the latest information.
          </p>
        </div>

        {/* Tab nav */}
        <div className="flex gap-2 flex-wrap mb-6">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 rounded-xl text-[12px] font-display font-500 border transition-all ${
                activeTab === t.id ? 'text-[#060608]' : 'border-[#1A1D23] text-[#4A5568] hover:text-[#E8E6DF] bg-transparent'
              }`}
              style={activeTab === t.id ? { background: t.color, borderColor: t.color } : {}}>
              {t.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="border border-red-500/20 bg-red-500/5 rounded-xl px-4 py-3 mb-5">
            <p className="terminal-text text-[11px] text-red-400">{error}</p>
          </div>
        )}

        <div className="card-dark rounded-2xl p-6 md:p-8 space-y-5">

          {/* ── BASICS ── */}
          {activeTab === 'basics' && (
            <>
              <Field label="Brand name" required>
                <TextInput value={bData.name} onChange={e => setB('name', e.target.value)} placeholder="e.g. Nyla Beauty"/>
              </Field>
              <Field label="Industry">
                <select value={bData.industry} onChange={e => setB('industry', e.target.value)}
                  className="input-dark px-4 py-3.5 rounded-xl text-[13px] font-body w-full appearance-none">
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </Field>
              <Field label="Tagline">
                <TextInput value={bData.tagline} onChange={e => setB('tagline', e.target.value)} placeholder="e.g. Clean skincare for Indian skin"/>
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Website">
                  <TextInput value={bData.website} onChange={e => setB('website', e.target.value)} placeholder="https://yourbrand.com" type="url"/>
                </Field>
                <Field label="Shopify URL">
                  <TextInput value={bData.shopify_url} onChange={e => setB('shopify_url', e.target.value)} placeholder="yourbrand.myshopify.com"/>
                </Field>
              </div>
              <Field label="Brand tone & voice" required hint="How your Content and Campaign agents will write.">
                <TextArea value={dData.brand_tone} onChange={e => setD('brand_tone', e.target.value)} rows={3}
                  placeholder="e.g. Warm, science-backed, empowering. Simple English, never corporate..."/>
              </Field>
              <Field label="Target audience" required hint="Who buys from you — age, location, lifestyle, concerns.">
                <TextArea value={dData.target_audience} onChange={e => setD('target_audience', e.target.value)} rows={3}
                  placeholder="e.g. Women aged 22-38 in Indian metros, skincare-conscious..."/>
              </Field>
              <Field label="USP — what makes you different" required>
                <TextArea value={dData.usp} onChange={e => setD('usp', e.target.value)} rows={3}
                  placeholder="e.g. Only Indian brand using clinically validated Ayurvedic actives..."/>
              </Field>
              <Field label="Region">
                <div className="flex gap-3">
                  {[['IN','🇮🇳 India — INR'],['GLOBAL','🌍 Global — USD']].map(([val, lbl]) => (
                    <button key={val} type="button" onClick={() => setB('geo', val)}
                      className={`flex-1 py-3 rounded-xl text-[13px] font-display font-600 border transition-all ${
                        bData.geo === val ? 'bg-[#00E87A] text-[#060608] border-[#00E87A]' : 'border-[#1A1D23] text-[#4A5568] hover:text-[#E8E6DF]'
                      }`}>
                      {lbl}
                    </button>
                  ))}
                </div>
              </Field>
            </>
          )}

          {/* ── PRODUCTS ── */}
          {activeTab === 'products' && (
            <>
              <Field label="Full product catalog" required hint="Names, sizes, prices, descriptions. More detail = smarter Sales Agent.">
                <TextArea value={dData.product_catalog} onChange={e => setD('product_catalog', e.target.value)} rows={8}
                  placeholder="1. Vitamin C Serum — 30ml — ₹899 — For brightening..."/>
              </Field>
              <Field label="Bestsellers" required>
                <TextInput value={dData.bestsellers} onChange={e => setD('bestsellers', e.target.value)}
                  placeholder="e.g. Vitamin C Serum, SPF Sunscreen, Night Cream"/>
              </Field>
              <Field label="Price range" required>
                <TextInput value={dData.price_range} onChange={e => setD('price_range', e.target.value)}
                  placeholder="e.g. ₹499 – ₹2,999"/>
              </Field>
              <Field label="Discount / offer patterns" hint="Regular sales, bundle deals, festival offers.">
                <TextInput value={dData.discount_info} onChange={e => setD('discount_info', e.target.value)}
                  placeholder="e.g. 15% off first order. Diwali sale. Bundle discounts on 3+ products."/>
              </Field>
            </>
          )}

          {/* ── CUSTOMERS ── */}
          {activeTab === 'customers' && (
            <>
              <Field label="Average order value" required>
                <TextInput value={dData.avg_order_value} onChange={e => setD('avg_order_value', e.target.value)}
                  placeholder="e.g. ₹1,200 per order"/>
              </Field>
              <Field label="Repeat purchase rate">
                <TextInput value={dData.repeat_rate} onChange={e => setD('repeat_rate', e.target.value)}
                  placeholder="e.g. 25% buy again within 3 months"/>
              </Field>
              <Field label="Most common customer questions" required hint="Your Support Agent answers these 24/7.">
                <TextArea value={dData.top_complaints} onChange={e => setD('top_complaints', e.target.value)} rows={5}
                  placeholder="- Is this safe for sensitive skin?&#10;- How long for results?&#10;- Delivery timeline?"/>
              </Field>
              <Field label="Churn reasons" hint="Why do customers stop buying? Helps Retention Agent catch them early.">
                <TextArea value={dData.churn_reasons} onChange={e => setD('churn_reasons', e.target.value)} rows={3}
                  placeholder="e.g. No visible results in 4 weeks. Switch to cheaper alternatives..."/>
              </Field>
              <Field label="VIP customer traits" hint="What do your best customers look like?">
                <TextInput value={dData.vip_traits} onChange={e => setD('vip_traits', e.target.value)}
                  placeholder="e.g. 3+ orders, email subscribers, tag on Instagram, ₹5k+ total spend"/>
              </Field>
            </>
          )}

          {/* ── OPERATIONS ── */}
          {activeTab === 'ops' && (
            <>
              <Field label="Return & refund policy" required hint="Quoted exactly to customers by Support Agent.">
                <TextArea value={dData.return_policy} onChange={e => setD('return_policy', e.target.value)} rows={4}
                  placeholder="7-day returns for unused products. Refund in 5-7 business days..."/>
              </Field>
              <Field label="Shipping & delivery information" required>
                <TextArea value={dData.shipping_info} onChange={e => setD('shipping_info', e.target.value)} rows={4}
                  placeholder="Free shipping above ₹499. Standard 5-7 days. Express 2-3 days at ₹99..."/>
              </Field>
              <Field label="Full FAQ content" required hint="All Q&As your Support Agent needs to handle queries without you.">
                <TextArea value={dData.faq_text} onChange={e => setD('faq_text', e.target.value)} rows={10}
                  placeholder="Q: Are products dermatologist tested?&#10;A: Yes...&#10;&#10;Q: Are ingredients cruelty-free?&#10;A: Yes..."/>
              </Field>
              <Field label="Sales channels">
                <TextInput value={dData.sales_channels} onChange={e => setD('sales_channels', e.target.value)}
                  placeholder="e.g. Website, Amazon, Nykaa, Instagram Shop, offline pop-ups"/>
              </Field>
            </>
          )}

          {/* ── GOALS ── */}
          {activeTab === 'goals' && (
            <>
              <Field label="Primary goal" required hint="Determines which agents are most active for your brand.">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {GOALS.map(goal => (
                    <button key={goal} type="button" onClick={() => setD('primary_goal', goal)}
                      className={`px-4 py-3.5 rounded-xl text-[13px] font-body text-left border transition-all ${
                        dData.primary_goal === goal
                          ? 'border-[#00E87A]/60 bg-[#00E87A]/10 text-[#E8E6DF]'
                          : 'border-[#1A1D23] text-[#4A5568] hover:text-[#E8E6DF] hover:border-[#2A2D33]'
                      }`}>
                      {dData.primary_goal === goal && <span className="text-[#00E87A] mr-2">✓</span>}
                      {goal}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Biggest current challenge">
                <TextArea value={dData.biggest_challenge} onChange={e => setD('biggest_challenge', e.target.value)} rows={3}
                  placeholder="e.g. Spend too much time on DMs. Can't keep up with content. ROAS dropped..."/>
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Monthly revenue (approx)">
                  <TextInput value={dData.monthly_revenue} onChange={e => setD('monthly_revenue', e.target.value)}
                    placeholder="e.g. ₹3L/mo or $5k/mo"/>
                </Field>
                <Field label="Team size" required>
                  <select value={dData.team_size} onChange={e => setD('team_size', e.target.value)}
                    className="input-dark px-4 py-3.5 rounded-xl text-[13px] font-body w-full appearance-none">
                    <option value="">Select...</option>
                    <option>Just me (solo founder)</option>
                    <option>2–5 people</option>
                    <option>6–15 people</option>
                    <option>16+ people</option>
                  </select>
                </Field>
              </div>
              <Field label="Anything else agents should know?">
                <TextArea value={dData.extra_context} onChange={e => setD('extra_context', e.target.value)} rows={3}
                  placeholder="e.g. Strongest in Mumbai. Customers prefer WhatsApp. We run GlowClub loyalty program..."/>
              </Field>
            </>
          )}

        </div>

        {/* Bottom save */}
        <div className="flex items-center justify-between mt-6">
          <p className="terminal-text text-[10px] opacity-25">
            Every save re-ingests your Brand Brain automatically.
          </p>
          <button onClick={handleSave} disabled={saving}
            className="btn-primary px-7 py-3 rounded-xl text-[13px]">
            {saving ? 'Saving...' : 'Save & update Brain →'}
          </button>
        </div>

        {/* Footer links */}
        <div className="flex flex-wrap items-center justify-center gap-5 mt-10 pt-6 border-t border-[#1A1D23]">
          <a href="https://crewhirelabs.online" className="terminal-text text-[10px] opacity-20 hover:opacity-60 hover:text-[#00E87A] transition-all">HOME</a>
          <a href="https://crewhirelabs.online/about" className="terminal-text text-[10px] opacity-20 hover:opacity-60 hover:text-[#00E87A] transition-all">ABOUT</a>
          <a href="https://crewhirelabs.online/privacy" className="terminal-text text-[10px] opacity-20 hover:opacity-60 hover:text-[#00E87A] transition-all">PRIVACY</a>
          <a href="https://crewhirelabs.online/terms" className="terminal-text text-[10px] opacity-20 hover:opacity-60 hover:text-[#00E87A] transition-all">TERMS</a>
          <a href="mailto:hello@crewhirelabs.online" className="terminal-text text-[10px] opacity-20 hover:opacity-60 hover:text-[#00E87A] transition-all">CONTACT</a>
        </div>

      </div>
    </div>
  )
}
