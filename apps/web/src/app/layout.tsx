import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

/*
 * The same two variable faces the Citizen app bundles: DM Sans for display and
 * headline levels, Inter for titles, body, labels and every number. Loaded
 * from the app's own font files rather than from Google, so the wordmark on a
 * phone and the wordmark on a laptop are cut from the same metal.
 */
const inter = localFont({
  src: "../fonts/Inter.ttf",
  variable: "--font-inter",
  display: "swap",
  weight: "100 900",
});

const dmSans = localFont({
  src: "../fonts/DMSans.ttf",
  variable: "--font-dm-sans",
  display: "swap",
  weight: "100 1000",
});

export const metadata: Metadata = {
  title: {
    default: "Jan Setu — Jharkhand's Societal Innovation OS",
    template: "%s · Jan Setu",
  },
  description:
    "Jan Setu connects students, citizens, institutions and industry across Jharkhand to surface societal challenges, form teams, and ship measurable impact.",
  icons: { icon: "/brand/janmaang_mark.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      className={`${inter.variable} ${dmSans.variable} h-full antialiased`}
      lang="en"
    >
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
