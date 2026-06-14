import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import crypto from "crypto";
import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

function generatePassword(): string {
  return crypto.randomBytes(12).toString("base64url").slice(0, 16);
}

export async function GET(req: NextRequest) {
  const supabase = createAdminClient();

  // Verify admin session
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  const adminEmails = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "").split(",").map(e => e.trim().toLowerCase());
  if (!user || !adminEmails.includes(user.email?.toLowerCase() || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get pending requests
  const { data, error } = await supabase
    .from("access_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 });
  }

  return NextResponse.json({ requests: data });
}

export async function POST(req: NextRequest) {
  const supabase = createAdminClient();

  // Verify admin session
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  const adminEmails = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "").split(",").map(e => e.trim().toLowerCase());
  if (!user || !adminEmails.includes(user.email?.toLowerCase() || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { requestId, action } = await req.json();

  if (!requestId || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (action === "reject") {
    await supabase
      .from("access_requests")
      .update({ status: "rejected" })
      .eq("id", requestId);
    return NextResponse.json({ success: true });
  }

  // Approve: get the request email
  const { data: request } = await supabase
    .from("access_requests")
    .select("email")
    .eq("id", requestId)
    .single();

  if (!request) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  // Generate password and create user
  const password = generatePassword();

  const { error: createError } = await supabase.auth.admin.createUser({
    email: request.email,
    password,
    email_confirm: true,
  });

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 500 });
  }

  // Update request status
  await supabase
    .from("access_requests")
    .update({ status: "approved", approved_at: new Date().toISOString() })
    .eq("id", requestId);

  // Send welcome email with credentials
  try {
    await getResend().emails.send({
      from: "Landlytic <noreply@landlytic.com>",
      to: request.email,
      subject: "Welcome to Landlytic - Your login details",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 24px; font-weight: 700; color: #111;">Welcome to Landlytic</h1>
          <p style="color: #555; font-size: 15px; line-height: 1.6;">
            Your access has been approved. Here are your login details:
          </p>
          <div style="background: #f7f7f7; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <p style="margin: 0 0 8px; font-size: 14px; color: #333;"><strong>Email:</strong> ${request.email}</p>
            <p style="margin: 0; font-size: 14px; color: #333;"><strong>Password:</strong> <code style="background: #e8e8e8; padding: 2px 6px; border-radius: 4px;">${password}</code></p>
          </div>
          <p style="color: #555; font-size: 14px; line-height: 1.6;">
            You can sign in at <a href="https://landlytic.com/login" style="color: #2563eb;">landlytic.com/login</a>
          </p>
          <p style="color: #999; font-size: 12px; margin-top: 32px;">
            For security, we recommend changing your password after your first login.
          </p>
        </div>
      `,
    });
  } catch (emailError) {
    // Email failed but user was still created - log and continue
    console.error("Failed to send welcome email:", emailError);
  }

  return NextResponse.json({
    success: true,
    email: request.email,
    password,
    message: "User created and welcome email sent.",
  });
}
