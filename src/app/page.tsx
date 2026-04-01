"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import SearchBar from "./components/SearchBar";
import ReportCard from "./components/ReportCard";
import PlanningMap from "./components/PlanningMap";
import { Loader2 } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function Home() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  async function handleSelect(r: { display_name: string; lat: string; lon: string }) {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    setCoords({ lat, lng });
    setLoading(true);
    setData(null);

    const [planning, hazard, cadastre] = await Promise.all([
      fetch(`/api/planning?lat=${lat}&lng=${lng}`).then(r => r.json()),
      fetch(`/api/hazard?lat=${lat}&lng=${lng}`).then(r => r.json()),
      fetch(`/api/cadastre?lat=${lat}&lng=${lng}`).then(r => r.json()),
    ]);

    setData({ address: r.display_name, planning, hazard, cadastre });
    setLoading(false);
  }

  return (
    <main className="min-h-screen px-4 py-12 md:py-20">
      <div className="text-center mb-8">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-bold text-white mb-3"
        >
          NSW Planning Intelligence
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-slate-400 text-lg"
        >
          Search any NSW address for zoning, height limits, FSR & more
        </motion.p>
      </div>

      <SearchBar onSelect={handleSelect} />

      {loading && (
        <div className="flex justify-center mt-12">
          <Loader2 className="animate-spin text-emerald-400" size={40} />
        </div>
      )}

      {data && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-10 space-y-6">
          <ReportCard data={data} />
          {coords && (
            <div className="max-w-6xl mx-auto">
              <PlanningMap lat={coords.lat} lng={coords.lng} />
            </div>
          )}
        </motion.div>
      )}
    </main>
  );
}
