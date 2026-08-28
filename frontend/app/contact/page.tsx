"use client";

import { useState } from "react";
import { MapPin, Phone, Mail, Send, CheckCircle } from "lucide-react";

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) return;
    
    // Simulate contact submission
    setSuccess(true);
    setName("");
    setEmail("");
    setSubject("");
    setMessage("");
    setTimeout(() => setSuccess(false), 5000);
  };

  return (
    <div className="space-y-12 py-4">
      {/* Header */}
      <section className="space-y-4 max-w-2xl">
        <span className="text-[10px] text-saffron-500 uppercase font-bold tracking-wider block">Get In Touch</span>
        <h1 className="text-4xl font-extrabold text-stone-900 dark:text-white">Contact Committee</h1>
        <p className="text-stone-600 dark:text-stone-300 text-xs sm:text-sm">
          Have queries regarding pooja schedules, donations, sponsorships, or volunteering? Reach out to the Vinayaka Committee of Uddanam Ramakrishna Puram.
        </p>
      </section>

      {/* Grid: Form + Address details */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        
        {/* Contact Form */}
        <div className="p-6 rounded-2xl glass-panel border border-saffron-500/10 space-y-4">
          <h3 className="text-lg font-bold text-stone-850 dark:text-white">Send Us a Message</h3>
          
          {success && (
            <div className="p-4 rounded-xl bg-green-100 border border-green-300 text-green-700 text-xs font-semibold flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Message sent successfully! Our volunteer desk will call you soon.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-stone-500 font-semibold block">Your Name</label>
                <input
                  type="text"
                  placeholder="Enter name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-stone-500 font-semibold block">Email Address</label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-stone-500 font-semibold block">Subject</label>
              <input
                type="text"
                placeholder="e.g. Laddu Auction / Prasadam Sponsorship"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-stone-500 font-semibold block">Message Content</label>
              <textarea
                placeholder="Your query..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
                rows={4}
                required
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-saffron-500 hover:bg-saffron-600 text-white font-bold py-2.5 transition-colors cursor-pointer text-center"
            >
              <Send className="h-4 w-4" />
              Send Message
            </button>
          </form>
        </div>

        {/* Address Details & Map */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl glass-panel border border-saffron-500/10 space-y-4">
            <h3 className="text-lg font-bold text-stone-850 dark:text-white">Festival Office Details</h3>
            
            <div className="space-y-3.5 text-xs text-stone-600 dark:text-stone-300">
              <div className="flex gap-3">
                <MapPin className="h-5 w-5 text-saffron-500 shrink-0" />
                <div>
                  <p className="font-bold text-stone-850 dark:text-white uppercase text-[10px] tracking-wide">Pooja Mandapam Venue</p>
                  <p className="mt-1">Putchavani Totalu Street, UDDANAM RAMAKRISHNA PURAM, Vajrapukotturu Mandal, Srikakulam District, Andhra Pradesh, India.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Phone className="h-5 w-5 text-saffron-500 shrink-0" />
                <div>
                  <p className="font-bold text-stone-850 dark:text-white uppercase text-[10px] tracking-wide">Phone & WhatsApp</p>
                  <p className="mt-1">
                    <a href="tel:+917993093251" className="hover:text-saffron-600 font-semibold transition-colors">+91 7993093251</a>
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Mail className="h-5 w-5 text-saffron-500 shrink-0" />
                <div>
                  <p className="font-bold text-stone-850 dark:text-white uppercase text-[10px] tracking-wide">Email Address</p>
                  <p className="mt-1">
                    <a href="mailto:pchaitanya6522@gmail.com" className="hover:text-saffron-600 font-semibold transition-colors">pchaitanya6522@gmail.com</a>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Inline Map preview / Link card */}
          <div className="rounded-2xl overflow-hidden border border-gold-500/20 relative aspect-video flex flex-col justify-end text-white shadow-lg bg-stone-900 bg-cover bg-center">
            {/* Visual background representation of Srikakulam map */}
            <div className="absolute inset-0 bg-stone-950 flex flex-col items-center justify-center p-4 text-center">
              <MapPin className="h-10 w-10 text-saffron-500 animate-bounce mb-2" />
              <h4 className="font-extrabold uppercase text-xs tracking-wider">Uddanam Ramakrishna Puram</h4>
              <p className="text-[10px] text-stone-500 mt-1 max-w-xs">Vajrapukotturu Mandal, Srikakulam, Andhra Pradesh</p>
            </div>
            
            <a
              href="https://maps.app.goo.gl/jyvM7cKeBDZSepCJ8"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-saffron-500 hover:bg-saffron-600 text-white font-bold py-3 text-center text-xs relative z-10 transition-colors cursor-pointer"
            >
              Open Google Maps Route
            </a>
          </div>
        </div>

      </section>
    </div>
  );
}
