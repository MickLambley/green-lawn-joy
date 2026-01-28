import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw";
import "leaflet-draw/dist/leaflet.draw.css";
import { Button } from "@/components/ui/button";
import { Trash2, PenTool, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface LawnDrawingMapProps {
  address: string;
  onAreaCalculated: (areaInSqm: number) => void;
}

// Calculate area of a polygon in square meters using the Shoelace formula
// with latitude correction for accurate area calculation
const calculatePolygonArea = (latlngs: L.LatLng[]): number => {
  if (latlngs.length < 3) return 0;

  const R = 6371000; // Earth's radius in meters
  let total = 0;

  for (let i = 0; i < latlngs.length; i++) {
    const j = (i + 1) % latlngs.length;
    const lat1 = (latlngs[i].lat * Math.PI) / 180;
    const lat2 = (latlngs[j].lat * Math.PI) / 180;
    const lng1 = (latlngs[i].lng * Math.PI) / 180;
    const lng2 = (latlngs[j].lng * Math.PI) / 180;

    total += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }

  return Math.abs((total * R * R) / 2);
};

const LawnDrawingMap = ({ address, onAreaCalculated }: LawnDrawingMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [totalArea, setTotalArea] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recalculateTotalArea = useCallback(() => {
    if (!drawnItemsRef.current) return;

    let total = 0;
    drawnItemsRef.current.eachLayer((layer) => {
      if (layer instanceof L.Polygon) {
        const latlngs = layer.getLatLngs()[0] as L.LatLng[];
        total += calculatePolygonArea(latlngs);
      }
    });

    setTotalArea(Math.round(total));
    onAreaCalculated(Math.round(total));
  }, [onAreaCalculated]);

  const clearAllDrawings = useCallback(() => {
    if (drawnItemsRef.current) {
      drawnItemsRef.current.clearLayers();
      setTotalArea(0);
      onAreaCalculated(0);
    }
  }, [onAreaCalculated]);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize map
    const map = L.map(mapRef.current, {
      center: [-33.8688, 151.2093], // Default to Sydney
      zoom: 18,
      zoomControl: true,
    });

    // Add ESRI World Imagery (satellite) tiles
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: "Tiles &copy; Esri",
        maxZoom: 20,
      }
    ).addTo(map);

    // Create feature group for drawn items
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    drawnItemsRef.current = drawnItems;

    // Initialize draw control
    const drawControl = new L.Control.Draw({
      position: "topright",
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
          shapeOptions: {
            color: "#22c55e",
            fillColor: "#22c55e",
            fillOpacity: 0.3,
            weight: 3,
          },
        },
        polyline: false,
        circle: false,
        circlemarker: false,
        marker: false,
        rectangle: {
          shapeOptions: {
            color: "#22c55e",
            fillColor: "#22c55e",
            fillOpacity: 0.3,
            weight: 3,
          },
        },
      },
      edit: {
        featureGroup: drawnItems,
        remove: true,
      },
    });
    map.addControl(drawControl);

    // Handle draw events
    map.on(L.Draw.Event.CREATED, (e: any) => {
      drawnItems.addLayer(e.layer);
      recalculateTotalArea();
    });

    map.on(L.Draw.Event.EDITED, () => {
      recalculateTotalArea();
    });

    map.on(L.Draw.Event.DELETED, () => {
      recalculateTotalArea();
    });

    mapInstanceRef.current = map;

    // Geocode the address and center the map
    const geocodeAddress = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?` +
            `q=${encodeURIComponent(address + ", Australia")}&` +
            `format=json&` +
            `limit=1`,
          {
            headers: {
              "User-Agent": "Lawnly App (contact@lawnly.com.au)",
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.length > 0) {
            const { lat, lon } = data[0];
            map.setView([parseFloat(lat), parseFloat(lon)], 19);
          } else {
            setError("Could not find address location. Please adjust the map manually.");
          }
        }
      } catch (err) {
        console.error("Geocoding error:", err);
        setError("Could not load address location. Please adjust the map manually.");
      } finally {
        setIsLoading(false);
      }
    };

    geocodeAddress();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [address, recalculateTotalArea]);

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Use the drawing tools on the right side of the map to outline your lawn areas. 
          Click to add points, double-click to finish a shape. You can draw multiple areas.
        </AlertDescription>
      </Alert>

      <div className="relative">
        <div
          ref={mapRef}
          className="w-full h-[400px] rounded-lg border overflow-hidden"
          style={{ zIndex: 0 }}
        />

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-muted-foreground">Loading satellite view...</span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-amber-600">{error}</p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <PenTool className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">
              Total lawn area: <span className="text-primary">{totalArea} m²</span>
            </span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={clearAllDrawings}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Clear All
        </Button>
      </div>
    </div>
  );
};

export default LawnDrawingMap;
