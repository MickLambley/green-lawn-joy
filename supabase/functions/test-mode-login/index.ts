import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TEST_SECRET_KEY = "G8ZSXNxsdymav5E";

interface TestPersonaConfig {
  email: string;
  password: string;
  full_name: string;
  role: "user" | "contractor";
  contractor_profile?: {
    business_name: string;
    phone: string;
    service_areas: string[];
    approval_status: string;
    is_active: boolean;
    tier: string;
    stripe_onboarding_complete: boolean;
  };
}

const PERSONAS: Record<string, TestPersonaConfig> = {
  customer_new: {
    email: "test.customer@lawnly-test.local",
    password: "TestCustomer123!",
    full_name: "Test Customer",
    role: "user",
  },
  contractor_active: {
    email: "test.contractor@lawnly-test.local",
    password: "TestContractor123!",
    full_name: "Test Contractor",
    role: "contractor",
    contractor_profile: {
      business_name: "Test Lawn Care Co.",
      phone: "0400000000",
      service_areas: ["Melbourne", "VIC", "Sydney", "NSW", "Brisbane", "QLD"],
      approval_status: "approved",
      is_active: true,
      tier: "standard",
      stripe_onboarding_complete: true,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { persona, test_key } = await req.json();

    // Validate test key
    if (test_key !== TEST_SECRET_KEY) {
      return new Response(JSON.stringify({ error: "Invalid test key" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const config = PERSONAS[persona];
    if (!config) {
      return new Response(JSON.stringify({ error: "Unknown persona" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Try to sign in first
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const anonClient = createClient(supabaseUrl, anonKey);

    let signInResult = await anonClient.auth.signInWithPassword({
      email: config.email,
      password: config.password,
    });

    // If user doesn't exist, create them
    if (signInResult.error) {
      console.log(`Creating test user: ${config.email}`);

      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: config.email,
        password: config.password,
        email_confirm: true,
        user_metadata: { full_name: config.full_name },
      });

      if (createError) {
        throw new Error(`Failed to create test user: ${createError.message}`);
      }

      const userId = newUser.user.id;

      // Add contractor role if needed
      if (config.role === "contractor") {
        // Check if contractor role already exists
        const { data: existingRole } = await adminClient
          .from("user_roles")
          .select("id")
          .eq("user_id", userId)
          .eq("role", "contractor")
          .maybeSingle();

        if (!existingRole) {
          await adminClient.from("user_roles").insert({
            user_id: userId,
            role: "contractor",
          });
        }

        // Create contractor profile
        if (config.contractor_profile) {
          const { data: existingContractor } = await adminClient
            .from("contractors")
            .select("id")
            .eq("user_id", userId)
            .maybeSingle();

          if (!existingContractor) {
            await adminClient.from("contractors").insert({
              user_id: userId,
              ...config.contractor_profile,
            });
          }
        }
      }

      // Now sign in
      signInResult = await anonClient.auth.signInWithPassword({
        email: config.email,
        password: config.password,
      });

      if (signInResult.error) {
        throw new Error(`Failed to sign in after creation: ${signInResult.error.message}`);
      }
    } else {
      // User exists - ensure contractor profile exists if needed
      const userId = signInResult.data.user.id;
      if (config.role === "contractor" && config.contractor_profile) {
        const { data: existingContractor } = await adminClient
          .from("contractors")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();

        if (!existingContractor) {
          // Ensure contractor role
          const { data: existingRole } = await adminClient
            .from("user_roles")
            .select("id")
            .eq("user_id", userId)
            .eq("role", "contractor")
            .maybeSingle();

          if (!existingRole) {
            await adminClient.from("user_roles").insert({
              user_id: userId,
              role: "contractor",
            });
          }

          await adminClient.from("contractors").insert({
            user_id: userId,
            ...config.contractor_profile,
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        session: signInResult.data.session,
        user: signInResult.data.user,
        persona,
        role: config.role,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Test mode login error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
