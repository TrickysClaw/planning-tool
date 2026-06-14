"use client";
import { useState, useCallback } from "react";
import { buildPropertySnapshot } from "@/lib/types";
import type { MapMarker } from "@/app/components/PlanningMap";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface PropertyData {
  address: string;
  planning: any;
  hazard: any;
  cadastre: any;
  councilName: string;
  hda: any[];
  connectivity: any;
  perception: any;
  da: any;
  cdc: any;
  cc: any;
}

export interface PropertyMarkers {
  hda: MapMarker[];
  da: MapMarker[];
  cdc: MapMarker[];
  cc: MapMarker[];
  amenity: MapMarker[];
}

export interface UsePropertyDataResult {
  data: PropertyData | null;
  loading: boolean;
  coords: { lat: number; lng: number } | null;
  zoneCode: string;
  lotPolygon: [number, number][] | undefined;
  lgaBoundary: [number, number][] | undefined;
  markers: PropertyMarkers;
  fetchData: (address: string, lat: number, lng: number) => Promise<void>;
}

function toHDAMarkers(projects: any[]): MapMarker[] {
  return projects
    .filter((p: any) => p.coords)
    .map((p: any) => ({
      lat: p.coords.lat,
      lng: p.coords.lng,
      label: p.address || `EOI ${p.eoi_number}`,
      color: p.recommendation?.includes("Declare SSD")
        ? "hda-declared"
        : p.recommendation?.includes("Deferred")
        ? "hda-deferred"
        : "hda-not-declared",
      description: p.type ? `${p.type} development` : undefined,
      dwellings: p.dwellings || undefined,
      cost: p.capital_investment || undefined,
      status: p.outcome || p.recommendation || undefined,
      date: p.briefing_date || undefined,
      pan: `EOI ${p.eoi_number}`,
      link: `https://www.planning.nsw.gov.au/policy-and-legislation/housing/housing-delivery-authority`,
    }));
}

function toDAMarkers(das: any[]): MapMarker[] {
  return das
    .filter((d: any) => d.lat && d.lng)
    .map((d: any) => {
      const status = (d.status || "").toLowerCase();
      const color = status.includes("assessment")
        ? "da-under-assessment"
        : status.includes("rejected")
        ? "da-rejected"
        : "da-determined";
      return {
        lat: d.lat,
        lng: d.lng,
        label: d.address,
        color,
        description: d.description || (d.type?.length ? d.type.join(", ") : undefined),
        cost: d.costOfDevelopment || undefined,
        dwellings: d.dwellings || undefined,
        storeys: d.storeys || undefined,
        status: d.status || undefined,
        date: d.lodgementDate || undefined,
        pan: d.pan || undefined,
        councilRef: d.councilRef || undefined,
        link: d.pan ? `https://www.planningportal.nsw.gov.au/map?search=${encodeURIComponent(d.pan)}` : undefined,
      };
    });
}

function toCDCMarkers(cdcs: any[]): MapMarker[] {
  return cdcs
    .filter((c: any) => c.lat && c.lng)
    .map((c: any) => {
      const status = (c.status || "").toLowerCase();
      const color = status.includes("assessment")
        ? "cdc-under-assessment"
        : status.includes("rejected")
        ? "cdc-rejected"
        : "cdc-determined";
      return {
        lat: c.lat,
        lng: c.lng,
        label: c.address,
        color,
        description: c.description || (c.applicationType ? c.applicationType : undefined),
        cost: c.costOfDevelopment || undefined,
        dwellings: c.dwellings || undefined,
        storeys: c.storeys || undefined,
        status: c.status || undefined,
        date: c.lodgementDate || undefined,
        pan: c.pan || undefined,
        councilRef: c.councilRef || undefined,
        link: c.pan ? `https://www.planningportal.nsw.gov.au/map?search=${encodeURIComponent(c.pan)}` : undefined,
      };
    });
}

function toCCMarkers(ccs: any[]): MapMarker[] {
  return ccs
    .filter((c: any) => c.lat && c.lng)
    .map((c: any) => ({
      lat: c.lat,
      lng: c.lng,
      label: c.address,
      color: "cc-determined" as any,
      description: c.description || (c.type?.length ? c.type.join(", ") : undefined),
      cost: c.costOfDevelopment || undefined,
      storeys: c.storeys || undefined,
      status: c.status || undefined,
      date: c.lodgementDate || undefined,
      pan: c.pan || undefined,
    }));
}

