import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const token = authHeader.replace('Bearer ', '')
    const { data: userData, error: authError } = await supabaseClient.auth.getUser(token)
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const userId = userData.user.id
    const { schoolId, schoolName, filePath } = await req.json()

    if (!schoolId || !filePath) {
      return new Response(JSON.stringify({ error: 'Missing schoolId or filePath' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Download the file from storage
    const { data: fileData, error: downloadError } = await supabaseClient.storage
      .from('documents')
      .download(filePath)

    if (downloadError || !fileData) {
      console.error('Download error:', downloadError)
      return new Response(JSON.stringify({ error: 'Failed to download document' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Extract text from the PDF using unpdf (same approach as process-resume)
    let documentText = ''
    try {
      const { getDocumentProxy, extractText } = await import("npm:unpdf")
      const buffer = await fileData.arrayBuffer()
      const pdf = await getDocumentProxy(new Uint8Array(buffer))
      const { text } = await extractText(pdf, { mergePages: true })
      documentText = text
    } catch (e) {
      console.error('PDF extraction error:', e)
      // Fallback: try reading as text
      try {
        documentText = await fileData.text()
      } catch {
        return new Response(JSON.stringify({ error: 'Failed to extract text from document' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    if (!documentText || documentText.trim().length < 50) {
      return new Response(JSON.stringify({ error: 'Document appears to be empty or too short to analyze' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Truncate to avoid token limits
    const maxChars = 15000
    const truncatedText = documentText.slice(0, maxChars)

    // Use Lovable AI to analyze the school materials
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured')
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: `You are an MBA admissions expert. Analyze the following application materials for ${schoolName || 'an MBA program'} and produce a concise summary (under 500 words) that an interviewer can reference. Focus on:
1. Key essay themes and narratives
2. Stated goals and motivations for pursuing an MBA
3. Why this specific school/program
4. Notable experiences or achievements highlighted
5. Any unique angles or personal stories

Format as a structured brief that an interviewer can quickly scan. Be factual and reference specific content from the document.`
          },
          {
            role: 'user',
            content: `Here are the application materials:\n\n${truncatedText}`
          }
        ],
      }),
    })

    if (!aiResponse.ok) {
      const errText = await aiResponse.text()
      console.error('AI analysis error:', aiResponse.status, errText)
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded, please try again later' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      throw new Error(`AI analysis failed: ${aiResponse.status}`)
    }

    const aiData = await aiResponse.json()
    const summary = aiData.choices?.[0]?.message?.content || ''

    if (!summary) {
      throw new Error('AI returned empty summary')
    }

    // Store the summary in user_schools using service client
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const serviceClient = createClient(supabaseUrl, serviceKey)

    const { error: updateError } = await serviceClient
      .from('user_schools')
      .update({
        materials_summary: summary,
        materials_processed_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('school_id', schoolId)

    if (updateError) {
      console.error('Update error:', updateError)
      throw new Error('Failed to save materials summary')
    }

    console.log(`Materials processed for user ${userId}, school ${schoolId}`)

    return new Response(JSON.stringify({ success: true, summary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error in process-school-materials:', error)
    return new Response(JSON.stringify({ error: 'Failed to process school materials' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})