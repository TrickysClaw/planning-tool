import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

// Simple in-memory rate limiting (per IP, 3 requests per hour)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 3600000 });
    return false;
  }
  if (entry.count >= 3) return true;
  entry.count++;
  return false;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }

  const { email } = await req.json();

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Basic email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Check if already requested
  const { data: existing } = await supabase
    .from("access_requests")
    .select("id, status")
    .eq("email", normalizedEmail)
    .single();

  if (existing) {
    if (existing.status === "approved") {
      return NextResponse.json({ message: "This email already has access. Try signing in." });
    }
    if (existing.status === "pending") {
      return NextResponse.json({ message: "Access request already submitted. You'll be notified when approved." });
    }
  }

  // Insert new request
  const { error } = await supabase
    .from("access_requests")
    .upsert({ email: normalizedEmail, status: "pending" }, { onConflict: "email" });

  if (error) {
    return NextResponse.json({ error: "Failed to submit request" }, { status: 500 });
  }

  // Notify admin
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail) {
    try {
      await getResend().emails.send({
        from: "Landlytic <noreply@landlytic.com>",
        to: adminEmail,
        subject: "New Access Request - Landlytic",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="font-size: 24px; font-weight: 700; color: #111;">New Access Request</h1>
            <p style="color: #555; font-size: 15px; line-height: 1.6;">
              Someone has requested access to Landlytic:
            </p>
            <div style="background: #f7f7f7; border-radius: 8px; padding: 20px; margin: 24px 0;">
              <p style="margin: 0; font-size: 14px; color: #333;"><strong>Email:</strong> ${normalizedEmail}</p>
            </div>
            <a href="https://landlytic.com/admin" style="display: inline-block; background: #111; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 500;">
              Review Request
            </a>
          </div>
        `,
      });
    } catch {
      // Don't fail the request if email notification fails
    }
  }

  return NextResponse.json({ message: "Access request submitted! You'll receive an email when approved." });
}
