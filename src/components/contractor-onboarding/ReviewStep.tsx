import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, ClipboardList, Building, MapPin, Loader2, FileCheck } from "lucide-react";
import type { QuestionnaireData, BusinessData, ServiceAreaData } from "@/pages/ContractorOnboarding";

interface ReviewStepProps {
  questionnaireData: QuestionnaireData;
  businessData: BusinessData;
  serviceAreaData: ServiceAreaData;
  onSubmit: () => void;
  onBack: () => void;
  isLoading: boolean;
}

const experienceLabels: Record<string, string> = {
  none: "No experience (willing to learn)",
  "1-2": "1-2 years",
  "3-5": "3-5 years",
  "5+": "5+ years",
};

const transportLabels: Record<string, string> = {
  ute: "Ute / Pickup",
  van: "Van",
  trailer: "Car with Trailer",
  truck: "Truck",
};

const equipmentLabels: Record<string, string> = {
  mower: "Lawn Mower",
  whipper_snipper: "Whipper Snipper",
  edger: "Edger",
  blower: "Leaf Blower",
  hedge_trimmer: "Hedge Trimmer",
  chainsaw: "Chainsaw",
};

const availabilityLabels: Record<string, string> = {
  weekday_morning: "Weekday Mornings",
  weekday_afternoon: "Weekday Afternoons",
  saturday: "Saturdays",
  sunday: "Sundays",
};

export const ReviewStep = ({
  questionnaireData,
  businessData,
  serviceAreaData,
  onSubmit,
  onBack,
  isLoading,
}: ReviewStepProps) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <CheckCircle2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>Review Your Application</CardTitle>
              <CardDescription>
                Please review your information before submitting
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Experience & Equipment */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-medium">Experience & Equipment</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Experience</p>
                <p className="font-medium">{experienceLabels[questionnaireData.yearsExperience]}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Transport</p>
                <p className="font-medium">
                  {questionnaireData.hasOwnTransport === "yes" 
                    ? transportLabels[questionnaireData.transportType] || "Has transport"
                    : "No transport"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Equipment</p>
                <p className="font-medium">
                  {questionnaireData.hasOwnEquipment === "yes" 
                    ? "Has own equipment"
                    : questionnaireData.hasOwnEquipment === "partial"
                    ? "Has some equipment"
                    : "Needs equipment"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Availability</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {questionnaireData.availability.map((a) => (
                    <Badge key={a} variant="outline" className="text-xs">
                      {availabilityLabels[a]}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {questionnaireData.equipmentTypes.length > 0 && (
              <div>
                <p className="text-muted-foreground text-sm mb-1">Equipment Owned</p>
                <div className="flex flex-wrap gap-1">
                  {questionnaireData.equipmentTypes.map((e) => (
                    <Badge key={e} variant="secondary" className="text-xs">
                      {equipmentLabels[e]}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Business Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-medium">Business Details</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Business Name</p>
                <p className="font-medium">{businessData.businessName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">ABN</p>
                <p className="font-medium">{businessData.abn}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground">Address</p>
                <p className="font-medium">{businessData.businessAddress}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Phone</p>
                <p className="font-medium">{businessData.phone}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Insurance Certificate</p>
                <p className="font-medium flex items-center gap-1">
                  {businessData.insuranceCertificateUrl ? (
                    <>
                      <FileCheck className="w-4 h-4 text-green-600" />
                      Uploaded
                    </>
                  ) : (
                    "Not uploaded"
                  )}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Service Areas */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-medium">Service Areas</h3>
            </div>
            
            <div className="text-sm">
              <p className="text-muted-foreground mb-2">
                Service radius: {serviceAreaData.radiusKm} km
              </p>
              <div className="flex flex-wrap gap-1">
                {serviceAreaData.selectedSuburbs.map((suburb) => (
                  <Badge key={suburb} variant="secondary" className="text-xs">
                    {suburb}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Important Notice */}
      <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
        <CardContent className="pt-6">
          <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-2">
            What happens next?
          </h4>
          <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
            <li>• Your application will be reviewed by our team</li>
            <li>• We'll verify your ABN and business details</li>
            <li>• Once approved, you'll be able to accept jobs</li>
            <li>• This process typically takes 1-2 business days</li>
          </ul>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Back to Edit
        </Button>
        <Button onClick={onSubmit} disabled={isLoading} className="gap-2">
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Submit Application
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