function toAmenityMarkers(amenities: { type: string; name: string; distance: number; lat: number; lng: number }[]): MapMarker[] {
  return amenities.map((a) => ({
    lat: a.lat,
    lng: a.lng,
    label: a.name,
    color: `amenity-${a.type}`,
    description: `${a.distance}m away`,
  }));
}

export function usePropertyData(): UsePropertyDataResult {
  const [data, setData] = useState<PropertyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [zoneCode, setZoneCode] = useState("");
  const [lotPolygon, setLotPolygon] = useState<[number, number][] | undefined>(undefined);
  const [lgaBoundary, setLgaBoundary] = useState<[number, number][] | undefined>(undefined);
  const [markers, setMarkers] = useState<PropertyMarkers>({ hda: [], da: [], cdc: [], cc: [], amenity: [] });

  const fetchData = useCallback(async (address: string, lat: number, lng: number) => {
    setCoords({ lat, lng });
    setLoading(true);
    setData(null);
    setZoneCode("");

    const [planning, hazard, cadastre, lga, hda, connectivity, perception, daData, cdcData, ccData] = await Promise.all([
      fetch(`/api/planning?lat=${lat}&lng=${lng}`).then(r => r.json()).catch(() => ({ results: [] })),
      fetch(`/api/hazard?lat=${lat}&lng=${lng}`).then(r => r.json()).catch(() => ({ bushfire: { features: [] }, flood: { features: [] } })),
      fetch(`/api/cadastre?lat=${lat}&lng=${lng}`).then(r => r.json()).catch(() => ({ features: [] })),
      fetch(`/api/lga?lat=${lat}&lng=${lng}`).then(r => r.json()).catch(() => ({ councilName: null, boundary: null })),
      fetch(`/api/hda?address=${encodeURIComponent(address)}&lat=${lat}&lng=${lng}`).then(r => r.json()).catch(() => ({ projects: [] })),
      Promise.resolve(null), // connectivity disabled for now
      fetch(`/api/perception?suburb=${encodeURIComponent(address)}&lat=${lat}&lng=${lng}`).then(r => r.json()).catch(() => null),
      fetch(`/api/da?lat=${lat}&lng=${lng}`).then(r => r.json()).catch(() => ({ applications: [] })),
      fetch(`/api/cdc?lat=${lat}&lng=${lng}`).then(r => r.json()).catch(() => ({ certificates: [] })),
      fetch(`/api/cc?lat=${lat}&lng=${lng}`).then(r => r.json()).catch(() => ({ certificates: [] })),
    ]);

    setLgaBoundary(lga?.boundary || undefined);

    let poly: [number, number][] | undefined;
    if (cadastre?.features?.[0]?.geometry?.rings?.[0]) {
      const ring = cadastre.features[0].geometry.rings[0] as number[][];
      poly = ring.map(([lng, lat]: number[]) => [lat, lng] as [number, number]);
    }
    setLotPolygon(poly);

    const zoningResult = (planning?.results || []).find((r: any) => r.layerName === "Land Zoning");
    const zone = zoningResult?.attributes?.SYM_CODE || "";
    setZoneCode(zone);

    const hdaProjects = hda?.projects || [];

    // Build markers
    const newMarkers: PropertyMarkers = {
      hda: toHDAMarkers(hdaProjects),
      da: toDAMarkers(daData?.results || []),
      cdc: toCDCMarkers(cdcData?.results || []),
      cc: toCCMarkers(ccData?.results || []),
      amenity: [],
    };
    if ((connectivity as any)?.summary) {
      const allAmenities = Object.values((connectivity as any).summary).flat() as { type: string; name: string; distance: number; lat: number; lng: number }[];
      newMarkers.amenity = toAmenityMarkers(allAmenities.filter((a: any) => a.lat && a.lng));
    }
    setMarkers(newMarkers);

    const propertyData: PropertyData = {
      address,
      planning,
      hazard,
      cadastre,
      councilName: lga?.councilName || "",
      hda: hdaProjects,
      connectivity,
      perception,
      da: daData,
      cdc: cdcData,
      cc: ccData,
    };
    setData(propertyData);
    setLoading(false);

    // Save curated snapshot to Supabase (fire-and-forget)
    const snapshot = buildPropertySnapshot(address, lat, lng, {
      planning, hazard, cadastre,
      councilName: lga?.councilName || "",
      perception,
      da: daData,
      cdc: cdcData,
      cc: ccData,
      hda: hdaProjects,
    });
    fetch("/api/searches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(snapshot),
    }).catch(() => {});
  }, []);

  return { data, loading, coords, zoneCode, lotPolygon, lgaBoundary, markers, fetchData };
}
