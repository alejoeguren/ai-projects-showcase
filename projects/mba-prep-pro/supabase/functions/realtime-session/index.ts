import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Auth validation
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getUser(token)
    if (claimsError || !claimsData?.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = claimsData.user.id
    const { schoolName, schoolId } = await req.json()

    if (typeof schoolName !== 'string' || schoolName.length > 200) {
      return new Response(
        JSON.stringify({ error: 'Invalid school name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    // Service client for fetching questions + profile
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch question banks
    let generalQuestions = ''
    let schoolQuestions = ''
    try {
      const query = serviceClient
        .from('school_interview_questions')
        .select('school_id, questions_text')
        .eq('is_active', true)

      if (schoolId) {
        query.or(`school_id.is.null,school_id.eq.${schoolId}`)
      } else {
        query.is('school_id', null)
      }

      const { data: questionBanks } = await query
      if (questionBanks) {
        generalQuestions = questionBanks.find(q => !q.school_id)?.questions_text || ''
        schoolQuestions = questionBanks.find(q => q.school_id === schoolId)?.questions_text || ''
      }
    } catch (e) {
      console.error('Error fetching questions:', e)
    }

    // Fetch candidate profile
    let candidateContext = ''
    try {
      const { data: profile } = await serviceClient
        .from('profiles')
        .select('processed_skills, work_experience_summary, education_background, career_objectives, industry_experience, leadership_examples')
        .eq('user_id', userId)
        .single()

      if (profile) {
        const parts: string[] = []
        if (profile.processed_skills?.length) parts.push(`Skills: ${profile.processed_skills.join(', ')}`)
        if (profile.work_experience_summary) parts.push(`Experience: ${profile.work_experience_summary}`)
        if (profile.education_background) parts.push(`Education: ${profile.education_background}`)
        if (profile.career_objectives) parts.push(`Career Goals: ${profile.career_objectives}`)
        if (profile.industry_experience?.length) parts.push(`Industries: ${profile.industry_experience.join(', ')}`)
        if (profile.leadership_examples) parts.push(`Leadership: ${profile.leadership_examples}`)

        if (parts.length > 0) {
          candidateContext = `\n\nCANDIDATE BACKGROUND:\n${parts.map(p => `- ${p}`).join('\n')}\nUse this background to ask targeted, personalized questions. Reference specific experiences or skills when following up.`
        }
      }
    } catch (e) {
      console.error('Error fetching profile:', e)
    }

    // Fetch school materials summary (if available)
    let materialsContext = ''
    try {
      if (schoolId) {
        const { data: userSchool } = await serviceClient
          .from('user_schools')
          .select('materials_summary')
          .eq('user_id', userId)
          .eq('school_id', schoolId)
          .single()

        if (userSchool?.materials_summary) {
          materialsContext = `\n\nCANDIDATE'S APPLICATION MATERIALS FOR ${schoolName.toUpperCase()}:\n${userSchool.materials_summary}\nUse this application context to ask deeper, more targeted questions about their essays, stated goals, and motivations. Reference specific content from their application when relevant.`
        }
      }
    } catch (e) {
      console.error('Error fetching materials:', e)
    }

    // Fetch active AI configuration
    let basePrompt = ''
    try {
      const { data: aiConfig } = await serviceClient
        .from('ai_configurations')
        .select('system_prompt')
        .eq('is_active', true)
        .single()

      if (aiConfig?.system_prompt) {
        basePrompt = aiConfig.system_prompt
      }
    } catch (e) {
      console.error('Error fetching AI config:', e)
    }

    // Fallback if no active config found
    if (!basePrompt) {
      basePrompt = `You are a seasoned MBA admissions interviewer for ${schoolName}. Conduct a professional, rigorous interview. Keep responses concise (under 80 words). Cover leadership, goals, fit, and self-awareness.`
    }

    // Replace school name placeholder if the prompt references a specific school
    let instructions = basePrompt.replace(/Columbia Business School/gi, schoolName)

    instructions += candidateContext
    instructions += materialsContext

    if (generalQuestions || schoolQuestions) {
      instructions += `\n\nINTERVIEW QUESTIONS TO DRAW FROM:\n`
      if (generalQuestions) instructions += `\nGENERAL QUESTIONS:\n${generalQuestions}\n`
      if (schoolQuestions) instructions += `\n${schoolName.toUpperCase()} SPECIFIC QUESTIONS:\n${schoolQuestions}\n`
      instructions += `\nUse these questions as your interview guide. Adapt naturally based on the candidate's responses and ask relevant follow-up questions.`
    }

    const REALTIME_MODEL = 'gpt-realtime'

    // Create ephemeral client secret via the current OpenAI Realtime API
    const sessionResponse = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session: {
          type: 'realtime',
          model: REALTIME_MODEL,
          instructions,
          audio: {
            input: {
              format: { type: 'audio/pcm', rate: 24000 },
              transcription: { model: 'whisper-1' },
              turn_detection: {
                type: 'server_vad',
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 800,
              },
            },
            output: {
              format: { type: 'audio/pcm', rate: 24000 },
              voice: 'alloy',
            },
          },
        },
      }),
    })

    if (!sessionResponse.ok) {
      const errorText = await sessionResponse.text()
      console.error('OpenAI session error:', sessionResponse.status, errorText)
      throw new Error(`Failed to create realtime session: ${sessionResponse.status}`)
    }

    const sessionData = await sessionResponse.json()

    return new Response(
      JSON.stringify({
        client_secret: { value: sessionData.value ?? sessionData.client_secret?.value },
        session_id: sessionData.session?.id ?? sessionData.id ?? null,
        model: REALTIME_MODEL,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in realtime-session function:', error)
    return new Response(
      JSON.stringify({ error: 'An error occurred creating the session' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
