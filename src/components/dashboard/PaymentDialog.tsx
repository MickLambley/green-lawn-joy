import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CreditCard, Lock, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { stripePromise } from "@/lib/stripe";

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
  clientSecret: string | null;
}

interface CheckoutFormProps {
  amount: number;
  onPaymentSuccess: () => void;
  bookingDetails: {
    date: string;
    timeSlot: string;
    address: string;
  };
}

const CheckoutForm = ({ amount, onPaymentSuccess, bookingDetails }: CheckoutFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message || "An error occurred");
      setProcessing(false);
      return;
    }

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment-success`,
      },
      redirect: "if_required",
    });

    if (confirmError) {
      setError(confirmError.message || "Payment failed");
      setProcessing(false);
    } else {
      setPaymentComplete(true);
      setTimeout(() => {
        onPaymentSuccess();
      }, 1500);
    }
  };

  if (paymentComplete) {
    return (
      <div className="py-8 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Payment Successful!</h3>
        <p className="text-muted-foreground">Your booking has been confirmed.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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

      {/* Stripe Payment Element */}
      <div className="space-y-4">
        <PaymentElement />
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Payment Button */}
      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={!stripe || !elements || processing}
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
    </form>
  );
};

const PaymentDialog = ({
  open,
  onOpenChange,
  amount,
  onPaymentSuccess,
  bookingDetails,
  clientSecret,
}: PaymentDialogProps) => {
  const [stripeReady, setStripeReady] = useState(false);

  useEffect(() => {
    if (stripePromise) {
      setStripeReady(true);
    }
  }, []);

  const stripeNotConfigured = !stripePromise;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Complete Payment
          </DialogTitle>
          <DialogDescription>
            Secure payment powered by Stripe
          </DialogDescription>
        </DialogHeader>

        {stripeNotConfigured ? (
          <div className="py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Payment Not Available</h3>
            <p className="text-muted-foreground text-sm">
              Payment processing is not configured. Please contact support.
            </p>
          </div>
        ) : !clientSecret ? (
          <div className="py-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Preparing payment...</p>
          </div>
        ) : stripeReady && stripePromise ? (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: "stripe",
                variables: {
                  colorPrimary: "#22c55e",
                },
              },
            }}
          >
            <CheckoutForm
              amount={amount}
              onPaymentSuccess={onPaymentSuccess}
              bookingDetails={bookingDetails}
            />
          </Elements>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default PaymentDialog;
