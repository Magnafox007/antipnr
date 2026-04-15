import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(
        JSON.stringify({ error: "Stripe not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

    const { billing, userId, userEmail } = await req.json();

    const isAnnual = billing === "annual";

    const priceData = isAnnual
      ? {
          currency: "brl",
          unit_amount: 14990,
          recurring: { interval: "year" as const },
          product_data: {
            name: "AntiPNR Pro - Plano Anual",
            description: "Buscas ilimitadas, Analisador de Rota, Mapa de Risco completo, Sem anuncios",
          },
        }
      : {
          currency: "brl",
          unit_amount: 1990,
          recurring: { interval: "month" as const },
          product_data: {
            name: "AntiPNR Pro - Plano Mensal",
            description: "Buscas ilimitadas, Analisador de Rota, Mapa de Risco completo, Sem anuncios",
          },
        };

    const appUrl = Deno.env.get("URL_DO_APLICATIVO") || Deno.env.get("APP_URL") || "https://faaljeqbthbhjlhodxof.supabase.co";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [
        {
          price_data: priceData,
          quantity: 1,
        },
      ],
      metadata: {
        userId: userId || "",
        billing: billing || "monthly",
      },
      customer_email: userEmail || undefined,
      success_url: `${appUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/payment-cancel`,
    });

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
