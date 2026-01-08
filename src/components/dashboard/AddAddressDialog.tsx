import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Loader2 } from "lucide-react";

const addressSchema = z.object({
  street_address: z
    .string()
    .trim()
    .min(5, "Street address is required")
    .max(200, "Address must be less than 200 characters"),
  city: z
    .string()
    .trim()
    .min(2, "City is required")
    .max(100, "City must be less than 100 characters"),
  state: z
    .string()
    .trim()
    .min(2, "State is required")
    .max(100, "State must be less than 100 characters"),
  postal_code: z
    .string()
    .trim()
    .min(3, "Postal code is required")
    .max(20, "Postal code must be less than 20 characters"),
  country: z
    .string()
    .trim()
    .min(2, "Country is required")
    .max(100, "Country must be less than 100 characters"),
  slope: z.enum(["flat", "mild", "steep"]),
  tier_count: z.number().min(1).max(10),
});

type AddressFormData = z.infer<typeof addressSchema>;

interface AddAddressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const AddAddressDialog = ({ open, onOpenChange, onSuccess }: AddAddressDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      street_address: "",
      city: "",
      state: "",
      postal_code: "",
      country: "Australia",
      slope: "flat",
      tier_count: 1,
    },
  });

  const onSubmit = async (data: AddressFormData) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("You must be logged in to add an address.");
        return;
      }

      const { error } = await supabase.from("addresses").insert({
        user_id: user.id,
        street_address: data.street_address,
        city: data.city,
        state: data.state,
        postal_code: data.postal_code,
        country: data.country,
        slope: data.slope,
        tier_count: data.tier_count,
      });

      if (error) {
        console.error("Error adding address:", error);
        toast.error("Failed to submit address. Please try again.");
        return;
      }

      toast.success("Address submitted for verification!", {
        description: "We'll verify your property and notify you once it's approved.",
      });
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error("Failed to submit address. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="font-display">Add New Address</DialogTitle>
              <DialogDescription>
                Enter your property address for verification.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="street_address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street Address</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Main Street" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="Sydney" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input placeholder="NSW" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="postal_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postal Code</FormLabel>
                    <FormControl>
                      <Input placeholder="2000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input {...field} disabled />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="border-t pt-4 mt-4">
              <h4 className="text-sm font-medium mb-3">Property Details</h4>
              <p className="text-xs text-muted-foreground mb-4">
                This helps us calculate accurate pricing for your property.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="slope"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Land Slope</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select slope" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="flat">Flat</SelectItem>
                          <SelectItem value="mild">Mild slope</SelectItem>
                          <SelectItem value="steep">Steep slope</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tier_count"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Tiers</FormLabel>
                      <Select 
                        onValueChange={(val) => field.onChange(parseInt(val))} 
                        defaultValue={field.value.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select tiers" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                            <SelectItem key={num} value={num.toString()}>
                              {num} {num === 1 ? "tier" : "tiers"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit for Verification"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddAddressDialog;
