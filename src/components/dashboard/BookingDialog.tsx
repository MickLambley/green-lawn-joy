import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Calculator, CreditCard, Ruler, Scissors, Clock, CalendarDays } from "lucide-react";
import PaymentDialog from "./PaymentDialog";
import type { Database } from "@/integrations/supabase/types";

type Address = Database["public"]["Tables"]["addresses"]["Row"];

interface BookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  address: Address;
  onSuccess: () => void;
}

interface PricingSettings {
  base_price_per_sqm: number;
  fixed_base_price: number;
  grass_length_short: number;
  grass_length_medium: number;
  grass_length_long: number;
  grass_length_very_long: number;
  clipping_removal_cost: number;
  saturday_surcharge: number;
  sunday_surcharge: number;
  public_holiday_surcharge: number;
  slope_mild_multiplier: number;
  slope_steep_multiplier: number;
  tier_multiplier: number;
}

interface QuoteBreakdown {
  basePrice: number;
  areaPrice: number;
  slopeMultiplier: number;
  tierMultiplier: number;
  grassLengthMultiplier: number;
  clippingsCost: number;
  daySurcharge: number;
  subtotal: number;
  total: number;
}

const grassLengthOptions = [
  { value: "short", label: "Short", description: "Below ankle - like a credit card thickness", icon: "💳" },
  { value: "medium", label: "Medium", description: "Ankle height - like a smartphone laying flat", icon: "📱" },
  { value: "long", label: "Long", description: "Shin height - like a water bottle", icon: "🍶" },
  { value: "very_long", label: "Very Long", description: "Knee height or above - like a ruler standing up", icon: "📏" },
];

const timeSlots = [
  { value: "7am-10am", label: "7:00 AM - 10:00 AM", description: "Early morning" },
  { value: "10am-2pm", label: "10:00 AM - 2:00 PM", description: "Late morning" },
  { value: "2pm-5pm", label: "2:00 PM - 5:00 PM", description: "Afternoon" },
];

