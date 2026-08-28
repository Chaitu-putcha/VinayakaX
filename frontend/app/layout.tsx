import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import Navbar from "@/components/Navbar";
import MobileTopNavbar from "@/components/MobileTopNavbar";
import MobileBottomNav from "@/components/MobileBottomNav";
import Footer from "@/components/Footer";
import CursorGlow from "@/components/CursorGlow";
import DiyaBackground from "@/components/DiyaBackground";
import FlowerRain from "@/components/FlowerRain";
import Fireworks from "@/components/Fireworks";
import AIChatbot from "@/components/AIChatbot";

export const metadata: Metadata = {
  title: "Sri Vinayaka 3 Day's Mahotsavam 2026 - UDDANAM RAMAKRISHNA PURAM",
  description: "Festival Management Platform for Sri Vinayaka 3 Day's Festival 2026 at Putchavani Totalu Street, Uddanam Ramakrishna Puram.",
  generator: "VinayakaX Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen flex flex-col justify-between">
        {/* Global Premium Background & Animations */}
        <DiyaBackground />
        <CursorGlow />
        <FlowerRain />
        <Fireworks />

        {/* Mobile-only top navbar (hamburger + brand + bell + avatar) */}
        <MobileTopNavbar />

        {/* Desktop navbar — unchanged, now explicitly desktop-only so it
            never stacks with MobileTopNavbar between md and lg */}
        <div className="hidden lg:block">
          <Navbar />
        </div>

        {/* Dynamic Page Content — top padding clears the fixed mobile
            top navbar (h-16), bottom padding clears the fixed mobile
            bottom nav (h-16 + safe-area). Both collapse to 0 at lg+. */}
        <main className="flex-grow relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 pt-20 pb-24 lg:pt-8 lg:pb-8">
          {children}
        </main>

        {/* Floating AI Chatbot */}
        <AIChatbot />

        {/* Global Footer */}
        <Footer />

        {/* Mobile-only fixed bottom nav */}
        <MobileBottomNav />

        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
          }}
        />
      </body>
    </html>
  );
}