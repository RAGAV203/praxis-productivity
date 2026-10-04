import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/Shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Praxis",
  description: "Your private, offline life dashboard — money, health, habits, journal and more.",
  applicationName: "Praxis",
  appleWebApp: { capable: true, title: "Praxis", statusBarStyle: "black-translucent" },
  icons: { icon: "/icon-192.png", apple: "/apple-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f2f2f7",
};

// Applies the saved theme before first paint (mirrored from IndexedDB to localStorage).
const themeScript = `try{var t=localStorage.getItem('praxis-theme')||'auto';var d=t==='dark'||(t==='auto'&&matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');var a=localStorage.getItem('praxis-accent');if(a)document.documentElement.style.setProperty('--accent',a)}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
