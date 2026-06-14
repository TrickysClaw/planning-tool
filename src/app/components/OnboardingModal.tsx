"use client";
import { useState } from "react";
import { X } from "lucide-react";

interface OnboardingModalProps {
  onComplete: (profile: { role: string; goal: string }) => void;
  onSkip?: () => void;
  initialRole?: string;
  initialGoal?: string;
  isEditing?: boolean;
}

export default function OnboardingModal({ onComplete, onSkip, initialRole, initialGoal, isEditing }: OnboardingModalProps) {
  const [role, setRole] = useState(initialRole || "");
  const [goal, setGoal] = useState(initialGoal || "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!role.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: role.trim(), goal: goal.trim() || null }),
      });
      if (!res.ok) throw new Error("Failed to save profile");
      const { profile } = await res.json();
      onComplete(profile);
    } catch (err) {
      console.error("Profile save error:", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-modal">
        {onSkip && (
          <button className="onboarding-close" onClick={onSkip} aria-label="Close">
            <X size={18} />
          </button>
        )}
        <h2>{isEditing ? "Edit Your Profile" : "Welcome to Landlytic"}</h2>
        <p className="onboarding-subtitle">
          {isEditing ? "Update your role and goal to refine your insights" : "Tell us about yourself so we can tailor insights to your needs"}
        </p>

        <div className="onboarding-section">
          <label className="onboarding-label" htmlFor="role-input">What do you do?</label>
          <input
            id="role-input"
            type="text"
            className="onboarding-input"
            placeholder="e.g. Property developer, Town planner, Investor, First home buyer..."
            value={role}
            onChange={(e) => setRole(e.target.value)}
            maxLength={100}
          />
        </div>

        <div className="onboarding-section">
          <label className="onboarding-label" htmlFor="goal-input">
            What&apos;s your goal? <span className="onboarding-optional">(optional)</span>
          </label>
          <textarea
            id="goal-input"
            className="onboarding-textarea"
            placeholder="e.g. Find sites suitable for duplex development under $1.5M in Sydney's Northern Beaches"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            maxLength={500}
            rows={3}
          />
        </div>

        <button
          className="onboarding-submit"
          onClick={handleSubmit}
          disabled={!role.trim() || saving}
        >
          {saving ? "Saving..." : isEditing ? "Save Changes" : "Get Started"}
        </button>
      </div>
    </div>
  );
}
