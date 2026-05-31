import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "PlanView",
  description: "Uncover the hidden potential of any property",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            var t = localStorage.getItem('theme');
            if (t === 'light') document.documentElement.classList.remove('dark');
            else if (t === 'dark') document.documentElement.classList.add('dark');
            else if (!window.matchMedia('(prefers-color-scheme: dark)').matches) document.documentElement.classList.remove('dark');
          })();
        `}} />
      </head>
      <body className={`${inter.className} antialiased min-h-screen`}>{children}</body>
    </html>
  );
}
