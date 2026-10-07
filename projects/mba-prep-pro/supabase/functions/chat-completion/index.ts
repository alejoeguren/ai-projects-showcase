import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Authentication validation
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

    const { messages, schoolName, schoolId } = await req.json()
    
    // Input validation
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid messages array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (typeof schoolName !== 'string' || schoolName.length > 200) {
      return new Response(
        JSON.stringify({ error: 'Invalid school name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate each message
    for (const msg of messages) {
      if (typeof msg.content !== 'string' || msg.content.length > 5000) {
        return new Response(
          JSON.stringify({ error: 'Message content invalid or too long (max 5000 chars)' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      if (!['interviewer', 'candidate'].includes(msg.role)) {
        return new Response(
          JSON.stringify({ error: 'Invalid message role' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Validate schoolId if provided
    if (schoolId !== undefined && schoolId !== null) {
      if (typeof schoolId !== 'number' || !Number.isInteger(schoolId) || schoolId < 0) {
        return new Response(
          JSON.stringify({ error: 'Invalid school ID' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Verify user has access to this school
      const { data: userSchool, error: schoolError } = await supabaseClient
        .from('user_schools')
        .select('id')
        .eq('user_id', userId)
        .eq('school_id', schoolId)
        .single()

      if (schoolError || !userSchool) {
        return new Response(
          JSON.stringify({ error: 'You do not have access to this school' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    // Initialize service role client for fetching questions
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch question banks (general + school-specific)
    let generalQuestions = ''
    let schoolQuestions = ''

    try {
      const query = serviceClient
        .from('school_interview_questions')
        .select('school_id, questions_text')
        .eq('is_active', true)

      // If schoolId is provided, fetch both general and school-specific
      // Otherwise just fetch general questions
      if (schoolId) {
        query.or(`school_id.is.null,school_id.eq.${schoolId}`)
      } else {
        query.is('school_id', null)
      }

      const { data: questionBanks, error } = await query

      if (error) {
        console.error('Error fetching questions:', error)
      } else if (questionBanks) {
        generalQuestions = questionBanks.find(q => !q.school_id)?.questions_text || ''
        schoolQuestions = questionBanks.find(q => q.school_id === schoolId)?.questions_text || ''
      }
    } catch (fetchError) {
      console.error('Error in question fetch:', fetchError)
    }

    // Fetch candidate profile data for personalization
    let candidateContext = ''
    try {
      const { data: profile, error: profileError } = await serviceClient
        .from('profiles')
        .select('processed_skills, work_experience_summary, education_background, career_objectives, industry_experience, leadership_examples')
        .eq('user_id', userId)
        .single()

      if (!profileError && profile) {
        const parts: string[] = []
        if (profile.processed_skills?.length) parts.push(`Skills: ${profile.processed_skills.join(', ')}`)
        if (profile.work_experience_summary) parts.push(`Experience: ${profile.work_experience_summary}`)
        if (profile.education_background) parts.push(`Education: ${profile.education_background}`)
        if (profile.career_objectives) parts.push(`Career Goals: ${profile.career_objectives}`)
        if (profile.industry_experience?.length) parts.push(`Industries: ${profile.industry_experience.join(', ')}`)
        if (profile.leadership_examples) parts.push(`Leadership: ${profile.leadership_examples}`)
        
        if (parts.length > 0) {
          candidateContext = `\n\nCANDIDATE BACKGROUND:\n${parts.map(p => `- ${p}`).join('\n')}\n\nUse this background to ask targeted, personalized questions. Reference specific experiences or skills when following up.`
        }
      }
    } catch (profileFetchError) {
      console.error('Error fetching candidate profile:', profileFetchError)
    }

    // Build the system prompt with questions context
    let systemPrompt = `You are an MBA interview bot for ${schoolName}. Conduct a professional MBA interview asking relevant questions about the candidate's background, goals, leadership experience, and fit for the program. Keep responses conversational, encouraging, and under 100 words. Ask follow-up questions based on their responses.`

    // Add candidate context if available
    systemPrompt += candidateContext

    // Add questions context if available
    if (generalQuestions || schoolQuestions) {
      systemPrompt += `\n\nINTERVIEW QUESTIONS TO DRAW FROM:\n`
      
      if (generalQuestions) {
        systemPrompt += `\nGENERAL QUESTIONS:\n${generalQuestions}\n`
      }
      
      if (schoolQuestions) {
        systemPrompt += `\n${schoolName.toUpperCase()} SPECIFIC QUESTIONS:\n${schoolQuestions}\n`
      }

      systemPrompt += `\nUse these questions as your interview guide. Adapt naturally based on the candidate's responses and ask relevant follow-up questions.`
    }
    
    const openaiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((msg: any) => ({
        role: msg.role === 'interviewer' ? 'assistant' : 'user',
        content: msg.content
      }))
    ]

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: openaiMessages,
        max_tokens: 150,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('OpenAI API error:', error)
      throw new Error('Failed to get AI response')
    }

    const data = await response.json()
    
    return new Response(
      JSON.stringify({ content: data.choices[0].message.content }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error in chat-completion function:', error)
    return new Response(
      JSON.stringify({ error: 'An error occurred processing your request' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
