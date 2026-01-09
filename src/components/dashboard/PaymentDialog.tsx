import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CreditCard, Lock, Loader2, CheckCircle } from "lucide-react";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  onPaymentSuccess: () => void;
  bookingDetails: {
    date: string;
    timeSlot: string;
    address: string;
  };
}

const PaymentDialog = ({
  open,
  onOpenChange,
  amount,
  onPaymentSuccess,
  bookingDetails,
}: PaymentDialogProps) => {
  const [processing, setProcessing] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);

  const handlePayment = async () => {
    setProcessing(true);
    
    // TODO: Integrate with Stripe
    // This is a placeholder that simulates payment processing
    // When Stripe is connected, this will:
    // 1. Create a PaymentIntent via edge function
    // 2. Confirm payment with Stripe Elements
    // 3. Update booking payment_status to 'paid'
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setProcessing(false);
    setPaymentComplete(true);
    
    setTimeout(() => {
      onPaymentSuccess();
      setPaymentComplete(false);
    }, 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Complete Payment
          </DialogTitle>
          <DialogDescription>
            Secure payment powered by Stripe
          </DialogDescription>
        </DialogHeader>

        {paymentComplete ? (
          <div className="py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Payment Successful!</h3>
            <p className="text-muted-foreground">Your booking has been confirmed.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Booking Summary */}
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium">{bookingDetails.date}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Time</span>
                <span className="font-medium">{bookingDetails.timeSlot}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Address</span>
                <span className="font-medium text-right">{bookingDetails.address}</span>
              </div>
              <div className="border-t pt-2 mt-2 flex justify-between">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-lg text-primary">${amount.toFixed(2)}</span>
              </div>
            </div>

            {/* Stripe Elements Placeholder */}
            <div className="space-y-4">
              <div className="p-4 border border-dashed border-border rounded-lg bg-muted/50">
                <div className="text-center text-muted-foreground">
                  <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Stripe payment form will appear here</p>
                  <p className="text-xs mt-1">Connect Stripe to enable payments</p>
                </div>
              </div>
            </div>

            {/* Payment Button */}
            <Button
              className="w-full"
              size="lg"
              onClick={handlePayment}
              disabled={processing}
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Pay ${amount.toFixed(2)}
                </>
              )}
            </Button>

            {/* Security Notice */}
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Lock className="w-3 h-3" />
              <span>Secured with 256-bit SSL encryption</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PaymentDialog;
