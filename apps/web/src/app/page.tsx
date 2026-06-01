"use client";

import { useEffect, useState } from "react";

export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const parallax = (speed: number) => `translateY(${scrollY * speed}px)`;

  return (
    <div className="bg-[#0A0A0F] text-white overflow-x-hidden">
      {/* ──── NAV ──── */}
      <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{ background: scrollY > 50 ? "rgba(10,10,15,0.9)" : "transparent", backdropFilter: scrollY > 50 ? "blur(20px)" : "none" }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#6C4FFF] flex items-center justify-center text-white font-extrabold text-sm">B</div>
            <span className="text-lg font-extrabold">BuzzPay</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#how" className="hover:text-white transition">How it works</a>
            <a href="#vendors" className="hover:text-white transition">For Vendors</a>
          </div>
          <div className="flex items-center gap-3">
            <a href="/admin/login" className="text-sm text-gray-400 hover:text-white transition hidden sm:block">Admin</a>
            <a href="#download" className="px-5 py-2 rounded-full bg-[#6C4FFF] text-white text-sm font-semibold hover:bg-[#5B3FD9] transition shadow-lg shadow-[#6C4FFF]/25">
              Get the App
            </a>
          </div>
        </div>
      </nav>

      {/* ──── HERO ──── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated gradient orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-[600px] h-[600px] rounded-full opacity-20 blur-[120px] animate-pulse"
            style={{ background: "radial-gradient(circle, #6C4FFF, transparent)", top: "-10%", left: "-10%", transform: parallax(-0.3) }} />
          <div className="absolute w-[500px] h-[500px] rounded-full opacity-15 blur-[100px] animate-pulse"
            style={{ background: "radial-gradient(circle, #A78BFA, transparent)", bottom: "10%", right: "-5%", animationDelay: "1s", transform: parallax(-0.2) }} />
          <div className="absolute w-[300px] h-[300px] rounded-full opacity-10 blur-[80px]"
            style={{ background: "radial-gradient(circle, #16A34A, transparent)", top: "40%", left: "50%", transform: parallax(-0.15) }} />
        </div>

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#6C4FFF]/30 bg-[#6C4FFF]/10 mb-8 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
            <span className="text-xs font-semibold text-[#A78BFA]">Live on UNILAG, YABATECH, LASU, FUTA</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold leading-[0.95] tracking-tight mb-6">
            <span className="block">Pay less</span>
            <span className="block mt-2">because you&apos;re a</span>
            <span className="block mt-2 bg-gradient-to-r from-[#6C4FFF] via-[#A78BFA] to-[#6C4FFF] bg-clip-text text-transparent bg-[length:200%] animate-gradient">
              student.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Exclusive deals from your favorite campus vendors. Scan. Pay. Save up to <span className="text-[#16A34A] font-bold">40%</span> on food, drinks, and lifestyle.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="#download" className="group px-8 py-4 rounded-full bg-[#6C4FFF] text-white font-bold text-lg shadow-2xl shadow-[#6C4FFF]/30 hover:shadow-[#6C4FFF]/50 transition-all hover:scale-105">
              Download BuzzPay
              <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">&rarr;</span>
            </a>
            <a href="#how" className="px-8 py-4 rounded-full border border-white/10 text-gray-300 font-semibold hover:bg-white/5 transition">
              See how it works
            </a>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-8 md:gap-16 mt-16 text-center">
            <div>
              <div className="text-3xl md:text-4xl font-extrabold text-[#6C4FFF]">500+</div>
              <div className="text-xs text-gray-500 mt-1">Students saving</div>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div>
              <div className="text-3xl md:text-4xl font-extrabold text-[#16A34A]">40%</div>
              <div className="text-xs text-gray-500 mt-1">Average savings</div>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div>
              <div className="text-3xl md:text-4xl font-extrabold text-[#F59E0B]">10+</div>
              <div className="text-xs text-gray-500 mt-1">Campus vendors</div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
          <span className="text-xs text-gray-500">Scroll</span>
          <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </section>

      {/* ──── HOW IT WORKS ──── */}
      <section id="how" className="py-32 relative">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4">Three taps to savings</h2>
            <p className="text-gray-400 text-lg max-w-xl mx-auto">No cards, no coupons, no hassle. Just your phone and your student status.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Browse Deals", desc: "Open BuzzPay and see what's hot near your campus right now. Jollof, shawarma, data bundles — all discounted.", icon: "🔥", color: "#6C4FFF" },
              { step: "02", title: "Pay Instantly", desc: "Tap, pay with Paystack (card, bank, or USSD), and get your QR voucher in seconds.", icon: "⚡", color: "#16A34A" },
              { step: "03", title: "Show & Enjoy", desc: "Flash your QR code at the vendor. They scan it, you eat. No cash, no arguments.", icon: "🎉", color: "#F59E0B" },
            ].map((item) => (
              <div key={item.step} className="group relative p-8 rounded-3xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-all duration-500 hover:border-white/10">
                <div className="absolute -top-px left-8 right-8 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition" />
                <div className="text-6xl mb-6">{item.icon}</div>
                <div className="text-xs font-bold tracking-widest mb-3" style={{ color: item.color }}>STEP {item.step}</div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──── FEATURES ──── */}
      <section id="features" className="py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#6C4FFF]/5 to-transparent" />
        <div className="relative max-w-6xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4">Built for campus life</h2>
            <p className="text-gray-400 text-lg max-w-xl mx-auto">Every feature designed for the Nigerian student experience.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: "Happy Hour Deals", desc: "Time-limited offers during breakfast, lunch, and dinner rushes. Countdown timers so you never miss out.", icon: "⏰" },
              { title: "Verified Students Only", desc: "Upload your student ID once. Get verified. Unlock exclusive prices that non-students can't see.", icon: "🛡️" },
              { title: "QR Vouchers", desc: "Pay in-app, get a QR code. Show it to the vendor. Done in 5 seconds. No cash needed.", icon: "📱" },
              { title: "Works Offline", desc: "Poor campus network? Your vouchers are cached locally. Show your QR even without data.", icon: "📡" },
              { title: "Group Buys", desc: "Buying for your crew? Quantity stepper lets you grab 5 shawarmas in one checkout.", icon: "👥" },
              { title: "Real-Time Updates", desc: "Stock running low? You'll see it live. Vendor just went live? Your feed updates instantly.", icon: "🔔" },
            ].map((f) => (
              <div key={f.title} className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition group">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="text-lg font-bold mb-2 group-hover:text-[#A78BFA] transition">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──── FOR VENDORS ──── */}
      <section id="vendors" className="py-32">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#16A34A]/30 bg-[#16A34A]/10 mb-6">
                <span className="text-xs font-semibold text-[#16A34A]">For Vendors</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-extrabold mb-6">Fill your empty tables</h2>
              <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                Students are hungry but broke. You have food but empty seats during off-peak hours. BuzzPay connects the dots — prepaid orders, zero risk, automatic settlements.
              </p>
              <div className="space-y-4">
                {[
                  "Prepaid orders — no more \"I'll pay later\"",
                  "QR scanner app — verify vouchers in 2 seconds",
                  "Real-time dashboard — track sales, stock, payouts",
                  "Automatic Paystack settlements — money hits your bank",
                  "Zero setup cost — we bring the students to you",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#16A34A]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-[#16A34A]" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </div>
                    <span className="text-gray-300 text-sm">{item}</span>
                  </div>
                ))}
              </div>
              <a href="/admin/login" className="inline-flex items-center gap-2 mt-8 px-6 py-3 rounded-full border border-[#16A34A]/30 text-[#16A34A] font-semibold hover:bg-[#16A34A]/10 transition">
                Partner with us &rarr;
              </a>
            </div>
            <div className="relative">
              <div className="aspect-square rounded-3xl bg-gradient-to-br from-[#16A34A]/10 to-[#6C4FFF]/10 border border-white/5 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-8xl mb-4">🏪</div>
                  <div className="text-2xl font-bold">₦248,500</div>
                  <div className="text-gray-400 text-sm mt-1">earned this month</div>
                  <div className="flex items-center justify-center gap-6 mt-6">
                    <div className="text-center">
                      <div className="text-xl font-bold text-[#16A34A]">18</div>
                      <div className="text-[10px] text-gray-500">scans today</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-[#F59E0B]">92%</div>
                      <div className="text-[10px] text-gray-500">redemption</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──── DOWNLOAD CTA ──── */}
      <section id="download" className="py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-[#6C4FFF]/10 to-transparent" />
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-6xl font-extrabold mb-6">
            Stop paying full price.<br />
            <span className="bg-gradient-to-r from-[#6C4FFF] to-[#A78BFA] bg-clip-text text-transparent">Start buzzing.</span>
          </h2>
          <p className="text-gray-400 text-lg mb-10">Download BuzzPay and save on your next meal. Available for Android.</p>
          <a href="#" className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-[#6C4FFF] text-white font-bold text-lg shadow-2xl shadow-[#6C4FFF]/30 hover:shadow-[#6C4FFF]/50 transition-all hover:scale-105">
            Download for Android
          </a>
          <p className="text-xs text-gray-500 mt-4">iOS coming soon</p>
        </div>
      </section>

      {/* ──── FOOTER ──── */}
      <footer className="border-t border-white/5 py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#6C4FFF] flex items-center justify-center text-white font-extrabold text-xs">B</div>
              <span className="font-bold">BuzzPay</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <a href="#" className="hover:text-white transition">Privacy</a>
              <a href="#" className="hover:text-white transition">Terms</a>
              <a href="mailto:buzzpayhq@gmail.com" className="hover:text-white transition">Contact</a>
            </div>
            <p className="text-xs text-gray-600">&copy; 2026 BuzzPay Technologies</p>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient {
          animation: gradient 4s ease infinite;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.8s ease forwards;
        }
        html { scroll-behavior: smooth; }
      `}</style>
    </div>
  );
}
