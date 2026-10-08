"use client";

import { useEffect } from "react";
import { captureFirstVisit } from "@/lib/analytics";

/** Registra UTM e referrer della prima visita: viaggiano con la richiesta di preventivo. */
export function FirstVisitCapture() {
  useEffect(() => captureFirstVisit(), []);
  return null;
}
