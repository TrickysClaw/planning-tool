import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { PropertySnapshot } from "@/lib/types";

function getSupabase(req: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll() { /* read-only */ },
      },
    }
  );
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase(req);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const snapshot: PropertySnapshot = await req.json();

    // Upsert: same user + same coordinates = update existing row
    const { error } = await supabase.rpc("upsert_search", {
      p_user_id: user.id,
      p_address: snapshot.address,
      p_lat: snapshot.lat,
      p_lng: snapshot.lng,
      p_snapshot: snapshot,
    });

    if (error) {
      console.error("Search save error:", error);
      return NextResponse.json({ error: "Failed to save search" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Search save error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase(req);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "20");

    const { data, error } = await supabase
      .from("searches")
      .select("id, address, lat, lng, snapshot, searched_at, search_count")
      .eq("user_id", user.id)
      .order("searched_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Search history error:", error);
      return NextResponse.json({ error: "Failed to load history" }, { status: 500 });
    }

    return NextResponse.json({ searches: data });
  } catch (err) {
    console.error("Search history error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
