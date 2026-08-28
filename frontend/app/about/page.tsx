"use client";

import { motion } from "framer-motion";
import { ShieldCheck, MapPin, Award, Users } from "lucide-react";

interface Member {
  name: string;
  role: string;
  avatar: string;
}

export default function About() {
  const committee: Member[] = [
    { name: "Venky Chotu", role: "Main Head / Coordinator", avatar: "👨‍💼" },
    { name: "Yogesh", role: "President", avatar: "🤵" },
    { name: "Sekhar", role: "Vice President", avatar: "🤝" },
    { name: "Karthik", role: "Vice President", avatar: "🛠️" },
    { name: "Sanju", role: "Committee Lead", avatar: "👔" },
    { name: "Mohith", role: "Committee Member", avatar: "📋" },
    { name: "Jagadeesh", role: "Committee Member", avatar: "💻" },
    { name: "Sentharao", role: "Committee Member", avatar: "⚙️" },
    { name: "Bhaskar Rao", role: "Committee Member", avatar: "💼" },
    { name: "Chaitanya", role: "Committee Member / Developer", avatar: "👨‍💻" },
    { name: "Kiran", role: "Committee Member / Designer", avatar: "👨" },
    { name: "kotesh", role: "Committee Member / DJ", avatar: "👨" }
  ];

  return (
    <div className="space-y-16 py-4">
      {/* Introduction Banner */}
      <section className="space-y-6 max-w-4xl">
        <span className="text-[10px] text-saffron-500 uppercase font-bold tracking-wider block">Know Our Roots</span>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-stone-900 dark:text-white">
          About Sri Vinayaka Navarathri Utsavalu
        </h1>
        <p className="text-stone-600 dark:text-stone-300 text-sm sm:text-base leading-relaxed">
          The village of **UDDANAM RAMAKRISHNA PURAM**, situated in the Vajrapukotturu Mandal of Srikakulam district, Andhra Pradesh, has a rich cultural heritage. Under the divine presence and blessings of our village Goddess, **Sri Ramachandeshuari Thalli**, the youth and elders of **Putchavani Totalu Street** come together annually to host the grand **Sri Vinayaka Navarathri Mahotsavam**.
        </p>
      </section>

      {/* Grid of Key Features */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl glass-panel border border-saffron-500/10 space-y-3">
          <div className="h-10 w-10 bg-saffron-100 dark:bg-amber-950/40 text-saffron-600 dark:text-gold-400 rounded-lg flex items-center justify-center border border-saffron-500/10">
            <MapPin className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-bold text-stone-850 dark:text-white">Our Village Venue</h3>
          <p className="text-stone-500 dark:text-stone-400 text-xs leading-relaxed">
            Putchavani Totalu Street, Uddanam Ramakrishna Puram. The street is decorated with vibrant colors, illumination, and flowers during the 9 days of celebration.
          </p>
        </div>

        <div className="p-6 rounded-2xl glass-panel border border-saffron-500/10 space-y-3">
          <div className="h-10 w-10 bg-gold-100 dark:bg-amber-950/40 text-gold-500 dark:text-gold-400 rounded-lg flex items-center justify-center border border-gold-500/10">
            <Award className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-bold text-stone-850 dark:text-white">Goddess Blessings</h3>
          <p className="text-stone-500 dark:text-stone-400 text-xs leading-relaxed">
            Sri Ramachandeshuari Thalli. She protects and guides our village folk, bringing prosperity, peace, and spiritual growth to every family.
          </p>
        </div>

        <div className="p-6 rounded-2xl glass-panel border border-saffron-500/10 space-y-3">
          <div className="h-10 w-10 bg-saffron-100 dark:bg-amber-950/40 text-saffron-600 dark:text-gold-400 rounded-lg flex items-center justify-center border border-saffron-500/10">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-bold text-stone-850 dark:text-white">Motto of Unity</h3>
          <p className="text-stone-500 dark:text-stone-400 text-xs leading-relaxed">
            "Unity, Devotion, Culture & Service". We are committed to organizing charity events, blood donations, tree planting, and daily food distribution (Annaprasadam).
          </p>
        </div>
      </section>

      {/* Committee Profile Cards Section */}
      <section className="space-y-8">
        <div className="text-center">
          <span className="text-[10px] text-saffron-500 uppercase font-bold tracking-wider block">Working Committee</span>
          <h2 className="text-3xl font-extrabold text-stone-900 dark:text-white">Meet Our Leaders</h2>
          <p className="text-stone-500 max-w-lg mx-auto text-xs mt-2">
            The dedicated team orchestrating security, logistics, cultural events, donations, and volunteer management.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 pt-4">
          {committee.map((m, idx) => (
            <motion.div
              key={idx}
              className="group relative rounded-2xl p-5 text-center glass-panel border border-saffron-500/20 hover:border-gold-500/50 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-2 cursor-pointer flex flex-col items-center justify-between min-h-[180px]"
              whileHover={{ rotateY: 10, rotateX: -5 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              {/* Profile Glow border */}
              <div className="absolute inset-0 border border-gold-400/20 rounded-2xl group-hover:border-gold-400/60 pointer-events-none transition-colors" />

              {/* Avatar Icon */}
              <div className="h-14 w-14 rounded-full bg-saffron-100 dark:bg-amber-950/30 text-2xl flex items-center justify-center border border-gold-500/10 shadow-inner group-hover:scale-110 transition-transform">
                {m.avatar}
              </div>

              {/* Name & Title */}
              <div className="space-y-1 mt-3">
                <h4 className="font-bold text-sm sm:text-base text-stone-850 dark:text-white group-hover:text-saffron-600 dark:group-hover:text-gold-400 transition-colors">
                  {m.name}
                </h4>
                <p className="text-[10px] text-stone-500 uppercase font-bold tracking-wide">
                  {m.role}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
