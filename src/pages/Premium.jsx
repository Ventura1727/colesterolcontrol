import { useEffect } from "react";
import { createPageUrl } from "@/utils";

/**
 * Página antiga (LEGACY) — não usamos mais no funil.
 * Se alguém cair aqui por link antigo/cache/sujeira, manda direto pro Dashboard.
 */
export default function Premium() {
  useEffect(() => {
    window.location.replace(createPageUrl("Dashboard"));
  }, []);

  return null;
}
