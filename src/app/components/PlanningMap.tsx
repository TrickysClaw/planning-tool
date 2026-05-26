"use client";
import dynamic from "next/dynamic";

export interface MapMarker {
  lat: number;
  lng: number;
  label: string;
  color?: string;
}

const PlanningMapInner = dynamic(() => import("./PlanningMapInner"), { ssr: false });

export default function PlanningMap({
  lat,
  lng,
  markers,
  polygon,
  lgaBoundary,
  zoneCode,
}: {
  lat: number;
  lng: number;
  markers?: MapMarker[];
  polygon?: [number, number][];
  lgaBoundary?: [number, number][];
  zoneCode?: string;
}) {
  return <PlanningMapInner lat={lat} lng={lng} markers={markers} polygon={polygon} lgaBoundary={lgaBoundary} zoneCode={zoneCode} />;
}