const BookingDialog = ({ open, onOpenChange, address, onSuccess }: BookingDialogProps) => {
  const [step, setStep] = useState<"form" | "quote">("form");
  const [loading, setLoading] = useState(false);
  const [pricingSettings, setPricingSettings] = useState<PricingSettings | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [createdBookingId, setCreatedBookingId] = useState<string | null>(null);
  
  // Form state
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [grassLength, setGrassLength] = useState("medium");
  const [clippingsRemoval, setClippingsRemoval] = useState(false);
  const [timeSlot, setTimeSlot] = useState("10am-2pm");
  
  // Quote state
  const [quote, setQuote] = useState<QuoteBreakdown | null>(null);

  useEffect(() => {
    if (open) {
      fetchPricingSettings();
      setStep("form");
      setSelectedDate(undefined);
      setGrassLength("medium");
      setClippingsRemoval(false);
      setTimeSlot("10am-2pm");
      setQuote(null);
    }
  }, [open]);

  const fetchPricingSettings = async () => {
    const { data } = await supabase
      .from("pricing_settings")
      .select("key, value");

    if (data) {
      const settings: Record<string, number> = {};
      data.forEach((row) => {
        settings[row.key] = Number(row.value);
      });
      setPricingSettings(settings as unknown as PricingSettings);
    }
  };

  const isWeekend = (date: Date): boolean => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  const isSaturday = (date: Date): boolean => date.getDay() === 6;
  const isSunday = (date: Date): boolean => date.getDay() === 0;

  const calculateQuote = (): QuoteBreakdown | null => {
    if (!pricingSettings || !selectedDate || !address.square_meters) return null;

    const basePrice = pricingSettings.fixed_base_price;
    const areaPrice = Number(address.square_meters) * pricingSettings.base_price_per_sqm;

    // Slope multiplier
    let slopeMultiplier = 1;
    if (address.slope === "mild") slopeMultiplier = pricingSettings.slope_mild_multiplier;
    if (address.slope === "steep") slopeMultiplier = pricingSettings.slope_steep_multiplier;

    // Tier multiplier (additional per extra tier)
    const tierMultiplier = 1 + (address.tier_count - 1) * pricingSettings.tier_multiplier;

    // Grass length multiplier
    const grassLengthKey = `grass_length_${grassLength}` as keyof PricingSettings;
    const grassLengthMultiplier = pricingSettings[grassLengthKey] || 1;

    // Clippings removal cost
    const clippingsCost = clippingsRemoval ? pricingSettings.clipping_removal_cost : 0;

    // Day surcharge
    let daySurcharge = 1;
    if (isSaturday(selectedDate)) daySurcharge = pricingSettings.saturday_surcharge;
    if (isSunday(selectedDate)) daySurcharge = pricingSettings.sunday_surcharge;
    // Note: Public holidays would need a separate check with a holidays API

    const subtotal = (basePrice + areaPrice) * slopeMultiplier * tierMultiplier * grassLengthMultiplier;
    const total = (subtotal * daySurcharge) + clippingsCost;

    return {
      basePrice,
      areaPrice,
      slopeMultiplier,
      tierMultiplier,
      grassLengthMultiplier,
      clippingsCost,
      daySurcharge,
      subtotal,
      total: Math.round(total * 100) / 100,
    };
  };

  const handleGetQuote = () => {
    if (!selectedDate) {
      toast.error("Please select a date");
      return;
    }
    const calculatedQuote = calculateQuote();
    if (calculatedQuote) {
      setQuote(calculatedQuote);
      setStep("quote");
    }
  };

  const sendBookingEmail = async (bookingId: string, emailType: "created" | "confirmed" | "updated" | "cancelled") => {
    try {
      const { error } = await supabase.functions.invoke("send-booking-email", {
        body: { bookingId, emailType },
      });
      if (error) {
        console.error("Failed to send email:", error);
      }
    } catch (err) {
      console.error("Email notification error:", err);
    }
  };

  const handleBookNow = async () => {
    if (!selectedDate || !quote) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.from("bookings").insert([{
        user_id: user.id,
        address_id: address.id,
        scheduled_date: selectedDate.toISOString().split("T")[0],
        scheduled_time: timeSlot,
        grass_length: grassLength,
        clippings_removal: clippingsRemoval,
        time_slot: timeSlot,
        is_weekend: isWeekend(selectedDate),
        is_public_holiday: false,
        total_price: quote.total,
        quote_breakdown: JSON.parse(JSON.stringify(quote)),
        status: "pending" as const,
        payment_status: "unpaid",
      }]).select().single();

      if (error) throw error;

      setCreatedBookingId(data.id);
      
      // Send booking created email (non-blocking)
      sendBookingEmail(data.id, "created");
      
      setPaymentDialogOpen(true);
    } catch (error) {
      console.error("Booking error:", error);
      toast.error("Failed to create booking");
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async () => {
    if (!createdBookingId) return;

    // Update booking payment status
    await supabase
      .from("bookings")
      .update({ payment_status: "paid" })
      .eq("id", createdBookingId);

    // Send booking confirmed email (non-blocking)
    sendBookingEmail(createdBookingId, "confirmed");

    setPaymentDialogOpen(false);
    toast.success("Booking confirmed! A contractor will be assigned soon.");
    onSuccess();
    onOpenChange(false);
  };

  const disabledDays = { before: new Date() };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            {step === "form" && "Book Lawn Service"}
            {step === "quote" && "Your Quote"}
          </DialogTitle>
        </DialogHeader>

        {step === "form" && (
          <div className="space-y-6">
            {/* Address Info */}
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-medium">{address.street_address}</p>
              <p className="text-sm text-muted-foreground">
                {address.city}, {address.state} • {address.square_meters}m²
              </p>
            </div>

            {/* Date Selection */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4" />
                Select Date
              </Label>
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={disabledDays}
                  className="rounded-md border"
                />
              </div>
              {selectedDate && isWeekend(selectedDate) && (
                <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
                  ⚠️ Weekend bookings attract a surcharge
                </p>
              )}
            </div>

            {/* Time Slot */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Preferred Time Slot
              </Label>
              <RadioGroup value={timeSlot} onValueChange={setTimeSlot} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {timeSlots.map((slot) => (
                  <label
                    key={slot.value}
                    className={`flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      timeSlot === slot.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <RadioGroupItem value={slot.value} className="sr-only" />
                    <span className="font-medium text-sm">{slot.label}</span>
                    <span className="text-xs text-muted-foreground">{slot.description}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>

            {/* Grass Length */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Ruler className="w-4 h-4" />
                Current Grass Length
              </Label>
              <RadioGroup value={grassLength} onValueChange={setGrassLength} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {grassLengthOptions.map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      grassLength === option.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <RadioGroupItem value={option.value} className="sr-only" />
                    <span className="text-2xl">{option.icon}</span>
                    <div>
                      <span className="font-medium block">{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            </div>

            {/* Clippings Removal */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-border">
              <div className="flex items-center gap-3">
                <Scissors className="w-5 h-5 text-muted-foreground" />
                <div>
                  <Label className="font-medium">Remove Grass Clippings</Label>
                  <p className="text-xs text-muted-foreground">
                    Clippings will be bagged and removed from your property
                  </p>
                </div>
              </div>
              <Switch checked={clippingsRemoval} onCheckedChange={setClippingsRemoval} />
            </div>

            <Button 
              className="w-full" 
              size="lg" 
              onClick={handleGetQuote}
              disabled={!selectedDate}
            >
              <Calculator className="w-4 h-4 mr-2" />
              Get Instant Quote
            </Button>
          </div>
        )}

        {step === "quote" && quote && (
          <div className="space-y-6">
            {/* Quote Breakdown */}
            <div className="space-y-3">
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Base service fee</span>
                <span>${quote.basePrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Area charge ({address.square_meters}m²)</span>
                <span>${quote.areaPrice.toFixed(2)}</span>
              </div>
              {quote.slopeMultiplier > 1 && (
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Slope adjustment ({address.slope})</span>
                  <span>×{quote.slopeMultiplier.toFixed(2)}</span>
                </div>
              )}
              {quote.tierMultiplier > 1 && (
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Multi-tier adjustment ({address.tier_count} tiers)</span>
                  <span>×{quote.tierMultiplier.toFixed(2)}</span>
                </div>
              )}
              {quote.grassLengthMultiplier > 1 && (
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Grass length adjustment ({grassLength})</span>
                  <span>×{quote.grassLengthMultiplier.toFixed(2)}</span>
                </div>
              )}
              {quote.daySurcharge > 1 && (
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Weekend surcharge</span>
                  <span>×{quote.daySurcharge.toFixed(2)}</span>
                </div>
              )}
              {quote.clippingsCost > 0 && (
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Clippings removal</span>
                  <span>+${quote.clippingsCost.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t pt-3 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-primary">${quote.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Booking Summary */}
            <div className="p-4 bg-muted rounded-lg space-y-2 text-sm">
              <p><strong>Date:</strong> {selectedDate?.toLocaleDateString("en-AU", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
              <p><strong>Time:</strong> {timeSlots.find(s => s.value === timeSlot)?.label}</p>
              <p><strong>Address:</strong> {address.street_address}, {address.city}</p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep("form")}>
                Modify Booking
              </Button>
              <Button className="flex-1" size="lg" onClick={handleBookNow} disabled={loading}>
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CreditCard className="w-4 h-4 mr-2" />
                )}
                Book Now
              </Button>
            </div>
          </div>
        )}
      </DialogContent>

      {/* Payment Dialog */}
      <PaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        amount={quote?.total || 0}
        onPaymentSuccess={handlePaymentSuccess}
        bookingDetails={{
          date: selectedDate?.toLocaleDateString("en-AU", { weekday: "long", month: "long", day: "numeric" }) || "",
          timeSlot: timeSlots.find(s => s.value === timeSlot)?.label || timeSlot,
          address: `${address.street_address}, ${address.city}`,
        }}
      />
    </Dialog>
  );
};

export default BookingDialog;
