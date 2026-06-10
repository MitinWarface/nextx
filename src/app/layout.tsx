import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Providers } from "@/components/providers/providers";
import { Toaster } from "@/components/shared/toaster";
import { ServiceWorkerRegistration } from "@/components/providers/sw-registration";
import { I18nProvider } from "@/i18n/provider";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NextX",
  description: "NextX — мессенджер с чатами, звонками и группами",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "NextX",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#212121" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={inter.variable}>
        <I18nProvider>
        <Providers>
          <ThemeProvider>
            {children}
            <Toaster />
          </ThemeProvider>
          <ServiceWorkerRegistration />
        </Providers>
        </I18nProvider>
      </body>
    </html>
  );
}
