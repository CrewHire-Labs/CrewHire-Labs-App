import { supabase } from './supabase'

// ── Chunk text into smaller pieces for embedding
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

// ── Get embedding from Gemini text-embedding-004 via Supabase Edge Function
// For MVP: store text chunks without embeddings — add embeddings in Sprint 3
// when Oracle + Hermes is running. pgvector still stores them, just null for now.
async function getEmbedding(text) {
  try {
    const { data, error } = await supabase.functions.invoke('embed', {
      body: { text },
    })
    if (error) throw error
    return data?.embedding ?? null
  } catch {
    // In MVP without edge functions set up, return null
    // Agents will do full-text search until embeddings are live
    return null
  }
}

// ── Main ingest function — called after wizard completion
export async function ingestBrandBrain(brandId, brandDetails) {
  const {
    brand_tone, target_audience, usp,
    product_catalog, bestsellers, price_range,
    return_policy, shipping_info, faq_text,
    avg_order_value, repeat_rate, top_complaints,
    primary_goal,
  } = brandDetails

  // Build text sections to chunk
  const sections = [
    { text: `Brand tone and voice: ${brand_tone}. Target audience: ${target_audience}. Unique selling proposition: ${usp}.`, source: 'tone' },
    { text: `Products: ${product_catalog}. Bestsellers: ${bestsellers}. Price range: ${price_range}.`, source: 'products' },
    { text: `Return policy: ${return_policy}. Shipping: ${shipping_info}.`, source: 'policy' },
    { text: `FAQ: ${faq_text}`, source: 'faq' },
    { text: `Average order value: ${avg_order_value}. Repeat purchase rate: ${repeat_rate}. Top customer complaints: ${top_complaints}.`, source: 'customers' },
    { text: `Primary business goal: ${primary_goal}.`, source: 'goals' },
  ]

  // Delete old chunks for this brand
  await supabase.from('brand_chunks').delete().eq('brand_id', brandId)

  // Chunk and insert
  const allChunks = []
  for (const section of sections) {
    const chunks = chunkText(section.text, section.source)
    allChunks.push(...chunks)
  }

  // Get embeddings and insert in batches
  const rows = []
  for (const chunk of allChunks) {
    const embedding = await getEmbedding(chunk.content)
    rows.push({
      brand_id: brandId,
      content: chunk.content,
      source: chunk.source,
      embedding, // null for now, filled in Sprint 3
    })
  }

  if (rows.length > 0) {
    const { error } = await supabase.from('brand_chunks').insert(rows)
    if (error) console.error('Brand Brain ingest error:', error)
    else console.log(`✓ Brand Brain: ${rows.length} chunks stored for brand ${brandId}`)
  }

  return rows.length
}

// ── Seed default employees for a brand
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
  const { error } = await supabase.from('employees').upsert(rows, { onConflict: 'brand_id,role' })
  if (error) console.error('Employee seed error:', error)
  else console.log(`✓ Seeded ${rows.length} employees for brand ${brandId}`)
}
