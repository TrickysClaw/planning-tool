"use client";
import dynamic from "next/dynamic";

const PlanningMapInner = dynamic(() => import("./PlanningMapInner"), { ssr: false });

export default function PlanningMap({ lat, lng }: { lat: number; lng: number }) {
  return <PlanningMapInner lat={lat} lng={lng} />;
}
