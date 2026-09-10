import { Link } from "react-router";
import { ArrowRight, BarChart3, AlertTriangle, ShieldCheck, Search, Package, CheckCircle, Zap, Users, Lock, Globe, Award } from "lucide-react";

export function Home() {
  return (
    <div className="flex flex-col w-full">
      {/* Hero Section */}
      <section className="relative pt-20 pb-24 overflow-hidden bg-gradient-to-b from-[#f4f7fb] via-white to-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="flex flex-col items-start lg:items-start z-10 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#006a61]/10 border border-[#006a61]/20 mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-[#006a61]"></span>
                <span className="text-xs font-semibold tracking-widest text-[#006a61] uppercase">Inventory Intelligence Platform</span>
              </div>

              <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight text-[#0F172A] dark:text-slate-50 leading-tight mb-6">
                Transform Hidden Losses
                <br />
                <span className="text-[#006a61]">into Net Profit.</span>
              </h1>

              <p className="text-base lg:text-lg text-[#475569] dark:text-slate-400 mb-8 max-w-xl leading-relaxed mx-auto lg:mx-0">
                The precision inventory intelligence platform built for Philippine minimarts and groceries. Detect anomalies, track wastage, and reclaim margins before they disappear.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4 mb-12 w-full lg:w-auto">
                <Link to="/pricing" className="inline-flex items-center justify-center gap-2 bg-[#006a61] hover:bg-[#00524b] text-white px-7 py-3.5 rounded-xl font-semibold text-sm tracking-wide transition-all shadow-sm hover:shadow-md">
                  Start Free Trial <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/pricing" className="inline-flex items-center justify-center bg-transparent border border-[#E2E8F0] dark:border-white/20 hover:bg-slate-50 dark:hover:bg-white/5 text-[#0F172A] dark:text-slate-100 px-7 py-3.5 rounded-xl font-semibold text-sm tracking-wide transition-all">
                  View Pricing
                </Link>
              </div>

              <div className="flex items-center justify-center lg:justify-start gap-6 pt-8 border-t border-[#E2E8F0] dark:border-white/10 w-full max-w-md lg:max-w-none">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-[#006a61]/10 border-2 border-white dark:border-slate-900 flex items-center justify-center text-xs font-medium text-[#006a61]">JC</div>
                  <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/30 border-2 border-white dark:border-slate-900 flex items-center justify-center text-xs font-medium text-teal-700 dark:text-teal-300">MS</div>
                  <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 border-2 border-white dark:border-slate-900 flex items-center justify-center text-xs font-medium text-amber-700 dark:text-amber-300">AR</div>
                </div>
                <div className="text-sm text-[#475569] dark:text-slate-400">
                  <span className="font-semibold text-[#0F172A] dark:text-slate-100">500+</span> retailers trust WiWaste
                </div>
              </div>
            </div>

            <div className="relative w-full z-0 flex items-center justify-center">
              <div className="relative w-full aspect-[4/3] max-w-[700px] mx-auto lg:ml-auto rounded-2xl shadow-2xl overflow-hidden border border-[#E2E8F0] dark:border-white/10 bg-white dark:bg-slate-800">
                <div className="absolute inset-0 bg-gradient-to-br from-[#006a61]/5 via-transparent to-transparent"></div>
                <div className="relative p-6 h-full flex flex-col">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="flex -space-x-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400"></div>
                      <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                      <div className="w-3 h-3 rounded-full bg-green-400"></div>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">inventory-dashboard.wiwaste.ph</span>
                  </div>
                  <div className="flex-1 grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200/50 dark:border-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Recovered Value</span>
                        <Zap className="w-4 h-4 text-[#006a61]"></Zap>
                      </div>
                      <div className="text-2xl font-bold text-[#0F172A] dark:text-slate-50">₱2.4M</div>
                      <div className="text-xs text-green-600 dark:text-green-400 mt-1">+18% vs last month</div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200/50 dark:border-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Wastage Prevented</span>
                        <ShieldCheck className="w-4 h-4 text-green-500"></ShieldCheck>
                      </div>
                      <div className="text-2xl font-bold text-[#0F172A] dark:text-slate-50">1,234</div>
                      <div className="text-xs text-green-600 dark:text-green-400 mt-1">items saved this quarter</div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200/50 dark:border-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active SKUs</span>
                        <Package className="w-4 h-4 text-[#006a61]"></Package>
                      </div>
                      <div className="text-2xl font-bold text-[#0F172A] dark:text-slate-50">8,542</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">across 12 locations</div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200/50 dark:border-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Forecast Accuracy</span>
                        <BarChart3 className="w-4 h-4 text-[#006a61]"></BarChart3>
                      </div>
                      <div className="text-2xl font-bold text-[#0F172A] dark:text-slate-50">94.2%</div>
                      <div className="text-xs text-green-600 dark:text-green-400 mt-1">demand prediction</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust/Logos Section */}
      <section className="bg-white dark:bg-slate-900 border-y border-[#E2E8F0] dark:border-white/10 py-12">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-semibold tracking-[1.2px] text-[#64748B] dark:text-slate-500 uppercase mb-8">
            Trusted by retail leaders across the Philippines
          </p>
          <div className="flex flex-wrap justify-center gap-8 md:gap-16 lg:gap-24 items-center opacity-60 hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-2 font-medium text-lg text-[#0F172A] dark:text-slate-100">
              <span className="w-5 h-5 bg-[#006a61] block rounded"></span>
              MetroMart Davao
            </div>
            <div className="flex items-center gap-2 font-medium text-lg text-[#0F172A] dark:text-slate-100">
              <span className="w-5 h-5 bg-teal-600 block rounded"></span>
              Sari-Sari Plus
            </div>
            <div className="flex items-center gap-2 font-medium text-lg text-[#0F172A] dark:text-slate-100">
              <span className="w-5 h-5 bg-amber-600 block rounded-full"></span>
              Cebu Retail Group
            </div>
            <div className="flex items-center gap-2 font-medium text-lg text-[#0F172A] dark:text-slate-100">
              <span className="w-5 h-5 bg-indigo-600 block"></span>
              Manila StockHoldings
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white dark:bg-slate-900">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-[#0F172A] dark:text-slate-50 mb-6">Precision Tools for Loss Prevention</h2>
            <p className="text-lg text-[#475569] dark:text-slate-400">
              Ditch the spreadsheets. Our platform provides a single source of truth for your inventory lifecycle, highlighting discrepancies instantly.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 - Full width on mobile, 2/3 on desktop */}
            <div className="md:col-span-2 rounded-2xl border border-[#E2E8F0] dark:border-white/10 bg-slate-50 dark:bg-slate-800/50 p-6 lg:p-8 flex flex-col lg:flex-row gap-8 overflow-hidden relative hover:border-[#006a61]/30 dark:hover:border-teal-500/30 transition-all duration-300">
              <div className="flex-1 z-10">
                <div className="w-12 h-12 rounded-xl bg-[#006a61] flex items-center justify-center mb-6 text-white">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="text-xl lg:text-2xl font-bold text-[#0F172A] dark:text-slate-50 mb-4">Real-Time Inventory Ledger</h3>
                <p className="text-[#475569] dark:text-slate-400 mb-6">
                  Continuous synchronization across all retail nodes. Instantly verify theoretical stock versus actual counts without manual reconciliation.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3 text-sm text-[#0F172A] dark:text-slate-100"><CheckCircle className="w-4 h-4 text-[#006a61]" /> API integration with POS systems</li>
                  <li className="flex items-center gap-3 text-sm text-[#0F172A] dark:text-slate-100"><CheckCircle className="w-4 h-4 text-[#006a61]" /> Immutable audit trails</li>
                  <li className="flex items-center gap-3 text-sm text-[#0F172A] dark:text-slate-100"><CheckCircle className="w-4 h-4 text-[#006a61]" /> Multi-location stock visibility</li>
                </ul>
              </div>
              <div className="flex-1 rounded-xl overflow-hidden shadow-lg border border-[#E2E8F0] dark:border-white/5 bg-slate-100 dark:bg-slate-800">
                <div className="aspect-video bg-gradient-to-br from-[#006a61]/10 to-transparent flex items-center justify-center">
                  <BarChart3 className="w-16 h-16 text-[#006a61]/30" />
                </div>
              </div>
            </div>

            {/* Feature 2 & 3 - Stacked */}
            <div className="flex flex-col gap-6">
              <div className="rounded-2xl border border-[#E2E8F0] dark:border-white/10 bg-white dark:bg-slate-800/50 p-6 shadow-sm hover:border-[#006a61]/30 dark:hover:border-teal-500/30 hover:shadow-md transition-all duration-300">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center justify-center font-bold">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded uppercase tracking-wider text-slate-500 dark:text-slate-400">Automated</span>
                </div>
                <h3 className="text-lg font-bold text-[#0F172A] dark:text-slate-50 mb-2">Wastage Log & Categorization</h3>
                <p className="text-sm text-[#475569] dark:text-slate-400">
                  Categorize and quantify unavoidable losses from weather-based spoilage or power outages instantly to maintain accurate margin calculations.
                </p>
              </div>

              <div className="rounded-2xl border border-[#E2E8F0] dark:border-white/10 bg-white dark:bg-slate-800/50 p-6 shadow-sm hover:border-[#006a61]/30 dark:hover:border-teal-500/30 hover:shadow-md transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-4">
                  <Search className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-[#0F172A] dark:text-slate-50 mb-2">Predictive Analytics & Forecasting</h3>
                <p className="text-sm text-[#475569] dark:text-slate-400">
                  Identify seasonal and typhoon-driven shrink patterns and proactive reordering signals before they impact the bottom line.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Additional Features Row */}
      <section className="py-24 bg-slate-50 dark:bg-slate-900/50 border-y border-[#E2E8F0] dark:border-white/10">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-[#0F172A] dark:text-slate-50 mb-6">Built for Philippine Retail Reality</h2>
            <p className="text-lg text-[#475569] dark:text-slate-400">
              Features designed specifically for the challenges of local minimart and grocery operations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Package, title: "FEFO Tracking", desc: "First-Expired-First-Out batch management with expiry alerts and auto-markdown suggestions.", color: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" },
              { icon: Users, title: "Multi-Store Ops", desc: "Centralized control across branches with inter-store transfers and geo-fenced receiving.", color: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" },
              { icon: Lock, title: "Vendor Reconciliation", desc: "Auto-flag discrepancies between ASN and actual received quantities with credit tracking.", color: "bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400" },
              { icon: Award, title: "Compliance Ready", desc: "BIR-ready reports, audit trails, and role-based access for regulatory peace of mind.", color: "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400" },
            ].map((feature, i) => (
              <div key={i} className="rounded-2xl border border-[#E2E8F0] dark:border-white/10 bg-white dark:bg-slate-800/50 p-6 hover:border-[#006a61]/30 dark:hover:border-teal-500/30 hover:shadow-lg transition-all duration-300">
                <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-4`}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-[#0F172A] dark:text-slate-50 mb-2">{feature.title}</h3>
                <p className="text-sm text-[#475569] dark:text-slate-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works / Deep Dive Section */}
      <section className="relative py-24 bg-[#0F172A] dark:bg-slate-950 overflow-hidden">
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-[#006a61]/10 via-transparent to-transparent"></div>
        </div>

        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">Root Cause Visibility.<br />Zero Guesswork.</h2>
              <p className="text-lg text-slate-300 mb-10 max-w-lg">
                When numbers don't align, generic dashboards aren't enough. WiWaste provides forensic drill-downs into every SKU, tracing movement from receiving dock to point-of-sale.
              </p>

              <div className="space-y-6">
                <div className="pl-4 border-l-2 border-[#006a61]">
                  <h4 className="text-lg font-semibold text-white mb-2">Vendor Reconciliation</h4>
                  <p className="text-sm text-slate-400">Automatically flag discrepancies between ASN (Advance Shipping Notice) and actual received quantities.</p>
                </div>
                <div className="pl-4 border-l-2 border-slate-700">
                  <h4 className="text-lg font-semibold text-white mb-2">Transfer Shrink Monitoring</h4>
                  <p className="text-sm text-slate-400">Monitor stock integrity during inter-store transfers with geo-fenced status updates.</p>
                </div>
                <div className="pl-4 border-l-2 border-slate-700">
                  <h4 className="text-lg font-semibold text-white mb-2">Weather-Aware Forecasting</h4>
                  <p className="text-sm text-slate-400">Typhoon and seasonal demand models trained on Philippine retail patterns.</p>
                </div>
              </div>
            </div>

            <div>
              <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-700 p-6 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                  <h5 className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Anomaly Investigation: SKU-PH-8472</h5>
                  <span className="bg-red-900/50 text-red-400 text-[10px] font-bold px-2 py-1 rounded">High Priority</span>
                </div>

                <div className="space-y-4">
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                        <Package className="w-4 h-4 text-emerald-400" />
                      </div>
                      <span className="text-sm text-slate-200">Received (Dock A)</span>
                    </div>
                    <span className="font-mono text-sm text-white">500 units</span>
                  </div>

                  <div className="w-px bg-slate-700 ml-10 h-4"></div>

                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <BarChart3 className="w-4 h-4 text-blue-400" />
                      </div>
                      <span className="text-sm text-slate-200">Sold (POS Data)</span>
                    </div>
                    <span className="font-mono text-sm text-white">482 units</span>
                  </div>

                  <div className="w-px bg-slate-700 ml-10 h-4"></div>

                  <div className="bg-red-900/20 border border-red-900/50 rounded-lg p-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                      </div>
                      <span className="text-sm text-red-400 font-medium">Unaccounted Variance</span>
                    </div>
                    <span className="font-mono text-sm text-red-400 font-bold">18 units</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-16 bg-white dark:bg-slate-900 border-y border-[#E2E8F0] dark:border-white/10">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {[
              { value: "2.4M+", label: "Pesos Recovered", icon: Zap },
              { value: "94%", label: "Forecast Accuracy", icon: BarChart3 },
              { value: "500+", label: "Active Retailers", icon: Users },
              { value: "12", label: "Locations Supported", icon: Globe },
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-xl bg-[#006a61]/10 flex items-center justify-center mb-4 text-[#006a61]">
                  <stat.icon className="w-7 h-7" />
                </div>
                <div className="text-3xl lg:text-4xl font-bold text-[#0F172A] dark:text-slate-50">{stat.value}</div>
                <div className="text-sm text-[#475569] dark:text-slate-400 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-white dark:bg-slate-900 text-center">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl lg:text-4xl font-bold text-[#0F172A] dark:text-slate-50 mb-6">Ready to secure your margins?</h2>
          <p className="text-lg text-[#475569] dark:text-slate-400 mb-10">
            Join hundreds of retail operators using WiWaste to turn inventory visibility into a competitive advantage.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/pricing" className="w-full sm:w-auto bg-[#006a61] hover:bg-[#00524b] text-white px-8 py-4 rounded-xl font-semibold text-sm tracking-wide transition-all shadow-sm hover:shadow-md">
              Request a Custom Demo
            </Link>
            <Link to="/pricing" className="w-full sm:w-auto bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-[#E2E8F0] dark:border-white/10 text-[#0F172A] dark:text-slate-100 px-8 py-4 rounded-xl font-semibold text-sm tracking-wide transition-all">
              View Pricing Plans
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-50 dark:bg-slate-950 border-t border-[#E2E8F0] dark:border-white/10 py-12">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-[#64748B] dark:text-slate-500">
            © 2025 WiWaste. Built for Philippine retail. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}