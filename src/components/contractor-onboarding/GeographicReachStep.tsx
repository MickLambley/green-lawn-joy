import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ArrowRight, ArrowLeft, MapPin } from "lucide-react";
import type { GeographicData } from "@/pages/ContractorOnboarding";

interface GeographicReachStepProps {
  data: GeographicData;
  onChange: (data: GeographicData) => void;
  onNext: () => void;
  onBack: () => void;
}

export const GeographicReachStep = ({ data, onChange, onNext, onBack }: GeographicReachStepProps) => {
  const isValid = data.maxTravelDistanceKm >= 5;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle>Geographic Reach</CardTitle>
            <CardDescription>
              Set your maximum travel distance for jobs
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Max Travel Distance */}
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>What is the maximum distance (in kilometres) you are willing to travel from your base location for a job?</Label>
            <p className="text-sm text-muted-foreground">
              Jobs within this radius from your home or business address will be shown to you.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">5 km</span>
              <span className="text-2xl font-bold text-primary">{data.maxTravelDistanceKm} km</span>
              <span className="text-sm text-muted-foreground">100 km</span>
            </div>
            
            <Slider
              value={[data.maxTravelDistanceKm]}
              onValueChange={([value]) => onChange({ ...data, maxTravelDistanceKm: value })}
              min={5}
              max={100}
              step={5}
              className="w-full"
            />
          </div>

          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Tip:</strong> A larger radius means more job opportunities, but consider fuel costs and travel time when setting your maximum distance.
            </p>
          </div>
        </div>

        {/* Quick Select Buttons */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Quick select:</Label>
          <div className="flex flex-wrap gap-2">
            {[10, 15, 25, 50, 75].map((distance) => (
              <Button
                key={distance}
                variant={data.maxTravelDistanceKm === distance ? "default" : "outline"}
                size="sm"
                onClick={() => onChange({ ...data, maxTravelDistanceKm: distance })}
              >
                {distance} km
              </Button>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onBack} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <Button onClick={onNext} disabled={!isValid} className="gap-2">
            Continue
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
