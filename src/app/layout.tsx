import type { ReactNode } from "react";

// Il layout vero (con <html lang>) è in app/[locale]/layout.tsx: qui si passa solo il contenuto.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
