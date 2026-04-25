"use client";

import { Phone, X } from "lucide-react";
import { useState } from "react";

export default function SafetyBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 mx-4 mt-4">
      <div className="flex items-start gap-3">
        <Phone className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-semibold text-red-800 text-sm mb-1">
            If you or someone you know is in crisis
          </p>
          <ul className="text-xs text-red-700 space-y-0.5">
            <li>iCall (TISS): 9152987821 (Mon-Sat, 8am-10pm)</li>
            <li>Vandrevala Foundation: 1860-2662-345 (24/7)</li>
            <li>AASRA: 9820466726 (24/7)</li>
          </ul>
          <p className="text-xs text-red-600 mt-1">
            You are not alone. Please talk to someone.
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-red-400 hover:text-red-600 cursor-pointer"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
