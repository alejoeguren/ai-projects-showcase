import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabaseClient.auth.getUser(token);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const body = await req.json();
    const { session_id, tier, type, school_id } = body;
    if (!session_id) throw new Error("Missing session_id");
    logStep("Verifying session", { session_id, tier, type, school_id });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(session_id);
    logStep("Session retrieved", { status: session.payment_status, metadata: session.metadata });

    if (session.payment_status !== "paid") {
      throw new Error("Payment not completed");
    }

    if (session.metadata?.user_id !== user.id) {
      throw new Error("Payment session does not belong to this user");
    }

    // Handle add-on interview purchase
    if (type === "addon" || session.metadata?.type === "addon") {
      const targetSchoolId = school_id || session.metadata?.school_id;
      if (!targetSchoolId) throw new Error("Missing school_id for add-on purchase");

      // Idempotency: check if this session_id was already processed
      // We use the Stripe session's payment_intent as a unique key
      const paymentIntentId = session.payment_intent as string;
      const { data: existingPurchase } = await supabaseAdmin
        .from('app_settings')
        .select('id')
        .eq('key', `addon_processed_${paymentIntentId}`)
        .maybeSingle();

      if (existingPurchase) {
        logStep("Add-on already processed, skipping duplicate", { paymentIntentId });
        return new Response(JSON.stringify({
          success: true,
          type: "addon",
          school_id: targetSchoolId,
          already_processed: true,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Mark as processed before incrementing
      await supabaseAdmin.from('app_settings').insert({
        key: `addon_processed_${paymentIntentId}`,
        value: JSON.stringify({ user_id: user.id, school_id: targetSchoolId, processed_at: new Date().toISOString() }),
      });

      // Increment interviews_limit by 1
      const { error: incrementError } = await supabaseAdmin.rpc('purchase_additional_interview', {
        _user_id: user.id,
        _school_id: Number(targetSchoolId),
      });

      if (incrementError) throw new Error(`Failed to add interview: ${incrementError.message}`);
      logStep("Add-on interview added", { school_id: targetSchoolId });

      return new Response(JSON.stringify({
        success: true,
        type: "addon",
        school_id: targetSchoolId,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Handle tier purchase — ALWAYS use tier from verified Stripe session metadata,
    // never trust the client-supplied tier from the request body
    const verifiedTier = session.metadata?.tier;
    if (!verifiedTier) throw new Error("Missing tier in session metadata");
    if (tier && tier !== verifiedTier) {
      logStep("Client tier mismatch with session metadata, using verified tier", { clientTier: tier, verifiedTier });
    }

    const { data: tierLimits, error: limitsError } = await supabaseAdmin.rpc('get_tier_limits', { _tier: verifiedTier });
    if (limitsError) throw new Error(`Failed to get tier limits: ${limitsError.message}`);

    const limits = tierLimits?.[0];
    if (!limits) throw new Error(`No limits found for tier: ${verifiedTier}`);
    logStep("Tier limits retrieved", limits);

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        subscription_tier: verifiedTier,
        schools_limit: limits.schools_limit,
        tier_purchased_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (updateError) throw new Error(`Failed to update profile: ${updateError.message}`);
    logStep("Profile updated successfully", { tier: verifiedTier, schools_limit: limits.schools_limit });

    const { error: schoolsError } = await supabaseAdmin
      .from('user_schools')
      .update({ interviews_limit: limits.interviews_per_school })
      .eq('user_id', user.id);

    if (schoolsError) {
      logStep("Warning: Failed to update school interview limits", { error: schoolsError.message });
    }

    return new Response(JSON.stringify({
      success: true,
      tier: verifiedTier,
      schools_limit: limits.schools_limit,
      interviews_per_school: limits.interviews_per_school,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
