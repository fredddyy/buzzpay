import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito" });

export const metadata: Metadata = {
  title: "BuzzPay — Student Deals & Discounts",
  description: "Pay less because you're a student. Exclusive deals from campus vendors.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${nunito.variable} h-full`}>
      <body className="min-h-full flex flex-col font-[family-name:var(--font-nunito)] antialiased">
        {children}
      </body>
    </html>
  );
}
