import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

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



export async function GET(req: NextRequest) {
  const supabase = getSupabase(req);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("profiles")
    .select("role, goal")
    .eq("id", user.id)
    .single();

  if (error && error.code === "PGRST116") {
    // No profile yet
    return NextResponse.json({ profile: null });
  }
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase(req);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { role, goal } = body;

  if (!role || typeof role !== "string" || role.trim().length === 0 || role.length > 100) {
    return NextResponse.json({ error: "Role is required (max 100 chars)" }, { status: 400 });
  }
  if (goal && typeof goal !== "string") {
    return NextResponse.json({ error: "Goal must be a string" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .upsert({
      id: user.id,
      role,
      goal: goal?.slice(0, 500) || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" })
    .select("role, goal")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}
