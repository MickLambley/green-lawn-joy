import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowRight, User, Upload, FileCheck, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { IdentityBusinessData } from "@/pages/ContractorOnboarding";

interface IdentityBusinessStepProps {
  data: IdentityBusinessData;
  onChange: (data: IdentityBusinessData) => void;
  userId: string;
  onNext: () => void;
}

export const IdentityBusinessStep = ({ data, onChange, userId, onNext }: IdentityBusinessStepProps) => {
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
      onChange({ ...data, insuranceCertificatePath: fileName });
      toast.success("Certificate uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload certificate");
    } finally {
      setIsUploading(false);
    }
  };

  const validateABN = (abn: string) => {
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

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    if (digits.length <= 4) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  };

  const isValid = 
    data.fullName.trim().length >= 2 &&
    data.mobileNumber.replace(/\s/g, "").length >= 10 &&
    validateABN(data.abn) &&
    data.confirmIndependentBusiness &&
    data.insuranceCertificatePath !== null &&
    data.confirmInsuranceCoverage;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle>Identity & Business Details</CardTitle>
            <CardDescription>
              Required information to sign up as a contractor
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Full Name */}
        <div className="space-y-2">
          <Label htmlFor="fullName">What is your full name? *</Label>
          <Input
            id="fullName"
            placeholder="John Smith"
            value={data.fullName}
            onChange={(e) => onChange({ ...data, fullName: e.target.value })}
          />
        </div>

        {/* Mobile Number */}
        <div className="space-y-2">
          <Label htmlFor="mobileNumber">What is your mobile number? *</Label>
          <Input
            id="mobileNumber"
            type="tel"
            placeholder="0400 000 000"
            value={data.mobileNumber}
            onChange={(e) => onChange({ ...data, mobileNumber: formatPhoneNumber(e.target.value) })}
          />
        </div>

        {/* ABN */}
        <div className="space-y-2">
          <Label htmlFor="abn">What is your ABN? *</Label>
          <Input
            id="abn"
            placeholder="XX XXX XXX XXX"
            value={data.abn}
            onChange={(e) => onChange({ ...data, abn: formatABN(e.target.value) })}
          />
          <p className="text-xs text-muted-foreground">
            Your 11-digit Australian Business Number
          </p>
        </div>

        {/* Independent Business Confirmation */}
        <div className="flex items-start space-x-3 p-4 bg-muted/50 rounded-lg">
          <Checkbox
            id="confirmIndependent"
            checked={data.confirmIndependentBusiness}
            onCheckedChange={(checked) => 
              onChange({ ...data, confirmIndependentBusiness: checked === true })
            }
          />
          <label
            htmlFor="confirmIndependent"
            className="text-sm leading-relaxed cursor-pointer"
          >
            I confirm I operate an independent lawn care business, use my own equipment, and am responsible for how I complete my work.
          </label>
        </div>

        {/* Insurance Certificate Upload */}
        <div className="space-y-3">
          <Label>Upload your Certificate of Currency for Public Liability Insurance *</Label>
          <Alert className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              Minimum $5 million cover required
            </AlertDescription>
          </Alert>
          
          {data.insuranceCertificatePath ? (
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
                onClick={() => onChange({ ...data, insuranceCertificatePath: null, confirmInsuranceCoverage: false })}
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

        {/* Insurance Coverage Confirmation */}
        {data.insuranceCertificatePath && (
          <div className="flex items-start space-x-3 p-4 bg-muted/50 rounded-lg">
            <Checkbox
              id="confirmInsurance"
              checked={data.confirmInsuranceCoverage}
              onCheckedChange={(checked) => 
                onChange({ ...data, confirmInsuranceCoverage: checked === true })
              }
            />
            <label
              htmlFor="confirmInsurance"
              className="text-sm leading-relaxed cursor-pointer"
            >
              I confirm this insurance policy covers lawn care / gardening services.
            </label>
          </div>
        )}

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
