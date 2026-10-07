import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Tier to Stripe price mapping
const TIER_PRICES: Record<string, string> = {
  essential: "price_REPLACE_ME",
  professional: "price_REPLACE_ME",
  premium: "price_REPLACE_ME",
};

const ADDON_PRICE = "price_REPLACE_ME";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const body = await req.json();
    const { tier, type, school_id, source } = body;

    let priceId: string;
    let successUrl: string;
    let metadata: Record<string, string> = { user_id: user.id };

    const origin = req.headers.get("origin") || "http://localhost:3000";

    if (type === "addon") {
      // Add-on interview purchase
      if (!school_id) throw new Error("school_id is required for add-on purchases");
      priceId = ADDON_PRICE;
      successUrl = `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}&type=addon&school_id=${school_id}`;
      metadata.type = "addon";
      metadata.school_id = String(school_id);
      logStep("Add-on purchase", { school_id, priceId });
    } else {
      // Tier purchase
      if (!tier || !TIER_PRICES[tier]) {
        throw new Error(`Invalid tier: ${tier}. Must be one of: ${Object.keys(TIER_PRICES).join(", ")}`);
      }
      priceId = TIER_PRICES[tier];
      successUrl = `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}&tier=${tier}`;
      metadata.tier = tier;
      logStep("Tier selected", { tier, priceId });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "payment",
      success_url: successUrl,
      cancel_url: source === 'onboarding' ? `${origin}/onboarding` : `${origin}/pricing`,
      metadata,
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
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
