"use client";
import dynamic from "next/dynamic";

export interface MapMarker {
  lat: number;
  lng: number;
  label: string;
  color?: string;
  description?: string;
  cost?: number;
  dwellings?: number;
  storeys?: number;
  status?: string;
  date?: string;
  link?: string;
  pan?: string;
  councilRef?: string;
}

const PlanningMapInner = dynamic(() => import("./PlanningMapInner"), { ssr: false });

export default function PlanningMap({
  lat,
  lng,
  markers,
  polygon,
  lgaBoundary,
  zoneCode,
  streetViewUrl,
  focusPoint,
}: {
  lat: number;
  lng: number;
  markers?: MapMarker[];
  polygon?: [number, number][];
  lgaBoundary?: [number, number][];
  zoneCode?: string;
  streetViewUrl?: string;
  focusPoint?: { lat: number; lng: number } | null;
}) {
  return <PlanningMapInner lat={lat} lng={lng} markers={markers} polygon={polygon} lgaBoundary={lgaBoundary} zoneCode={zoneCode} streetViewUrl={streetViewUrl} focusPoint={focusPoint} />;
}
