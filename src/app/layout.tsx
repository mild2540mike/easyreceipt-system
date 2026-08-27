import type { Metadata, Viewport } from "next";
import { Geist_Mono, Noto_Sans_Thai } from "next/font/google";
import { EasyReceiptProvider } from "@/components/easyreceipt/easyreceipt-provider";
import { EasyReceiptQueryProvider } from "@/components/easyreceipt/query-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toast";
import "./globals.css";

const notoThai = Noto_Sans_Thai({
  variable: "--font-noto-thai",
  subsets: ["thai", "latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "timetoeat System",
  description: "Mobile-first purchase, stock, recipe, and cash-flow prototype.",
  applicationName: "timetoeat",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
      {
        url: "/icons/timetoeat-192.png",
        type: "image/png",
        sizes: "192x192",
      },
      {
        url: "/icons/timetoeat-512.png",
        type: "image/png",
        sizes: "512x512",
      },
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        type: "image/png",
        sizes: "180x180",
      },
    ],
    shortcut: ["/favicon.ico"],
  },
  appleWebApp: {
    capable: true,
    title: "timetoeat",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1f6f8b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={`${notoThai.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <EasyReceiptQueryProvider>
          <EasyReceiptProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </EasyReceiptProvider>
        </EasyReceiptQueryProvider>
        <Toaster timeout={5000} limit={3} />
      </body>
    </html>
  );
}
