"use client";
import dynamic from "next/dynamic";

export interface MapMarker {
  lat: number;
  lng: number;
  label: string;
  type: "search" | "hda-declared" | "hda-not-declared" | "hda-deferred" | "ssda" | "da-under-assessment" | "da-determined" | "da-rejected";
  dwellings?: number | null;
  recommendation?: string;
  briefingUrl?: string;
}

const PlanningMapInner = dynamic(() => import("./PlanningMapInner"), { ssr: false });

export default function PlanningMap({
  lat,
  lng,
  markers,
  polygon,
  zoneCode,
}: {
  lat: number;
  lng: number;
  markers?: MapMarker[];
  polygon?: [number, number][];
  zoneCode?: string;
}) {
  return <PlanningMapInner lat={lat} lng={lng} markers={markers} polygon={polygon} zoneCode={zoneCode} />;
}
