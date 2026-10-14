import { Link } from "react-router";
import { ArrowRight, BarChart3, AlertTriangle, ShieldCheck, Search, Package, CheckCircle, Zap, Users, Lock, Globe, Award } from "lucide-react";

export function Home() {
  return (
    <div className="flex flex-col w-full">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#f4f7fb] via-white to-white py-12 sm:py-14 lg:py-16 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
        <div className="relative mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-8 sm:gap-10 lg:grid-cols-2 lg:gap-12">
            <div className="z-10 flex min-w-0 flex-col items-center text-center lg:items-start lg:text-left">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#006a61]/20 bg-[#006a61]/10 px-3 py-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#006a61]"></span>
                <span className="text-[10px] font-semibold tracking-wider text-[#006a61] uppercase sm:text-xs sm:tracking-widest">Inventory Intelligence Platform</span>
              </div>

              <h1 className="mb-5 text-4xl font-bold leading-[1.1] tracking-tight text-balance text-[#0F172A] sm:text-5xl xl:text-6xl dark:text-slate-50">
                Transform Hidden Losses
                <br />
                <span className="text-[#006a61]">into Net Profit.</span>
              </h1>

              <p className="mx-auto mb-6 max-w-xl text-base leading-relaxed text-[#475569] lg:mx-0 lg:text-lg dark:text-slate-400">
                The precision inventory intelligence platform built for Philippine minimarts and groceries. Detect anomalies, track wastage, and reclaim margins before they disappear.
              </p>

              <div className="mb-6 flex w-full max-w-md flex-col items-center gap-3 sm:w-auto sm:max-w-none sm:flex-row lg:mb-8">
                <Link to="/pricing" className="inline-flex w-full items-center justify-center gap-2 bg-[#006a61] hover:bg-[#00524b] text-white px-7 py-3.5 rounded-xl font-semibold text-sm tracking-wide transition-all shadow-sm hover:shadow-md sm:w-auto">
                  Start Free Trial <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/pricing" className="inline-flex w-full items-center justify-center bg-transparent border border-[#E2E8F0] dark:border-white/20 hover:bg-slate-50 dark:hover:bg-white/5 text-[#0F172A] dark:text-slate-100 px-7 py-3.5 rounded-xl font-semibold text-sm tracking-wide transition-all sm:w-auto">
                  View Pricing
                </Link>
              </div>

              <div className="flex w-full max-w-md items-center justify-center gap-3 border-t border-[#E2E8F0] pt-5 sm:gap-4 lg:max-w-none lg:justify-start dark:border-white/10">
                <div className="flex shrink-0 -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-[#006a61]/10 border-2 border-white dark:border-slate-900 flex items-center justify-center text-xs font-medium text-[#006a61]">JC</div>
                  <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/30 border-2 border-white dark:border-slate-900 flex items-center justify-center text-xs font-medium text-teal-700 dark:text-teal-300">MS</div>
                  <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 border-2 border-white dark:border-slate-900 flex items-center justify-center text-xs font-medium text-amber-700 dark:text-amber-300">AR</div>
                </div>
                <div className="text-xs text-[#475569] sm:text-sm dark:text-slate-400">
                  <span className="font-semibold text-[#0F172A] dark:text-slate-100">500+</span> retailers trust WiWaste
                </div>
              </div>
            </div>

            <div className="relative z-0 flex w-full min-w-0 items-center justify-center">
              <div className="relative mx-auto w-full max-w-xl overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-xl dark:border-white/10 dark:bg-slate-800">
                <div className="absolute inset-0 bg-gradient-to-br from-[#006a61]/5 via-transparent to-transparent"></div>
                <div className="relative flex flex-col p-4 sm:p-6">
                  <div className="mb-4 flex min-w-0 items-center gap-3 sm:mb-5">
                    <div className="flex shrink-0 gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400"></div>
                      <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                      <div className="w-3 h-3 rounded-full bg-green-400"></div>
                    </div>
                    <span className="truncate text-[10px] font-medium text-slate-500 sm:text-xs dark:text-slate-400">inventory-dashboard.wiwaste.ph</span>
                  </div>
                  <div className="grid auto-rows-fr grid-cols-2 gap-3 sm:gap-4">
                    <div className="min-w-0 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 sm:p-4 border border-slate-200/50 dark:border-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-muted-fg dark:text-muted-fg">Recovered Value</span>
                        <Zap className="w-4 h-4 text-[#006a61]"></Zap>
                      </div>
                      <div className="text-2xl font-bold text-[#0F172A] dark:text-slate-50">₱2.4M</div>
                      <div className="text-xs text-green-600 dark:text-green-400 mt-1">+18% vs last month</div>
                    </div>
                    <div className="min-w-0 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 sm:p-4 border border-slate-200/50 dark:border-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-muted-fg dark:text-muted-fg">Wastage Prevented</span>
                        <ShieldCheck className="w-4 h-4 text-green-500"></ShieldCheck>
                      </div>
                      <div className="text-2xl font-bold text-[#0F172A] dark:text-slate-50">1,234</div>
                      <div className="text-xs text-green-600 dark:text-green-400 mt-1">items saved this quarter</div>
                    </div>
                    <div className="min-w-0 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 sm:p-4 border border-slate-200/50 dark:border-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-muted-fg dark:text-muted-fg">Active SKUs</span>
                        <Package className="w-4 h-4 text-[#006a61]"></Package>
                      </div>
                      <div className="text-2xl font-bold text-[#0F172A] dark:text-slate-50">8,542</div>
                      <div className="text-xs text-muted-fg dark:text-muted-fg mt-1">across 12 locations</div>
                    </div>
                    <div className="min-w-0 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 sm:p-4 border border-slate-200/50 dark:border-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-muted-fg dark:text-muted-fg">Forecast Accuracy</span>
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
      <section className="border-y border-[#E2E8F0] bg-white py-7 sm:py-8 dark:border-white/10 dark:bg-slate-900">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
          <p className="mb-5 text-center text-xs font-semibold tracking-[1.2px] text-[#64748B] uppercase dark:text-slate-500">
            Trusted by retail leaders across the Philippines
          </p>
          <div className="grid grid-cols-2 items-center gap-x-4 gap-y-5 opacity-60 transition-opacity hover:opacity-100 sm:gap-6 lg:grid-cols-4">
            <div className="flex items-center justify-center gap-2 text-xs font-medium text-[#0F172A] sm:text-base dark:text-slate-100">
              <span className="block h-4 w-4 shrink-0 rounded bg-[#006a61] sm:h-5 sm:w-5"></span>
              MetroMart Davao
            </div>
            <div className="flex items-center justify-center gap-2 text-xs font-medium text-[#0F172A] sm:text-base dark:text-slate-100">
              <span className="block h-4 w-4 shrink-0 rounded bg-teal-600 sm:h-5 sm:w-5"></span>
              Sari-Sari Plus
            </div>
            <div className="flex items-center justify-center gap-2 text-xs font-medium text-[#0F172A] sm:text-base dark:text-slate-100">
              <span className="block h-4 w-4 shrink-0 rounded-full bg-amber-600 sm:h-5 sm:w-5"></span>
              Cebu Retail Group
            </div>
            <div className="flex items-center justify-center gap-2 text-xs font-medium text-[#0F172A] sm:text-base dark:text-slate-100">
              <span className="block h-4 w-4 shrink-0 bg-indigo-600 sm:h-5 sm:w-5"></span>
              Manila StockHoldings
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="scroll-mt-20 bg-white py-12 sm:py-16 lg:py-20 dark:bg-slate-900">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-8 max-w-3xl text-center sm:mb-10">
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-balance text-[#0F172A] lg:text-4xl dark:text-slate-50">Precision Tools for Loss Prevention</h2>
            <p className="text-base leading-relaxed text-[#475569] sm:text-lg dark:text-slate-400">
              Ditch the spreadsheets. Our platform provides a single source of truth for your inventory lifecycle, highlighting discrepancies instantly.
            </p>
          </div>

          <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {/* Inventory feature */}
            <div className="relative grid gap-5 overflow-hidden rounded-2xl border border-[#E2E8F0] bg-slate-50 p-6 transition-all duration-300 hover:border-[#006a61]/30 sm:col-span-2 sm:grid-cols-2 lg:col-span-1 lg:grid-cols-1 lg:p-7 dark:border-white/10 dark:bg-slate-800/50 dark:hover:border-teal-500/30">
              <div>
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#006a61] text-white">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="mb-3 text-lg font-bold leading-snug text-[#0F172A] dark:text-slate-50">Real-Time Inventory Ledger</h3>
                <p className="text-sm leading-relaxed text-[#475569] dark:text-slate-400">
                  Continuous synchronization across all retail nodes. Instantly verify theoretical stock versus actual counts without manual reconciliation.
                </p>
              </div>
              <ul className="space-y-2.5 sm:self-center lg:self-start">
                <li className="flex items-start gap-2.5 text-sm text-[#0F172A] dark:text-slate-100"><CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#006a61]" /> API integration with POS systems</li>
                <li className="flex items-start gap-2.5 text-sm text-[#0F172A] dark:text-slate-100"><CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#006a61]" /> Immutable audit trails</li>
                <li className="flex items-start gap-2.5 text-sm text-[#0F172A] dark:text-slate-100"><CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#006a61]" /> Multi-location stock visibility</li>
              </ul>
            </div>

            {/* Wastage feature */}
            <div className="flex flex-col rounded-2xl border border-[#E2E8F0] dark:border-white/10 bg-white dark:bg-slate-800/50 p-6 lg:p-7 shadow-sm hover:border-[#006a61]/30 dark:hover:border-teal-500/30 hover:shadow-md transition-all duration-300">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center justify-center font-bold">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded uppercase tracking-wider text-slate-500 dark:text-slate-400">Automated</span>
              </div>
              <h3 className="mb-3 text-lg font-bold leading-snug text-[#0F172A] dark:text-slate-50">Wastage Log & Categorization</h3>
              <p className="text-sm leading-relaxed text-[#475569] dark:text-slate-400">
                Categorize and quantify unavoidable losses from weather-based spoilage or power outages instantly to maintain accurate margin calculations.
              </p>
            </div>

            {/* Analytics feature */}
            <div className="flex flex-col rounded-2xl border border-[#E2E8F0] dark:border-white/10 bg-white dark:bg-slate-800/50 p-6 lg:p-7 shadow-sm hover:border-[#006a61]/30 dark:hover:border-teal-500/30 hover:shadow-md transition-all duration-300">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="mb-3 text-lg font-bold leading-snug text-[#0F172A] dark:text-slate-50">Predictive Analytics & Forecasting</h3>
              <p className="text-sm leading-relaxed text-[#475569] dark:text-slate-400">
                Identify seasonal and typhoon-driven shrink patterns and proactive reordering signals before they impact the bottom line.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Additional Features Row */}
      <section className="border-y border-[#E2E8F0] bg-slate-50 py-12 sm:py-16 lg:py-20 dark:border-white/10 dark:bg-slate-900/50">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-8 max-w-3xl text-center sm:mb-10">
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-balance text-[#0F172A] lg:text-4xl dark:text-slate-50">Built for Philippine Retail Reality</h2>
            <p className="text-base leading-relaxed text-[#475569] sm:text-lg dark:text-slate-400">
              Features designed specifically for the challenges of local minimart and grocery operations.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
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
                <p className="text-sm leading-relaxed text-[#475569] dark:text-slate-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works / Deep Dive Section */}
      <section className="relative overflow-hidden bg-[#0F172A] py-12 sm:py-16 lg:py-20 dark:bg-slate-950">
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-[#006a61]/10 via-transparent to-transparent"></div>
        </div>

        <div className="relative z-10 mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-8 sm:gap-10 lg:grid-cols-2 lg:gap-12">
            <div>
              <h2 className="mb-4 text-3xl font-bold tracking-tight text-white lg:text-4xl">Root Cause Visibility.<br />Zero Guesswork.</h2>
              <p className="mb-6 max-w-lg text-base leading-relaxed text-slate-300 sm:text-lg">
                When numbers don't align, generic dashboards aren't enough. WiWaste provides forensic drill-downs into every SKU, tracing movement from receiving dock to point-of-sale.
              </p>

              <div className="space-y-5">
                <div className="pl-4 border-l-2 border-[#006a61]">
                  <h4 className="text-lg font-semibold text-white mb-2">Vendor Reconciliation</h4>
                  <p className="text-sm text-muted-fg">Automatically flag discrepancies between ASN (Advance Shipping Notice) and actual received quantities.</p>
                </div>
                <div className="pl-4 border-l-2 border-slate-700">
                  <h4 className="text-lg font-semibold text-white mb-2">Transfer Shrink Monitoring</h4>
                  <p className="text-sm text-muted-fg">Monitor stock integrity during inter-store transfers with geo-fenced status updates.</p>
                </div>
                <div className="pl-4 border-l-2 border-slate-700">
                  <h4 className="text-lg font-semibold text-white mb-2">Weather-Aware Forecasting</h4>
                  <p className="text-sm text-muted-fg">Typhoon and seasonal demand models trained on Philippine retail patterns.</p>
                </div>
              </div>
            </div>

            <div>
              <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4 shadow-xl backdrop-blur-md sm:p-6">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <h5 className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Anomaly Investigation: SKU-PH-8472</h5>
                  <span className="bg-red-900/50 text-red-400 text-[10px] font-bold px-2 py-1 rounded">High Priority</span>
                </div>

                <div className="space-y-2 sm:space-y-3">
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-800/50 p-3 sm:p-4">
                    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20">
                        <Package className="w-4 h-4 text-emerald-400" />
                      </div>
                      <span className="text-xs text-slate-200 sm:text-sm">Received (Dock A)</span>
                    </div>
                    <span className="shrink-0 font-mono text-xs whitespace-nowrap text-white sm:text-sm">500 units</span>
                  </div>

                  <div className="ml-7 h-3 w-px bg-slate-700 sm:ml-8"></div>

                  <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-800/50 p-3 sm:p-4">
                    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/20">
                        <BarChart3 className="w-4 h-4 text-blue-400" />
                      </div>
                      <span className="text-xs text-slate-200 sm:text-sm">Sold (POS Data)</span>
                    </div>
                    <span className="shrink-0 font-mono text-xs whitespace-nowrap text-white sm:text-sm">482 units</span>
                  </div>

                  <div className="ml-7 h-3 w-px bg-slate-700 sm:ml-8"></div>

                  <div className="flex items-center justify-between gap-3 rounded-lg border border-red-900/50 bg-red-900/20 p-3 sm:p-4">
                    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/20">
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                      </div>
                      <span className="text-xs font-medium text-red-400 sm:text-sm">Unaccounted Variance</span>
                    </div>
                    <span className="shrink-0 font-mono text-xs font-bold whitespace-nowrap text-red-400 sm:text-sm">18 units</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-y border-[#E2E8F0] bg-white py-10 sm:py-12 dark:border-white/10 dark:bg-slate-900">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-6 text-center sm:gap-8 lg:grid-cols-4">
            {[
              { value: "2.4M+", label: "Pesos Recovered", icon: Zap },
              { value: "94%", label: "Forecast Accuracy", icon: BarChart3 },
              { value: "500+", label: "Active Retailers", icon: Users },
              { value: "12", label: "Locations Supported", icon: Globe },
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#006a61]/10 text-[#006a61] sm:h-12 sm:w-12">
                  <stat.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div className="text-3xl lg:text-4xl font-bold text-[#0F172A] dark:text-slate-50">{stat.value}</div>
                <div className="text-sm text-[#475569] dark:text-muted-fg mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-white py-12 text-center sm:py-16 lg:py-20 dark:bg-slate-900">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-balance text-[#0F172A] lg:text-4xl dark:text-slate-50">Ready to secure your margins?</h2>
          <p className="mb-6 text-base leading-relaxed text-[#475569] sm:text-lg dark:text-slate-400">
            Join hundreds of retail operators using WiWaste to turn inventory visibility into a competitive advantage.
          </p>
          <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-3 sm:max-w-none sm:flex-row">
            <Link to="/pricing" className="w-full sm:w-auto bg-[#006a61] hover:bg-[#00524b] text-white px-8 py-4 rounded-xl font-semibold text-sm tracking-wide transition-all shadow-sm hover:shadow-md">
              Request a Custom Demo
            </Link>
            <Link to="/pricing" className="w-full sm:w-auto bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-[#E2E8F0] dark:border-white/10 text-[#0F172A] dark:text-slate-100 px-8 py-4 rounded-xl font-semibold text-sm tracking-wide transition-all">
              View Pricing Plans
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
