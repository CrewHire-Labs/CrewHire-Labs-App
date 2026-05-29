import { supabase } from './supabase'

function chunkText(text, source, maxLen = 400) {
  if (!text || text.trim().length < 10) return []
  const sentences = text.split(/[.!?\n]+/).filter(s => s.trim().length > 10)
  const chunks = []
  let current = ''
  for (const s of sentences) {
    if ((current + s).length > maxLen && current.length > 0) {
      chunks.push({ content: current.trim(), source })
      current = s
    } else {
      current += (current ? '. ' : '') + s
    }
  }
  if (current.trim().length > 10) chunks.push({ content: current.trim(), source })
  return chunks
}

async function getEmbedding(text) {
  try {
    const { data, error } = await supabase.functions.invoke('embed', {
      body: { text },
    })
    if (error) throw error
    return data?.embedding ?? null
  } catch {
    return null
  }
}

export async function ingestBrandBrain(brandId, d) {
  // All sections that agents need to know about
  const sections = [
    { text: `Brand name: ${d.brand_name || d.name}. Tagline: ${d.tagline}. Industry: ${d.industry}.`, source: 'identity' },
    { text: `Brand tone and voice: ${d.brand_tone}. Target audience: ${d.target_audience}. Unique selling proposition: ${d.usp}.`, source: 'tone' },
    { text: `Products: ${d.product_catalog}. Bestselling products: ${d.bestsellers}. Price range: ${d.price_range}. Discounts and offers: ${d.discount_info}.`, source: 'products' },
    { text: `Return and refund policy: ${d.return_policy}. Shipping information: ${d.shipping_info}. Sales channels: ${d.sales_channels}.`, source: 'policy' },
    { text: `FAQ: ${d.faq_text}`, source: 'faq' },
    { text: `Average order value: ${d.avg_order_value}. Repeat purchase rate: ${d.repeat_rate}. Common customer questions: ${d.top_complaints}. Churn reasons: ${d.churn_reasons}. VIP customer traits: ${d.vip_traits}.`, source: 'customers' },
    { text: `Primary business goal: ${d.primary_goal}. Biggest challenge: ${d.biggest_challenge}. Team size: ${d.team_size}. Monthly revenue: ${d.monthly_revenue}. Extra context: ${d.extra_context}.`, source: 'goals' },
  ].filter(s => s.text.replace(/undefined|null/g, '').replace(/[^a-zA-Z]/g, '').length > 10)

  // Delete old chunks
  await supabase.from('brand_chunks').delete().eq('brand_id', brandId)

  // Build rows
  const rows = []
  for (const section of sections) {
    const chunks = chunkText(section.text, section.source)
    for (const chunk of chunks) {
      const embedding = await getEmbedding(chunk.content)
      rows.push({ brand_id: brandId, content: chunk.content, source: chunk.source, embedding })
    }
  }

  if (rows.length > 0) {
    const { error } = await supabase.from('brand_chunks').insert(rows)
    if (error) console.error('Brand Brain ingest error:', error)
    else console.log(`✓ Brand Brain: ${rows.length} chunks stored`)
  }
  return rows.length
}

export async function seedEmployees(brandId) {
  const ROSTER = [
    { name: 'Sana',  role: 'sales',       team: 'revenue',   phase: 1 },
    { name: 'Riya',  role: 'retention',   team: 'revenue',   phase: 2 },
    { name: 'Sid',   role: 'support',     team: 'revenue',   phase: 1 },
    { name: 'Cora',  role: 'content',     team: 'marketing', phase: 1 },
    { name: 'Sona',  role: 'social',      team: 'marketing', phase: 2 },
    { name: 'Cal',   role: 'campaign',    team: 'marketing', phase: 2 },
    { name: 'Priya', role: 'partnership', team: 'growth',    phase: 3 },
    { name: 'Leo',   role: 'lead',        team: 'growth',    phase: 3 },
    { name: 'Anya',  role: 'analytics',   team: 'ops',       phase: 3 },
    { name: 'Finn',  role: 'founder',     team: 'ops',       phase: 1 },
  ]
  const rows = ROSTER.map(e => ({ ...e, brand_id: brandId, status: 'inactive' }))
  const { error } = await supabase.from('employees')
    .upsert(rows, { onConflict: 'brand_id,role' })
  if (error) console.error('Employee seed error:', error)
  else console.log(`✓ Seeded ${rows.length} employees`)
}
