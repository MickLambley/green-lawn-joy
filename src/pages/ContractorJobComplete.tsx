import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Leaf,
  Camera,
  X,
  Check,
  Loader2,
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  ImageIcon,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

interface PhotoItem {
  id?: string;
  fileName: string;
  fileSize: number;
  photoUrl?: string;
  thumbnailUrl?: string;
  uploading?: boolean;
  uploaded?: boolean;
}

const ContractorJobComplete = () => {
  const { id: bookingId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<any>(null);
  const [address, setAddress] = useState<any>(null);
  const [contractor, setContractor] = useState<any>(null);
  const [contractorTier, setContractorTier] = useState<string>("standard");

  const [beforePhotos, setBeforePhotos] = useState<PhotoItem[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<PhotoItem[]>([]);

  const [checkPhotosCorrect, setCheckPhotosCorrect] = useState(false);
  const [checkQuality, setCheckQuality] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [uploadProgress, setUploadProgress] = useState<{
    active: boolean;
    type: "before" | "after";
    current: number;
    total: number;
  } | null>(null);

  const beforeCameraRef = useRef<HTMLInputElement>(null);
  const beforeGalleryRef = useRef<HTMLInputElement>(null);
  const afterCameraRef = useRef<HTMLInputElement>(null);
  const afterGalleryRef = useRef<HTMLInputElement>(null);

  const minPhotos = contractorTier === "probation" ? 2 : 1;

  useEffect(() => {
    fetchBookingData();
  }, [bookingId]);

  const fetchBookingData = async () => {
    if (!bookingId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/contractor-auth");
      return;
    }

    // Get contractor profile
    const { data: contractorData } = await supabase
      .from("contractors")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!contractorData) {
      toast.error("Contractor profile not found");
      navigate("/contractor");
      return;
    }

    setContractor(contractorData);

    // Determine tier from questionnaire_responses or default
    const responses = contractorData.questionnaire_responses as Record<string, any> | null;
    const tier = responses?.contractor_tier || "standard";
    setContractorTier(tier);

    // Get booking
    const { data: bookingData, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .eq("contractor_id", contractorData.id)
      .single();

    if (bookingError || !bookingData) {
      toast.error("Booking not found or you don't have access");
      navigate("/contractor");
      return;
    }

    setBooking(bookingData);

    // Get address
    const { data: addressData } = await supabase
      .from("addresses")
      .select("*")
      .eq("id", bookingData.address_id)
      .single();

    setAddress(addressData);

    // Load existing photos
    const { data: existingPhotos } = await supabase
      .from("job_photos")
      .select("*")
      .eq("booking_id", bookingId)
      .eq("contractor_id", contractorData.id);

    if (existingPhotos) {
      const befores: PhotoItem[] = [];
      const afters: PhotoItem[] = [];

      for (const photo of existingPhotos) {
        const fileName = photo.photo_url.split("/").pop() || "photo.jpg";
        const { data: signedData } = await supabase.storage.from("job-photos").createSignedUrl(photo.photo_url, 3600);
        const item: PhotoItem = {
          id: photo.id,
          fileName,
          fileSize: 0,
          photoUrl: photo.photo_url,
          thumbnailUrl: signedData?.signedUrl || undefined,
          uploaded: true,
        };

        if (photo.photo_type === "before") befores.push(item);
        else afters.push(item);
      }

      setBeforePhotos(befores);
      setAfterPhotos(afters);
    }

    setLoading(false);
  };

  const compressImage = async (file: File, maxWidth = 600, quality = 0.6): Promise<Blob> => {
    // Use createImageBitmap with resize - this is the ONLY safe path on mobile
    // It tells the browser to downsample during decode, avoiding full-res in memory
    const bitmap = await createImageBitmap(file, {
      resizeWidth: Math.min(maxWidth, 600),
      resizeQuality: "low",
    });

    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      throw new Error("Canvas not supported");
    }
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          canvas.width = 0;
          canvas.height = 0;
          blob ? resolve(blob) : reject(new Error("Compression failed"));
        },
        "image/jpeg",
        quality
      );
    });
  };

  const handleFileSelect = async (
    files: FileList | null,
    type: "before" | "after"
  ) => {
    if (!files || !bookingId || !contractor || files.length === 0) return;

    const setPhotos = type === "before" ? setBeforePhotos : setAfterPhotos;
    const fileArray = Array.from(files);
    const total = fileArray.length;

    setUploadProgress({ active: true, type, current: 0, total });

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      setUploadProgress({ active: true, type, current: i + 1, total });

      // Compress image
      let compressed: Blob;
      try {
        compressed = await compressImage(file);
      } catch {
        toast.error(`Failed to process photo ${i + 1} of ${total}. Skipping.`);
        continue;
      }

      const item: PhotoItem = {
        fileName: file.name,
        fileSize: compressed.size,
        uploading: true,
      };

      setPhotos((prev) => [...prev, item]);

      const timestamp = Date.now();
      const filePath = `${bookingId}/${type}-${timestamp}-${Math.random().toString(36).slice(2, 8)}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("job-photos")
        .upload(filePath, compressed, { contentType: "image/jpeg" });

      if (uploadError) {
        toast.error(`Photo ${i + 1} of ${total} failed: ${uploadError.message}`);
        setPhotos((prev) => prev.filter((p) => p !== item));
        continue;
      }

      const { error: dbError } = await supabase.from("job_photos").insert({
        booking_id: bookingId,
        contractor_id: contractor.id,
        photo_type: type,
        photo_url: filePath,
      });

      if (dbError) {
        toast.error(`Photo ${i + 1} record failed: ${dbError.message}`);
        continue;
      }

      const { data: urlData } = supabase.storage.from("job-photos").getPublicUrl(filePath);

      setPhotos((prev) =>
        prev.map((p) =>
          p === item
            ? { ...p, uploading: false, uploaded: true, photoUrl: filePath, thumbnailUrl: urlData.publicUrl }
            : p
        )
      );
    }

    // Clear file inputs to release file references from memory
    [beforeCameraRef, beforeGalleryRef, afterCameraRef, afterGalleryRef].forEach(ref => {
      if (ref.current) ref.current.value = "";
    });

    setUploadProgress(null);
  };

  const handleRemovePhoto = async (
    photo: PhotoItem,
    type: "before" | "after"
  ) => {
    const setPhotos = type === "before" ? setBeforePhotos : setAfterPhotos;

    if (photo.photoUrl) {
      await supabase.storage.from("job-photos").remove([photo.photoUrl]);
      if (photo.id) {
        await supabase.from("job_photos").delete().eq("id", photo.id);
      }
    }

    setPhotos((prev) => prev.filter((p) => p !== photo));
  };

  const handleMarkComplete = async () => {
    if (!bookingId || !contractor) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("complete-job", {
        body: { bookingId },
      });

      if (error || data?.error) {
        toast.error(data?.error || "Failed to complete job");
        return;
      }

      toast.success("Job marked as complete! The customer will be notified.");
      navigate("/contractor");
    } catch (err) {
      toast.error("An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const beforeCount = beforePhotos.filter((p) => p.uploaded).length;
  const afterCount = afterPhotos.filter((p) => p.uploaded).length;
  const photosReady = beforeCount >= minPhotos && afterCount >= minPhotos;
  const canSubmit = photosReady && checkPhotosCorrect && checkQuality && !submitting;

  const timeSlots: Record<string, string> = {
    "7am-10am": "7:00 AM - 10:00 AM",
    "10am-2pm": "10:00 AM - 2:00 PM",
    "2pm-5pm": "2:00 PM - 5:00 PM",
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/contractor")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center">
              <Leaf className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <span className="text-xl font-display font-bold text-foreground">Complete Job</span>
              <Badge variant="outline" className="ml-2">Contractor</Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        {/* Job Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Job Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 mt-1 text-muted-foreground" />
              <div>
                <p className="font-medium">{address?.street_address}</p>
                <p className="text-sm text-muted-foreground">
                  {address?.city}, {address?.state} {address?.postal_code}
                </p>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">
                  {new Date(booking.scheduled_date).toLocaleDateString("en-AU", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{timeSlots[booking.time_slot] || booking.time_slot}</span>
              </div>
            </div>
            <div className="pt-2 border-t">
              <span className="font-semibold text-lg text-primary">
                ${Number(booking.total_price).toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Before Photos */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Before Photos
              </CardTitle>
              <Badge variant={beforeCount >= minPhotos ? "default" : "secondary"}>
                {beforeCount >= minPhotos ? (
                  <Check className="w-3 h-3 mr-1" />
                ) : null}
                {beforeCount}/{minPhotos}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Take photos of the lawn <strong>before</strong> you start mowing.
            </p>

            {/* Photo thumbnails */}
            <div className="grid grid-cols-3 gap-2">
              {beforePhotos.map((photo, idx) => (
                <div key={idx} className="relative aspect-square rounded-lg border bg-muted/30 overflow-hidden">
                  {photo.uploading ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : photo.thumbnailUrl ? (
                    <img
                      src={photo.thumbnailUrl}
                      alt={photo.fileName}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  {photo.uploaded && (
                    <CheckCircle2 className="absolute top-1 left-1 w-4 h-4 text-primary drop-shadow" />
                  )}
                  <button
                    onClick={() => handleRemovePhoto(photo, "before")}
                    className="absolute top-1 right-1 p-0.5 rounded-full bg-background/80 hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => beforeCameraRef.current?.click()}
              >
                <Camera className="w-4 h-4 mr-2" />
                Take Photo
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => beforeGalleryRef.current?.click()}
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                Gallery
              </Button>
            </div>

            {uploadProgress?.active && uploadProgress.type === "before" && (
              <div className="space-y-2 p-3 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span>Uploading photo {uploadProgress.current} of {uploadProgress.total}...</span>
                </div>
                <Progress value={(uploadProgress.current / uploadProgress.total) * 100} className="h-2" />
              </div>
            )}

            <input
              ref={beforeCameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files, "before")}
            />
            <input
              ref={beforeGalleryRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files, "before")}
            />
          </CardContent>
        </Card>

        {/* After Photos */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                After Photos
              </CardTitle>
              <Badge variant={afterCount >= minPhotos ? "default" : "secondary"}>
                {afterCount >= minPhotos ? (
                  <Check className="w-3 h-3 mr-1" />
                ) : null}
                {afterCount}/{minPhotos}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Take photos of the lawn <strong>after</strong> mowing is complete.
            </p>

            <div className="grid grid-cols-3 gap-2">
              {afterPhotos.map((photo, idx) => (
                <div key={idx} className="relative aspect-square rounded-lg border bg-muted/30 overflow-hidden">
                  {photo.uploading ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : photo.thumbnailUrl ? (
                    <img
                      src={photo.thumbnailUrl}
                      alt={photo.fileName}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  {photo.uploaded && (
                    <CheckCircle2 className="absolute top-1 left-1 w-4 h-4 text-primary drop-shadow" />
                  )}
                  <button
                    onClick={() => handleRemovePhoto(photo, "after")}
                    className="absolute top-1 right-1 p-0.5 rounded-full bg-background/80 hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => afterCameraRef.current?.click()}
              >
                <Camera className="w-4 h-4 mr-2" />
                Take Photo
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => afterGalleryRef.current?.click()}
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                Gallery
              </Button>
            </div>

            {uploadProgress?.active && uploadProgress.type === "after" && (
              <div className="space-y-2 p-3 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span>Uploading photo {uploadProgress.current} of {uploadProgress.total}...</span>
                </div>
                <Progress value={(uploadProgress.current / uploadProgress.total) * 100} className="h-2" />
              </div>
            )}

            <input
              ref={afterCameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files, "after")}
            />
            <input
              ref={afterGalleryRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files, "after")}
            />
          </CardContent>
        </Card>

        {/* Quality Checklist */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Quality Checklist
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="photos-correct"
                checked={checkPhotosCorrect}
                onCheckedChange={(v) => setCheckPhotosCorrect(v === true)}
              />
              <label htmlFor="photos-correct" className="text-sm leading-relaxed cursor-pointer">
                The photos I have uploaded are from today and from the correct property
              </label>
            </div>
            <div className="flex items-start gap-3">
              <Checkbox
                id="quality"
                checked={checkQuality}
                onCheckedChange={(v) => setCheckQuality(v === true)}
              />
              <label htmlFor="quality" className="text-sm leading-relaxed cursor-pointer">
                The photos accurately represent the quality of my work
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Validation messages */}
        {!photosReady && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              You need at least {minPhotos} before {minPhotos === 1 ? "photo" : "photos"} and {minPhotos} after {minPhotos === 1 ? "photo" : "photos"} to complete this job.
              {contractorTier === "probation" && " (Probation contractors require 2 of each.)"}
            </span>
          </div>
        )}

        {/* Submit */}
        <Button
          className="w-full"
          size="lg"
          disabled={!canSubmit}
          onClick={handleMarkComplete}
        >
          {submitting ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <Check className="w-5 h-5 mr-2" />
          )}
          {submitting ? "Completing Job..." : "Mark Job Complete"}
        </Button>
      </main>
    </div>
  );
};

export default ContractorJobComplete;
