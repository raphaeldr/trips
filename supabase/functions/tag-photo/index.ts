import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { photoId } = await req.json();
    
    if (!photoId) {
      return new Response(
        JSON.stringify({ error: "Photo ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get photo from database
    const { data: photo, error: photoError } = await supabase
      .from("photos")
      .select("*")
      .eq("id", photoId)
      .single();

    if (photoError || !photo) {
      throw new Error("Photo not found");
    }

    // Get public URL for the photo
    const { data: { publicUrl } } = supabase.storage
      .from("photos")
      .getPublicUrl(photo.storage_path);

    // Download the image
    const imageResponse = await fetch(publicUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));

    // Call Lovable AI for tagging
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a photo tagging assistant. Analyze images and provide relevant tags and a caption. Focus on: landscapes, food, people, cities, architecture, nature, activities, emotions, colors, and time of day. Return tags as a JSON array and a brief caption."
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this travel photo and provide: 1) An array of relevant tags (5-10 tags), 2) A brief, engaging caption (1-2 sentences)"
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${photo.mime_type};base64,${base64Image}`
                }
              }
            ]
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "tag_photo",
              description: "Tag and caption a travel photo",
              parameters: {
                type: "object",
                properties: {
                  tags: {
                    type: "array",
                    items: { type: "string" },
                    description: "Array of relevant tags for the photo"
                  },
                  caption: {
                    type: "string",
                    description: "A brief, engaging caption for the photo"
                  }
                },
                required: ["tags", "caption"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "tag_photo" } }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error("No tool call in AI response");
    }

    const result = JSON.parse(toolCall.function.arguments);

    // Update photo with AI tags and caption
    const { error: updateError } = await supabase
      .from("photos")
      .update({
        ai_tags: result.tags,
        ai_caption: result.caption,
        updated_at: new Date().toISOString()
      })
      .eq("id", photoId);

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        tags: result.tags, 
        caption: result.caption 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error tagging photo:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to tag photo" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});