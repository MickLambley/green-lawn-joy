import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, MapPin, Plus, X, Loader2 } from "lucide-react";
import type { ServiceAreaData } from "@/pages/ContractorOnboarding";

interface ServiceAreaStepProps {
  data: ServiceAreaData;
  onChange: (data: ServiceAreaData) => void;
  onNext: () => void;
  onBack: () => void;
}

interface SuburbResult {
  name: string;
  postcode: string;
  state: string;
}

export const ServiceAreaStep = ({ data, onChange, onNext }: ServiceAreaStepProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [calculatedSuburbs, setCalculatedSuburbs] = useState<SuburbResult[]>([]);
  const [manualSuburb, setManualSuburb] = useState("");
  const [suburbSuggestions, setSuburbSuggestions] = useState<SuburbResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const loadGoogleMaps = useCallback(async () => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error("Google Maps API key not found");
      return;
    }

    if (window.google?.maps) {
      initMap();
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&v=weekly`;
    script.async = true;
    script.onload = () => initMap();
    document.head.appendChild(script);
  }, []);

  const initMap = async () => {
    if (!mapRef.current || !window.google) return;

    const { Map } = await google.maps.importLibrary("maps") as google.maps.MapsLibrary;
    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker") as google.maps.MarkerLibrary;

    const map = new Map(mapRef.current, {
      center: { lat: data.centerLat, lng: data.centerLng },
      zoom: 10,
      mapId: "service-area-map",
      disableDefaultUI: false,
      zoomControl: true,
      streetViewControl: false,
      mapTypeControl: false,
    });

    mapInstanceRef.current = map;

    // Create draggable marker
    const marker = new AdvancedMarkerElement({
      map,
      position: { lat: data.centerLat, lng: data.centerLng },
      gmpDraggable: true,
      title: "Drag to set your service center",
    });

    markerRef.current = marker;

    // Create radius circle
    const circle = new google.maps.Circle({
      map,
      center: { lat: data.centerLat, lng: data.centerLng },
      radius: data.radiusKm * 1000,
      fillColor: "#22c55e",
      fillOpacity: 0.15,
      strokeColor: "#22c55e",
      strokeWeight: 2,
    });

    circleRef.current = circle;

    // Handle marker drag
    marker.addListener("dragend", () => {
      const pos = marker.position;
      if (pos) {
        const newLat = typeof pos.lat === "function" ? pos.lat() : pos.lat;
        const newLng = typeof pos.lng === "function" ? pos.lng() : pos.lng;
        circle.setCenter({ lat: newLat, lng: newLng });
        onChange({ ...data, centerLat: newLat, centerLng: newLng });
        fetchSuburbsInRadius(newLat, newLng, data.radiusKm);
      }
    });

    setIsMapLoaded(true);
    fetchSuburbsInRadius(data.centerLat, data.centerLng, data.radiusKm);
  };

  const fetchSuburbsInRadius = async (lat: number, lng: number, radiusKm: number) => {
    // Use reverse geocoding to get nearby suburbs
    if (!window.google) return;

    setIsSearching(true);
    const suburbs: SuburbResult[] = [];
    const geocoder = new google.maps.Geocoder();

    // Sample points within the radius
    const points = generateSamplePoints(lat, lng, radiusKm, 12);
    
    for (const point of points) {
      try {
        const result = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
          geocoder.geocode({ location: point }, (results, status) => {
            if (status === "OK" && results) resolve(results);
            else reject(status);
          });
        });

        for (const res of result) {
          const suburb = extractSuburbFromResult(res);
          if (suburb && !suburbs.find(s => s.name === suburb.name && s.postcode === suburb.postcode)) {
            suburbs.push(suburb);
          }
        }
      } catch {
        // Continue with other points
      }
    }

    setCalculatedSuburbs(suburbs.sort((a, b) => a.name.localeCompare(b.name)));
    setIsSearching(false);
  };

  const generateSamplePoints = (lat: number, lng: number, radiusKm: number, count: number) => {
    const points: { lat: number; lng: number }[] = [{ lat, lng }];
    const earthRadius = 6371; // km

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * 2 * Math.PI;
      const distance = radiusKm * 0.7; // Sample at 70% of radius
      
      const newLat = lat + (distance / earthRadius) * (180 / Math.PI) * Math.cos(angle);
      const newLng = lng + (distance / earthRadius) * (180 / Math.PI) / Math.cos(lat * Math.PI / 180) * Math.sin(angle);
      
      points.push({ lat: newLat, lng: newLng });
    }

    return points;
  };

  const extractSuburbFromResult = (result: google.maps.GeocoderResult): SuburbResult | null => {
    let suburb = "";
    let postcode = "";
    let state = "";

    for (const component of result.address_components) {
      if (component.types.includes("locality")) {
        suburb = component.long_name;
      }
      if (component.types.includes("postal_code")) {
        postcode = component.long_name;
      }
      if (component.types.includes("administrative_area_level_1")) {
        state = component.short_name;
      }
    }

    if (suburb && postcode) {
      return { name: suburb, postcode, state };
    }
    return null;
  };

  const handleRadiusChange = (value: number[]) => {
    const newRadius = value[0];
    onChange({ ...data, radiusKm: newRadius });
    
    if (circleRef.current) {
      circleRef.current.setRadius(newRadius * 1000);
    }
    
    if (mapInstanceRef.current && circleRef.current) {
      const bounds = circleRef.current.getBounds();
      if (bounds) mapInstanceRef.current.fitBounds(bounds);
    }

    fetchSuburbsInRadius(data.centerLat, data.centerLng, newRadius);
  };

  const handleSuburbToggle = (suburb: SuburbResult, checked: boolean) => {
    const suburbKey = `${suburb.name}, ${suburb.postcode}`;
    if (checked) {
      onChange({ ...data, selectedSuburbs: [...data.selectedSuburbs, suburbKey] });
    } else {
      onChange({ ...data, selectedSuburbs: data.selectedSuburbs.filter(s => s !== suburbKey) });
    }
  };

  const handleManualSuburbSearch = async (query: string) => {
    setManualSuburb(query);
    if (query.length < 3 || !window.google) {
      setSuburbSuggestions([]);
      return;
    }

    const geocoder = new google.maps.Geocoder();
    try {
      const results = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
        geocoder.geocode({ address: `${query}, Australia` }, (results, status) => {
          if (status === "OK" && results) resolve(results);
          else reject(status);
        });
      });

      const suggestions: SuburbResult[] = [];
      for (const res of results.slice(0, 5)) {
        const suburb = extractSuburbFromResult(res);
        if (suburb) suggestions.push(suburb);
      }
      setSuburbSuggestions(suggestions);
    } catch {
      setSuburbSuggestions([]);
    }
  };

  const addManualSuburb = (suburb: SuburbResult) => {
    const suburbKey = `${suburb.name}, ${suburb.postcode}`;
    if (!data.selectedSuburbs.includes(suburbKey)) {
      onChange({ ...data, selectedSuburbs: [...data.selectedSuburbs, suburbKey] });
    }
    setManualSuburb("");
    setSuburbSuggestions([]);
  };

  const removeSuburb = (suburbKey: string) => {
    onChange({ ...data, selectedSuburbs: data.selectedSuburbs.filter(s => s !== suburbKey) });
  };

  useEffect(() => {
    loadGoogleMaps();
  }, [loadGoogleMaps]);

  const isValid = data.selectedSuburbs.length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle>Service Areas</CardTitle>
            <CardDescription>
              Set your service radius and select the suburbs you'll cover
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Map */}
        <div className="space-y-3">
          <Label>Drag the marker to set your service center</Label>
          <div 
            ref={mapRef} 
            className="w-full h-[300px] rounded-lg border border-border bg-muted"
          />
          {!isMapLoaded && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading map...</span>
            </div>
          )}
        </div>

        {/* Radius Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Service Radius</Label>
            <span className="text-sm font-medium">{data.radiusKm} km</span>
          </div>
          <Slider
            value={[data.radiusKm]}
            onValueChange={handleRadiusChange}
            min={5}
            max={50}
            step={1}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Adjust the slider to set how far you're willing to travel
          </p>
        </div>

        {/* Calculated Suburbs */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Suburbs in your area</Label>
            {isSearching && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          </div>
          
          {calculatedSuburbs.length > 0 ? (
            <div className="max-h-[200px] overflow-y-auto border rounded-lg p-3 space-y-2">
              {calculatedSuburbs.map((suburb) => {
                const suburbKey = `${suburb.name}, ${suburb.postcode}`;
                return (
                  <div key={suburbKey} className="flex items-center space-x-2">
                    <Checkbox
                      id={`suburb-${suburbKey}`}
                      checked={data.selectedSuburbs.includes(suburbKey)}
                      onCheckedChange={(checked) => handleSuburbToggle(suburb, checked as boolean)}
                    />
                    <Label htmlFor={`suburb-${suburbKey}`} className="cursor-pointer text-sm flex-1">
                      {suburb.name}, {suburb.state} {suburb.postcode}
                    </Label>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {isSearching ? "Finding suburbs..." : "No suburbs found in this area"}
            </p>
          )}
        </div>

        {/* Manual Suburb Addition */}
        <div className="space-y-3">
          <Label>Add additional suburbs</Label>
          <div className="relative">
            <Input
              placeholder="Search for a suburb..."
              value={manualSuburb}
              onChange={(e) => handleManualSuburbSearch(e.target.value)}
            />
            {suburbSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-lg shadow-lg z-10">
                {suburbSuggestions.map((suburb, index) => (
                  <button
                    key={index}
                    onClick={() => addManualSuburb(suburb)}
                    className="w-full px-3 py-2 text-left hover:bg-muted flex items-center gap-2 text-sm"
                  >
                    <Plus className="w-4 h-4 text-muted-foreground" />
                    {suburb.name}, {suburb.state} {suburb.postcode}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Selected Suburbs */}
        {data.selectedSuburbs.length > 0 && (
          <div className="space-y-2">
            <Label>Selected suburbs ({data.selectedSuburbs.length})</Label>
            <div className="flex flex-wrap gap-2">
              {data.selectedSuburbs.map((suburb) => (
                <Badge key={suburb} variant="secondary" className="gap-1">
                  {suburb}
                  <button onClick={() => removeSuburb(suburb)} className="ml-1 hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
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
