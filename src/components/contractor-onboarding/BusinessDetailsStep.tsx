import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowRight, Building, Upload, FileCheck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { BusinessData } from "@/pages/ContractorOnboarding";

interface BusinessDetailsStepProps {
  data: BusinessData;
  onChange: (data: BusinessData) => void;
  userId: string;
  onNext: () => void;
  onBack: () => void;
}

export const BusinessDetailsStep = ({ data, onChange, userId, onNext }: BusinessDetailsStepProps) => {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload a PDF or image file");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/insurance-certificate.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("contractor-documents")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Store the file path, not a public URL
      // Signed URLs will be generated on-demand when viewing the document
      onChange({ ...data, insuranceCertificateUrl: fileName });
      toast.success("Certificate uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload certificate");
    } finally {
      setIsUploading(false);
    }
  };

  const validateABN = (abn: string) => {
    // Remove spaces and check format
    const cleanABN = abn.replace(/\s/g, "");
    return /^\d{11}$/.test(cleanABN);
  };

  const formatABN = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
    if (digits.length <= 8) return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
    return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  };

  const isValid = 
    data.businessName.trim().length >= 2 &&
    validateABN(data.abn) &&
    data.businessAddress.trim().length >= 5 &&
    data.phone.trim().length >= 8;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Building className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle>Business Details</CardTitle>
            <CardDescription>
              Provide your business information and documentation
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Business Name */}
        <div className="space-y-2">
          <Label htmlFor="businessName">Business Name *</Label>
          <Input
            id="businessName"
            placeholder="e.g., John's Lawn Care Services"
            value={data.businessName}
            onChange={(e) => onChange({ ...data, businessName: e.target.value })}
          />
        </div>

        {/* ABN */}
        <div className="space-y-2">
          <Label htmlFor="abn">Australian Business Number (ABN) *</Label>
          <Input
            id="abn"
            placeholder="XX XXX XXX XXX"
            value={data.abn}
            onChange={(e) => onChange({ ...data, abn: formatABN(e.target.value) })}
          />
          <p className="text-xs text-muted-foreground">
            Your 11-digit ABN is required to work as a contractor
          </p>
        </div>

        {/* Business Address */}
        <div className="space-y-2">
          <Label htmlFor="businessAddress">Business Address *</Label>
          <Input
            id="businessAddress"
            placeholder="Street address, suburb, state, postcode"
            value={data.businessAddress}
            onChange={(e) => onChange({ ...data, businessAddress: e.target.value })}
          />
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="phone">Contact Phone *</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="04XX XXX XXX"
            value={data.phone}
            onChange={(e) => onChange({ ...data, phone: e.target.value })}
          />
        </div>

        {/* Insurance Certificate */}
        <div className="space-y-3">
          <Label>Public Liability Insurance Certificate (Optional)</Label>
          <p className="text-sm text-muted-foreground">
            Upload your certificate of currency. This can be added later if you don't have it now.
          </p>
          
          {data.insuranceCertificateUrl ? (
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <FileCheck className="w-5 h-5 text-green-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  Certificate uploaded
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onChange({ ...data, insuranceCertificateUrl: null })}
              >
                Remove
              </Button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-3">
                PDF, JPG, or PNG up to 10MB
              </p>
              <Button variant="outline" disabled={isUploading} asChild>
                <label className="cursor-pointer">
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    "Choose File"
                  )}
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                </label>
              </Button>
            </div>
          )}
        </div>

        {/* Next Button */}
        <div className="flex justify-end pt-4">
          <Button onClick={onNext} disabled={!isValid} className="gap-2">
            Continue
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
