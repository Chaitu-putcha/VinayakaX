"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Phone, Mail, MapPin, ExternalLink, Calendar, Heart, ShieldAlert } from "lucide-react";

export default function Footer() {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    // Count down to Nimajjanam/Completion: September 20, 2026
    const targetDate = new Date("2026-09-20T00:00:00").getTime();

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference <= 0) {
        clearInterval(timer);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <footer className="w-full bg-stone-900 text-stone-300 dark:bg-stone-950 border-t-4 border-saffron-500 pt-16 pb-8 transition-colors duration-300 relative overflow-hidden">
      {/* Decorative background overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_800px_at_bottom,rgba(255,111,0,0.06),transparent)] pointer-events-none" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-stone-850">
          
          {/* Column 1: Festival Info & Moto */}
          <div className="space-y-4">
            <span className="text-[10px] tracking-widest text-gold-400 font-bold uppercase block leading-none">
              UDDANAM RAMAKRISHNA PURAM
            </span>
            <h3 className="text-xl font-extrabold text-white leading-tight">
              Sri Vinayaka Navarathri Mahotsavam 2026
            </h3>
            <p className="text-stone-400 text-xs italic">
              Village Goddess: <span className="text-saffron-400 font-medium">Sri Ramachandeshuari Thalli</span>
            </p>
            <div className="pt-2">
              <span className="text-[10px] text-stone-500 uppercase font-bold tracking-wider block">Festival Motto</span>
              <p className="text-sm font-semibold text-gold-500">“Unity, Devotion, Culture & Service”</p>
            </div>
            
            {/* Live Countdown */}
            <div className="pt-3">
              <span className="text-[10px] text-stone-500 uppercase font-bold tracking-wider block mb-1">Countdown to Nimajjanam</span>
              <div className="flex gap-2 text-center text-xs">
                <div className="bg-stone-850 rounded px-2 py-1 text-white border border-stone-800"><span className="font-bold block text-sm">{timeLeft.days}</span>Days</div>
                <div className="bg-stone-850 rounded px-2 py-1 text-white border border-stone-800"><span className="font-bold block text-sm">{timeLeft.hours}</span>Hrs</div>
                <div className="bg-stone-850 rounded px-2 py-1 text-white border border-stone-800"><span className="font-bold block text-sm">{timeLeft.minutes}</span>Min</div>
                <div className="bg-stone-850 rounded px-2 py-1 text-white border border-stone-800"><span className="font-bold block text-sm">{timeLeft.seconds}</span>Sec</div>
              </div>
            </div>
          </div>

          {/* Column 2: Address & Google Maps */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider border-b border-saffron-500/20 pb-2">Venue Address</h4>
            <div className="space-y-2.5 text-xs text-stone-400">
              <div className="flex gap-2">
                <MapPin className="h-4 w-4 text-saffron-500 shrink-0" />
                <p>Putchavani Totalu, Uddanam Ramakrishna Puram, Vajrapukotturu Mandal, Srikakulam District, Andhra Pradesh, India</p>
              </div>
              <div className="flex gap-2">
                <Phone className="h-4 w-4 text-saffron-500 shrink-0" />
                <a href="tel:+917993093251" className="hover:text-white transition-colors">+91 7993093251</a>
              </div>
              <div className="flex gap-2">
                <Mail className="h-4 w-4 text-saffron-500 shrink-0" />
                <a href="mailto:pchaitanya6522@gmail.com" className="hover:text-white transition-colors">pchaitanya6522@gmail.com</a>
              </div>
            </div>
            
            {/* Google Maps link */}
            <div className="pt-2">
              <a
                href="https://maps.app.goo.gl/jyvM7cKeBDZSepCJ8"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md bg-stone-850 border border-stone-750 px-3 py-1.5 text-xs font-bold text-white hover:bg-stone-800 transition-all"
              >
                Find on Google Maps
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* Column 3: Quick Links & Help */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider border-b border-saffron-500/20 pb-2">Quick Navigation</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Link href="/" className="hover:text-saffron-400 transition-colors">Home</Link>
              <Link href="/about" className="hover:text-saffron-400 transition-colors">About Us</Link>
              <Link href="/events" className="hover:text-saffron-400 transition-colors">Events Schedule</Link>
              <Link href="/competitions" className="hover:text-saffron-400 transition-colors">Competitions</Link>
              <Link href="/gallery" className="hover:text-saffron-400 transition-colors">Media Gallery</Link>
              <Link href="/live" className="hover:text-saffron-400 transition-colors">Live Darshan</Link>
              <Link href="/donate" className="hover:text-saffron-400 transition-colors">Donate Now</Link>
              <Link href="/volunteers" className="hover:text-saffron-400 transition-colors">Volunteers</Link>
            </div>
            
            {/* Emergency Contacts Block */}
            <div className="pt-2 bg-stone-900/60 p-3 rounded-lg border border-red-950/30">
              <div className="flex items-center gap-1.5 text-xs font-bold text-red-400 mb-1">
                <ShieldAlert className="h-4 w-4" />
                Emergency Desk
              </div>
              <p className="text-[10px] text-stone-500">24/7 Committee Helpline</p>
              <a href="tel:+917993093251" className="text-xs font-bold text-white hover:text-red-400">+91 7993093251</a>
            </div>
          </div>

          {/* Column 4: Festival Highlights */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider border-b border-saffron-500/20 pb-2">Festival Highlights</h4>
            <ul className="space-y-2.5 text-xs text-stone-400">
              <li className="flex items-center gap-2">
                <span className="text-sm leading-none">🪔</span>
                <span>3 Days Grand Festival</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-sm leading-none">🙏</span>
                <span>Daily Vinayaka Pooja &amp; Harathi</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-sm leading-none">🎉</span>
                <span>Devotional &amp; Cultural Programs</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-sm leading-none">🌊</span>
                <span>4th Day Grand Nimajjanam</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Footer Base Details */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-stone-500 text-center md:text-left">
          <div>
            <p>© 2026 Sri Vinayaka Navarathri Mahotsavam, UDDANAM RAMAKRISHNA PURAM.</p>
            <p className="mt-0.5">Designed & Developed by <span className="text-gold-500 font-semibold">Chaitanya P.</span> Powered by VinayakaX Festival Management Platform.</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span>Made with</span>
            <Heart className="h-3 w-3 text-red-500 fill-red-500 animate-pulse" />
            <span>in Andhra Pradesh, India</span>
          </div>
        </div>
      </div>
    </footer>
  );
}