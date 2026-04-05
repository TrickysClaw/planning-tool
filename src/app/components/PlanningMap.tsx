"use client";
import dynamic from "next/dynamic";

export interface MapMarker {
  lat: number;
  lng: number;
  label: string;
  type: "search" | "hda-declared" | "hda-not-declared" | "hda-deferred" | "ssda";
}

const PlanningMapInner = dynamic(() => import("./PlanningMapInner"), { ssr: false });

export default function PlanningMap({ lat, lng, markers }: { lat: number; lng: number; markers?: MapMarker[] }) {
  return <PlanningMapInner lat={lat} lng={lng} markers={markers} />;
}
