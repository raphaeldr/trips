import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve((req) => {
  // Simple CORS support
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  const token = Deno.env.get("VITE_MAPBOX_TOKEN") ?? "";

  if (!token) {
    return new Response(JSON.stringify({ error: "Mapbox token is not configured" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  return new Response(JSON.stringify({ token }), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
});
