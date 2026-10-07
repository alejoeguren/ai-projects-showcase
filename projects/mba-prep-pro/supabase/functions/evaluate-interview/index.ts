import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DEFAULT_RUBRIC_PROMPT = `TASK
Score a candidate's MBA interview transcript using a 3-dimension checklist rubric and output:
1) Dimension scores (0–5 each) and overall score (0–15)
2) The TOP 3 opportunity areas (most important improvements) with specific actions

SCORING OVERVIEW (TOTAL 15)
Three dimensions: Substance, Structure, Presence.
Each dimension score is computed as: score = min(5, checklist_points + quality_bonus)
Where: checklist_points = number of checked items (0–4), quality_bonus ∈ {0,1}

DIMENSION 1: SUBSTANCE (0–4 checklist points + 0–1 bonus)
1) answered_question: The response directly addresses the prompt; has a clear "thesis".
2) ownership_role: The candidate clearly describes what THEY did, not only "we".
3) decision_tradeoff: Includes a real decision, tradeoff, or judgment call.
4) specific_outcome: Outcome is concrete (metrics, scale, magnitude), not vague.
Quality bonus (substance_quality_bonus): +1 if differentiated: shows mature judgment, sharp insight, or strong self-awareness.

DIMENSION 2: STRUCTURE (0–4 checklist points + 0–1 bonus)
1) fast_context: Context is set quickly (who/what/when) without long setup.
2) sequenced_actions: Actions are described in a logical sequence.
3) clear_result: There is a clear ending/resolution/outcome.
4) reflection_learning: Ends with reflection: what they learned and how it changed their approach.
Quality bonus (structure_quality_bonus): +1 if interview-ready tightness: balanced detail, minimal rambling.

DIMENSION 3: PRESENCE (0–4 checklist points + 0–1 bonus)
Score based on transcript proxies (word choice, clarity, concision). Be conservative.
1) concise: Minimal repetition; stays on track.
2) confident_language: Low hedging, avoids excessive apology; uses decisive verbs.
3) conversational_tone: Reads natural and human; avoids robotic bullet-dumping.
4) composure_under_pressure: Handles difficult topics with steadiness.
Quality bonus (presence_quality_bonus): +1 if executive presence: calm, clear, grounded, decisive.

OPPORTUNITY AREAS (TOP 3)
Select the 3 highest-leverage improvements. For each:
- Short title
- Which rubric item(s) it relates to
- One concrete action + one micro-drill
- One "example rewrite" sentence (no more than 40 words)

OUTPUT RULES
Return JSON only using this exact schema:
{
  "scores": {
    "substance": { "checked": [], "unchecked": [], "checklist_points": 0, "quality_bonus": 0, "score": 0, "justifications": {} },
    "structure": { "checked": [], "unchecked": [], "checklist_points": 0, "quality_bonus": 0, "score": 0, "justifications": {} },
    "presence": { "checked": [], "unchecked": [], "checklist_points": 0, "quality_bonus": 0, "score": 0, "justifications": {} }
  },
  "overall_score_15": 0,
  "top_opportunities": [
    { "title": "", "related_items": [], "why_it_matters": "", "action": "", "micro_drill": "", "example_rewrite": "" }
  ]
}

IMPORTANT:
- Include ALL 4 checklist items in justifications for each dimension.
- checked + unchecked must contain each item key exactly once.
- Score across the whole interview (overall impression).
- If transcript is too short/empty, be conservative.`

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })
    const serviceClient = createClient(supabaseUrl, serviceRoleKey)

    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getUser(token)
    if (claimsError || !claimsData?.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { messages, schoolName, duration, sessionId } = await req.json()

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No interview messages provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // IDOR protection: verify session ownership before any writes
    if (sessionId) {
      const { data: sessionCheck, error: sessionCheckError } = await serviceClient
        .from('interview_sessions')
        .select('user_id')
        .eq('id', sessionId)
        .maybeSingle()
      if (sessionCheckError || !sessionCheck || sessionCheck.user_id !== claimsData.user.id) {
        return new Response(
          JSON.stringify({ error: 'Forbidden' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) throw new Error('OpenAI API key not configured')

    // Build transcript
    const transcript = messages
      .map((msg: any) => `${msg.role === 'interviewer' ? 'INTERVIEWER' : 'CANDIDATE'}: ${msg.content}`)
      .join('\n\n')

    // Always use the dedicated evaluation rubric - never pull from ai_configurations
    // (ai_configurations is for the interviewer persona, not the scoring rubric)
    const rubricPrompt = DEFAULT_RUBRIC_PROMPT

    const evaluationPrompt = `${rubricPrompt}

INTERVIEW TRANSCRIPT (${schoolName}, Duration: ${duration}):
${transcript}`

    console.log(`[EVALUATE] Starting OpenAI call for session ${sessionId || 'no-session'}, transcript length: ${transcript.length}`)

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: 'You are an MBA interview evaluator. Return only valid JSON matching the exact schema requested.' },
          { role: 'user', content: evaluationPrompt }
        ],
        max_tokens: 2000,
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('[EVALUATE] OpenAI API error:', response.status, error)
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    console.log('[EVALUATE] OpenAI response received successfully')

    const data = await response.json()
    const content = data.choices[0].message.content.trim()

    let evaluation: any
    try {
      evaluation = JSON.parse(content)
      console.log('[EVALUATE] JSON parsed successfully, overall_score:', evaluation.overall_score_15)
    } catch {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        evaluation = JSON.parse(jsonMatch[0])
        console.log('[EVALUATE] JSON extracted from markdown, overall_score:', evaluation.overall_score_15)
      } else {
        console.error('[EVALUATE] Failed to parse evaluation response:', content.substring(0, 200))
        throw new Error('Failed to parse evaluation response')
      }
    }

    // Validate and clamp scores
    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(v || 0)))
    
    for (const dim of ['substance', 'structure', 'presence']) {
      if (evaluation.scores?.[dim]) {
        evaluation.scores[dim].checklist_points = clamp(evaluation.scores[dim].checklist_points, 0, 4)
        evaluation.scores[dim].quality_bonus = clamp(evaluation.scores[dim].quality_bonus, 0, 1)
        evaluation.scores[dim].score = clamp(evaluation.scores[dim].score, 0, 5)
      }
    }

    const substanceScore = evaluation.scores?.substance?.score ?? 0
    const structureScore = evaluation.scores?.structure?.score ?? 0
    const presenceScore = evaluation.scores?.presence?.score ?? 0
    evaluation.overall_score_15 = clamp(substanceScore + structureScore + presenceScore, 0, 15)

    // Ensure top_opportunities is an array of 3
    if (!Array.isArray(evaluation.top_opportunities)) {
      evaluation.top_opportunities = []
    }
    evaluation.top_opportunities = evaluation.top_opportunities.slice(0, 3)

    // Save to interview_sessions if sessionId provided
    if (sessionId) {
      try {
        await serviceClient
          .from('interview_sessions')
          .update({
            overall_score: evaluation.overall_score_15,
            substance_score: substanceScore,
            structure_score: structureScore,
            presence_score: presenceScore,
            top_opportunities: evaluation.top_opportunities,
            detailed_evaluation: evaluation.scores,
            transcript: transcript,
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', sessionId)
      } catch (err) {
        console.error('Failed to save evaluation to DB:', err)
      }
    }

    return new Response(
      JSON.stringify(evaluation),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('[EVALUATE] Error in evaluate-interview:', error)
    
    // Try to mark session as failed if we have the sessionId — only if the caller owns it
    try {
      const authHeader = req.headers.get('Authorization')
      const { sessionId } = await req.clone().json().catch(() => ({}))
      if (sessionId && authHeader?.startsWith('Bearer ')) {
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
        const svc = createClient(supabaseUrl, serviceRoleKey)
        const authClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: authHeader } }
        })
        const { data: claims } = await authClient.auth.getUser(authHeader.replace('Bearer ', ''))
        const { data: own } = await svc
          .from('interview_sessions')
          .select('user_id')
          .eq('id', sessionId)
          .maybeSingle()
        if (claims?.user && own && own.user_id === claims.user.id) {
          await svc.from('interview_sessions').update({ status: 'failed' }).eq('id', sessionId)
          console.log('[EVALUATE] Marked session as failed:', sessionId)
        }
      }
    } catch (e) {
      console.error('[EVALUATE] Could not mark session as failed:', e)
    }

    return new Response(
      JSON.stringify({ error: 'Failed to evaluate interview' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
