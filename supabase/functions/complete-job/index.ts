import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[COMPLETE-JOB] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) throw new Error("User not authenticated");

    const userId = userData.user.id;
    logStep("User authenticated", { userId });

    // Verify contractor
    const { data: contractor } = await supabase
      .from("contractors")
      .select("id, user_id")
      .eq("user_id", userId)
      .single();

    if (!contractor) throw new Error("Contractor profile not found");

    const { bookingId } = await req.json();
    if (!bookingId) throw new Error("Missing bookingId");

    // Fetch booking
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, user_id, contractor_id, status, total_price, address_id, scheduled_date, time_slot, scheduled_time")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) throw new Error("Booking not found");
    if (booking.contractor_id !== contractor.id) throw new Error("You are not assigned to this booking");
    if (booking.status !== "confirmed") throw new Error("Booking must be in confirmed status to complete");

    // Verify photos exist
    const { data: photos } = await supabase
      .from("job_photos")
      .select("id, photo_type")
      .eq("booking_id", bookingId)
      .eq("contractor_id", contractor.id);

    const beforeCount = photos?.filter(p => p.photo_type === "before").length || 0;
    const afterCount = photos?.filter(p => p.photo_type === "after").length || 0;

    if (beforeCount < 4 || afterCount < 4) {
      throw new Error(`Minimum 4 before and 4 after photos required. You have ${beforeCount} before and ${afterCount} after.`);
    }

    logStep("Photos verified", { beforeCount, afterCount });

    // Update booking
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        status: "completed_pending_verification",
        completed_at: now,
        payout_status: "pending",
      })
      .eq("id", bookingId);

    if (updateError) throw new Error(`Failed to update booking: ${updateError.message}`);

    logStep("Booking updated to completed_pending_verification");

    // Fetch data for emails
    const [addressResult, customerProfileResult, contractorProfileResult, customerAuthResult] = await Promise.all([
      supabase.from("addresses").select("street_address, city, state").eq("id", booking.address_id).single(),
      supabase.from("profiles").select("full_name").eq("user_id", booking.user_id).single(),
      supabase.from("profiles").select("full_name").eq("user_id", userId).single(),
      supabase.auth.admin.getUserById(booking.user_id),
    ]);

    const address = addressResult.data;
    const customerName = customerProfileResult.data?.full_name || "Customer";
    const contractorName = contractorProfileResult.data?.full_name || "Your contractor";
    const customerEmail = customerAuthResult.data?.user?.email;
    const contractorEmail = userData.user.email;

    const dateFormatted = new Date(booking.scheduled_date).toLocaleDateString("en-AU", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

    // Send notifications
    await Promise.all([
      supabase.from("notifications").insert({
        user_id: booking.user_id,
        title: "Your Lawn Has Been Mowed! 🌿",
        message: `${contractorName} has completed your job. Please review the before/after photos and approve the payment.`,
        type: "success",
        booking_id: bookingId,
      }),
      supabase.from("notifications").insert({
        user_id: userId,
        title: "Job Marked Complete",
        message: `Your job at ${address?.street_address || "the property"} is marked complete. Payment will be released after customer approval or automatically in 48 hours.`,
        type: "info",
        booking_id: bookingId,
      }),
    ]);

    // Send emails (non-blocking)
    try {
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (resendApiKey) {
        const emailPromises = [];

        // Customer email
        if (customerEmail) {
          emailPromises.push(
            fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${resendApiKey}`,
              },
              body: JSON.stringify({
                from: "Lawn Care <onboarding@resend.dev>",
                to: [customerEmail],
                subject: "Your Lawn Has Been Mowed! 🌿 Review Photos",
                html: `
                  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #16a34a;">Your Lawn Has Been Mowed! 🌿</h1>
                    <p>Hi ${customerName},</p>
                    <p>${contractorName} has completed your lawn mowing job. Before and after photos have been uploaded for your review.</p>
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                      <p style="margin: 5px 0;"><strong>Address:</strong> ${address?.street_address}, ${address?.city}, ${address?.state}</p>
                      <p style="margin: 5px 0;"><strong>Date:</strong> ${dateFormatted}</p>
                      <p style="margin: 5px 0;"><strong>Amount:</strong> $${Number(booking.total_price).toFixed(2)}</p>
                    </div>
                    <p>Please review the photos and approve the payment. If you don't respond, payment will be automatically released in 48 hours.</p>
                    <p style="color: #666; margin-top: 30px;">Best regards,<br>The Lawnly Team</p>
                  </div>
                `,
              }),
            })
          );
        }

        // Contractor email
        if (contractorEmail) {
          emailPromises.push(
            fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${resendApiKey}`,
              },
              body: JSON.stringify({
                from: "Lawn Care <onboarding@resend.dev>",
                to: [contractorEmail],
                subject: "Job Marked Complete ✓",
                html: `
                  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #16a34a;">Job Marked Complete ✓</h1>
                    <p>Hi ${contractorName},</p>
                    <p>Your job has been marked as complete. The customer has been notified to review your work.</p>
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                      <p style="margin: 5px 0;"><strong>Address:</strong> ${address?.street_address}, ${address?.city}, ${address?.state}</p>
                      <p style="margin: 5px 0;"><strong>Date:</strong> ${dateFormatted}</p>
                      <p style="margin: 5px 0;"><strong>Amount:</strong> $${Number(booking.total_price).toFixed(2)}</p>
                    </div>
                    <p>Payment will be released after customer approval or automatically in 48 hours.</p>
                    <p style="color: #666; margin-top: 30px;">Best regards,<br>The Lawnly Team</p>
                  </div>
                `,
              }),
            })
          );
        }

        await Promise.all(emailPromises);
        logStep("Emails sent");
      }
    } catch (emailError) {
      logStep("Email sending failed (non-blocking)", { error: String(emailError) });
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
