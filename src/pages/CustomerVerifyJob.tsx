import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Leaf,
  Loader2,
  ArrowLeft,
  Clock,
  Star,
  AlertTriangle,
  CheckCircle2,
  Upload,
  X,
  Camera,
} from "lucide-react";
import { toast } from "sonner";
import JobPhotosGallery from "@/components/dashboard/JobPhotosGallery";

const CustomerVerifyJob = () => {
  const { id: bookingId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<any>(null);
  const [contractorName, setContractorName] = useState("Contractor");
  const [hoursRemaining, setHoursRemaining] = useState<number | null>(null);

  // Approve flow
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [approving, setApproving] = useState(false);
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);
  const [approved, setApproved] = useState(false);

  // Dispute flow
  const [disputeDialogOpen, setDisputeDialogOpen] = useState(false);
  const [disputeDescription, setDisputeDescription] = useState("");
  const [disputePhotos, setDisputePhotos] = useState<{ file: File; previewUrl: string }[]>([]);
  const [submittingDispute, setSubmittingDispute] = useState(false);
  const [disputed, setDisputed] = useState(false);
  const disputeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchBooking();
  }, [bookingId]);

  // Countdown timer - update every minute
  useEffect(() => {
    if (!booking?.completed_at) return;

    const updateTimer = () => {
      const completedAt = new Date(booking.completed_at).getTime();
      const deadline = completedAt + 48 * 60 * 60 * 1000;
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((deadline - now) / (1000 * 60 * 60)));
      setHoursRemaining(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [booking?.completed_at]);

  const fetchBooking = async () => {
    if (!bookingId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }

    const { data: bookingData, error } = await supabase
      .from("bookings")
      .select(`*, contractor:contractors(business_name, user_id)`)
      .eq("id", bookingId)
      .eq("user_id", user.id)
      .single();

    if (error || !bookingData) {
      toast.error("Booking not found");
      navigate("/dashboard");
      return;
    }

    setBooking(bookingData);

    // Get contractor name
    if (bookingData.contractor?.user_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", bookingData.contractor.user_id)
        .single();
      setContractorName(
        bookingData.contractor.business_name || profile?.full_name || "Contractor"
      );
    }

    setLoading(false);
  };

  const handleApprove = async () => {
    setApproving(true);
    try {
      const { data, error } = await supabase.functions.invoke("approve-job", {
        body: { bookingId, rating: rating || undefined, comment: ratingComment || undefined },
      });
      if (error || data?.error) throw new Error(data?.error || "Failed to approve");

      setApproveDialogOpen(false);
      setApproved(true);
      setRatingDialogOpen(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to approve job");
    } finally {
      setApproving(false);
    }
  };

  const handleSubmitRating = async () => {
    if (rating === 0) {
      // Skip rating
      setRatingDialogOpen(false);
      toast.success(`Payment released to ${contractorName}!`);
      return;
    }

    setSubmittingRating(true);
    try {
      // Rating was already submitted with approval if approve-job was called with rating
      // But if user rates after, we insert directly
      const { data: { user } } = await supabase.auth.getUser();
      if (user && booking.contractor_id) {
        await supabase.from("reviews").insert({
          user_id: user.id,
          contractor_id: booking.contractor_id,
          booking_id: bookingId!,
          rating,
          comment: ratingComment || null,
        });
      }
    } catch {
      // non-blocking
    } finally {
      setSubmittingRating(false);
      setRatingDialogOpen(false);
      toast.success(`Thank you! Payment has been released to ${contractorName}.`);
    }
  };

  const handleDisputePhotoSelect = (files: FileList | null) => {
    if (!files) return;
    const items = Array.from(files).map(file => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setDisputePhotos(prev => [...prev, ...items]);
  };

  const removeDisputePhoto = (idx: number) => {
    setDisputePhotos(prev => {
      URL.revokeObjectURL(prev[idx].previewUrl);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleSubmitDispute = async () => {
    if (disputeDescription.length < 20) {
      toast.error("Please provide a more detailed description (minimum 20 characters)");
      return;
    }

    setSubmittingDispute(true);
    try {
      // Upload dispute photos
      const photoUrls: string[] = [];
      for (const photo of disputePhotos) {
        const timestamp = Date.now();
        const filePath = `${bookingId}/dispute-${timestamp}-${Math.random().toString(36).slice(2, 8)}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("dispute-photos")
          .upload(filePath, photo.file, { contentType: photo.file.type });
        if (!uploadError) photoUrls.push(filePath);
      }

      const { data, error } = await supabase.functions.invoke("dispute-job", {
        body: { bookingId, description: disputeDescription, photoUrls },
      });

      if (error || data?.error) throw new Error(data?.error || "Failed to submit dispute");

      setDisputeDialogOpen(false);
      setDisputed(true);
      toast.success("Your dispute has been submitted. We'll review the issue and get back to you within 24-72 hours.");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit dispute");
    } finally {
      setSubmittingDispute(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Booking not found</p>
      </div>
    );
  }

  const completedDate = booking.completed_at
    ? new Date(booking.completed_at).toLocaleDateString("en-AU", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
      })
    : "";
  const completedTime = booking.completed_at
    ? new Date(booking.completed_at).toLocaleTimeString("en-AU", {
        hour: "2-digit", minute: "2-digit",
      })
    : "";

  const isVerifiable = booking.status === "completed_pending_verification";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center">
              <Leaf className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-display font-bold text-foreground">Review Job</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        {/* Success/Disputed states */}
        {approved && (
          <Card className="border-green-500/30 bg-green-50 dark:bg-green-950/20">
            <CardContent className="pt-6 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              <p className="font-medium text-green-800 dark:text-green-200">
                Payment has been released to {contractorName}. Thank you!
              </p>
            </CardContent>
          </Card>
        )}

        {disputed && (
          <Card className="border-yellow-500/30 bg-yellow-50 dark:bg-yellow-950/20">
            <CardContent className="pt-6 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
              <p className="font-medium text-yellow-800 dark:text-yellow-200">
                Your dispute has been submitted. We'll review the issue and get back to you within 24-72 hours.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Completion Info */}
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Job #{bookingId?.slice(0, 8)}</h2>
              <Badge variant={isVerifiable ? "secondary" : "outline"}>
                {isVerifiable ? "Awaiting Review" : booking.status === "disputed" ? "Disputed" : "Completed"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Completed by <span className="font-medium text-foreground">{contractorName}</span> on{" "}
              {completedDate} at {completedTime}
            </p>
            <p className="text-lg font-semibold text-primary">
              ${Number(booking.total_price).toFixed(2)}
            </p>
          </CardContent>
        </Card>

        {/* Countdown Timer */}
        {isVerifiable && hoursRemaining !== null && !approved && !disputed && (
          <Card className="border-primary/20">
            <CardContent className="pt-6 flex items-start gap-3">
              <Clock className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <p className="text-sm">
                You have <span className="font-bold text-primary">{hoursRemaining} hours</span> to
                review this job before payment is automatically released to the contractor.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Before/After Photos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Before & After Photos</CardTitle>
          </CardHeader>
          <CardContent>
            <JobPhotosGallery bookingId={bookingId!} />
          </CardContent>
        </Card>

        {/* Action Buttons */}
        {isVerifiable && !approved && !disputed && (
          <div className="space-y-3">
            <Button
              size="lg"
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              onClick={() => setApproveDialogOpen(true)}
            >
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Approve & Release Payment
            </Button>
            <Button
              variant="outline"
              className="w-full border-yellow-500 text-yellow-700 hover:bg-yellow-50 dark:text-yellow-400 dark:hover:bg-yellow-950/30"
              onClick={() => setDisputeDialogOpen(true)}
            >
              <AlertTriangle className="w-5 h-5 mr-2" />
              Report an Issue
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={() => navigate("/dashboard")}
            >
              I'll Review Later
            </Button>
          </div>
        )}
      </main>

      {/* Approve Confirmation Dialog */}
      <AlertDialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve & Release Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you satisfied with the work? This will release{" "}
              <span className="font-semibold text-foreground">${Number(booking.total_price).toFixed(2)}</span> to{" "}
              {contractorName}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={approving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprove}
              disabled={approving}
              className="bg-green-600 hover:bg-green-700"
            >
              {approving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Yes, Release Payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rating Dialog */}
      <Dialog open={ratingDialogOpen} onOpenChange={setRatingDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>How would you rate this service?</DialogTitle>
            <DialogDescription>Your feedback helps improve our service quality.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-10 h-10 ${
                      star <= (hoverRating || rating)
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-muted-foreground/30"
                    } transition-colors`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <Textarea
                placeholder="Any comments? (optional)"
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                rows={3}
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setRatingDialogOpen(false); toast.success(`Payment has been released to ${contractorName}!`); }}>
              Skip
            </Button>
            <Button onClick={handleSubmitRating} disabled={submittingRating || rating === 0}>
              {submittingRating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Submit Rating
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dispute Dialog */}
      <Dialog open={disputeDialogOpen} onOpenChange={setDisputeDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Report an Issue</DialogTitle>
            <DialogDescription>
              Tell us what's wrong with the work. Our team will review and respond within 24-72 hours.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">What's wrong? *</label>
              <Textarea
                placeholder="Please describe the issue in detail (minimum 20 characters)..."
                value={disputeDescription}
                onChange={(e) => setDisputeDescription(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {disputeDescription.length}/20 characters minimum
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Upload photos (optional)</label>
              <div className="grid grid-cols-4 gap-2">
                {disputePhotos.map((photo, idx) => (
                  <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border">
                    <img src={photo.previewUrl} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeDisputePhoto(idx)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-background/80 hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => disputeInputRef.current?.click()}
                  className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-1 hover:border-primary/50 transition-colors"
                >
                  <Camera className="w-5 h-5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Add</span>
                </button>
              </div>
              <input
                ref={disputeInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleDisputePhotoSelect(e.target.files)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDisputeDialogOpen(false)} disabled={submittingDispute}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitDispute}
              disabled={submittingDispute || disputeDescription.length < 20}
              variant="destructive"
            >
              {submittingDispute ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Submit Dispute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerVerifyJob;
