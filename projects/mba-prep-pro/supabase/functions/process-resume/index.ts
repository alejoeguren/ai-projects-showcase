import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { extractText, getDocumentProxy } from 'npm:unpdf';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication validation
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', success: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: authError } = await authClient.auth.getUser(token);

    if (authError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token', success: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authenticatedUserId = userData.user.id;

    // Service role client for database operations
    const supabaseClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { documentId, userId } = await req.json();

    // Input validation
    if (!documentId || typeof documentId !== 'string' || !UUID_REGEX.test(documentId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid document ID format', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!userId || typeof userId !== 'string' || !UUID_REGEX.test(userId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid user ID format', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the authenticated user matches the userId parameter
    if (authenticatedUserId !== userId) {
      return new Response(
        JSON.stringify({ error: 'You can only process your own documents', success: false }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get document details
    const { data: document, error: docError } = await supabaseClient
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single();

    if (docError || !document) {
      return new Response(
        JSON.stringify({ error: 'Document not found or access denied', success: false }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if processing is needed
    const { data: needsProcessing } = await supabaseClient
      .rpc('needs_resume_processing', {
        _user_id: userId,
        _document_updated_at: document.updated_at
      });

    if (!needsProcessing) {
      console.log('Resume already processed, skipping...');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Resume already processed',
        alreadyProcessed: true 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get document content from storage
    const { data: fileData, error: fileError } = await supabaseClient.storage
      .from('documents')
      .download(`${userId}/${document.file_name}`);

    if (fileError || !fileData) {
      throw new Error('Failed to download document file');
    }

    // Extract text from PDF using unpdf
    const arrayBuffer = await fileData.arrayBuffer();
    const pdf = await getDocumentProxy(new Uint8Array(arrayBuffer));
    const { text: fileText } = await extractText(pdf, { mergePages: true });
    console.log('Extracted text length:', fileText.length, 'First 200 chars:', fileText.substring(0, 200));

    if (!fileText || fileText.trim().length < 50) {
      throw new Error('Could not extract meaningful text from PDF. The file may be scanned/image-based.');
    }

    // Process with OpenAI
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert resume analyzer. Extract structured information from the resume content and return it as JSON with these exact fields:
            {
              "skills": ["skill1", "skill2", ...],
              "workExperienceSummary": "Brief summary of work experience",
              "educationBackground": "Education details",
              "careerObjectives": "Career goals and objectives",
              "industryExperience": ["industry1", "industry2", ...],
              "leadershipExamples": "Leadership experience examples",
              "metadata": {
                "yearsOfExperience": 0,
                "currentRole": "",
                "keyAchievements": ["achievement1", "achievement2", ...],
                "certifications": ["cert1", "cert2", ...],
                "languages": ["language1", "language2", ...],
                "softSkills": ["skill1", "skill2", ...]
              }
            }
            
            Be concise but comprehensive. If information is not available, use empty strings or arrays.`
          },
          {
            role: 'user',
            content: `Please analyze this resume and extract the information:\n\n${fileText}`
          }
        ],
        temperature: 0.3,
        max_tokens: 1500,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error response:', errorText);
      throw new Error(`OpenAI API request failed with status ${response.status}: ${errorText}`);
    }

    const aiResponse = await response.json();
    console.log('OpenAI response received:', JSON.stringify(aiResponse).substring(0, 200));
    
    if (!aiResponse.choices?.[0]?.message?.content) {
      console.error('Unexpected OpenAI response structure:', JSON.stringify(aiResponse));
      throw new Error('Failed to get valid response from OpenAI');
    }

    let parsedData;
    try {
      let content = aiResponse.choices[0].message.content;
      // Strip markdown code fences if present
      content = content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
      parsedData = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', aiResponse.choices[0].message.content);
      throw new Error('Failed to parse AI response');
    }

    // Update candidate metadata using the database function
    const { error: updateError } = await supabaseClient
      .rpc('update_candidate_metadata', {
        _user_id: userId,
        _metadata: parsedData.metadata || {},
        _skills: parsedData.skills || [],
        _experience_summary: parsedData.workExperienceSummary || '',
        _education: parsedData.educationBackground || '',
        _objectives: parsedData.careerObjectives || '',
        _industries: parsedData.industryExperience || [],
        _leadership: parsedData.leadershipExamples || ''
      });

    if (updateError) {
      console.error('Database update error:', updateError);
      throw new Error('Failed to update candidate metadata');
    }

    console.log('Successfully processed resume for user:', userId);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Resume processed successfully',
      data: parsedData 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in process-resume function:', error);
    return new Response(JSON.stringify({ 
      error: 'An error occurred processing your request',
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
