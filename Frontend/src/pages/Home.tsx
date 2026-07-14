import { Link } from "react-router";
import { motion } from "motion/react";
import { ArrowRight, BarChart3, AlertTriangle, ShieldCheck, Search, Package } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
const imgImage = "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1080&q=80";
const imgImage1 = "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1080&q=80";

export function Home() {
    return (
        <div className="flex flex-col w-full">
            {/* Hero Section */}
            <section className="relative pt-24 pb-32 overflow-hidden bg-gradient-to-r from-[#fcf8fa] to-white">
                <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 relative">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="flex flex-col items-start z-10"
                        >
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#eae7e9] border border-[#c6c6cd] mb-8">
                                <span className="w-2 h-2 rounded-full bg-[#006a61]"></span>
                                <span className="text-xs font-semibold tracking-widest text-[#45464d] uppercase">Enterprise Retail Solution</span>
                            </div>

                            <h1 className="text-5xl lg:text-6xl font-bold tracking-tight text-black leading-tight mb-6">
                                Transform Hidden Losses <br className="hidden lg:block" />
                                <span>into </span>
                                <span className="text-[#006a61]">Net Profit.</span>
                            </h1>

                            <p className="text-lg text-[#45464d] mb-10 max-w-xl leading-relaxed">
                                The precision inventory intelligence platform built for Philippine minimarts and groceries. Detect anomalies from informal staff coordination, track wastage from weather-based demand shifts, and reclaim your margins before they disappear.
                            </p>

                            <div className="flex flex-wrap items-center gap-4 mb-12">
                                <Link to="/pricing" className="inline-flex items-center gap-2 bg-[#006a61] hover:bg-[#00524b] text-white px-8 py-4 rounded font-semibold text-sm tracking-wide transition-colors">
                                    Request Demo <ArrowRight className="w-4 h-4" />
                                </Link>
                                <Link to="/" className="inline-flex items-center justify-center bg-transparent border border-[#c6c6cd] hover:bg-gray-50 text-[#1b1b1d] px-8 py-4 rounded font-semibold text-sm tracking-wide transition-colors">
                                    Explore Platform
                                </Link>
                            </div>

                            <div className="flex items-center gap-4 pt-8 border-t border-[#c6c6cd] w-full max-w-md">
                                <div className="flex -space-x-2">
                                    <div className="w-8 h-8 rounded-full bg-[#dcd9db] border border-[#fcf8fa] flex items-center justify-center text-xs font-medium text-[#1b1b1d]">J</div>
                                    <div className="w-8 h-8 rounded-full bg-[#dcd9db] border border-[#fcf8fa] flex items-center justify-center text-xs font-medium text-[#1b1b1d]">M</div>
                                    <div className="w-8 h-8 rounded-full bg-[#dcd9db] border border-[#fcf8fa] flex items-center justify-center text-xs font-medium text-[#1b1b1d]">A</div>
                                </div>
                                <p className="text-sm text-[#45464d]">Trusted by 500+ Owner/Administrators</p>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.7, delay: 0.2 }}
                            className="relative w-full z-0 flex items-center justify-center"
                        >
                            <motion.div
                                animate={{ y: [-8, 8, -8] }}
                                transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
                                className="relative w-full aspect-[4/3] max-w-[800px] mx-auto lg:ml-auto rounded-xl shadow-2xl overflow-hidden border border-[#c6c6cd]/50 bg-white"
                            >
                                <ImageWithFallback src={imgImage} alt="LossLogic Dashboard showing recovered value and anomalies" className="w-full h-full object-cover object-left-top" />
                            </motion.div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Logos Section */}
            <section className="bg-[#f6f3f5] border-y border-[#c6c6cd] py-12">
                <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
                    <p className="text-center text-xs font-semibold tracking-[1.2px] text-[#45464d] uppercase mb-8">
                        Securing operations for local leaders
                    </p>
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="flex flex-wrap justify-center gap-12 md:gap-24 items-center"
                    >
                        <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} whileHover={{ scale: 1.05 }} className="flex items-center gap-2 font-bold text-xl text-black cursor-pointer opacity-70 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-300"><span className="w-5 h-5 bg-black block" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}></span>MetroMart Davao</motion.div>
                        <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} whileHover={{ scale: 1.05 }} className="flex items-center gap-2 font-bold text-xl text-black cursor-pointer opacity-70 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-300"><span className="w-5 h-4 bg-black block"></span>Sari-Sari Plus</motion.div>
                        <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} whileHover={{ scale: 1.05 }} className="flex items-center gap-2 font-bold text-xl text-black cursor-pointer opacity-70 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-300"><span className="w-5 h-4 bg-black rounded-full block"></span>Cebu Retail Group</motion.div>
                        <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} whileHover={{ scale: 1.05 }} className="flex items-center gap-2 font-bold text-xl text-black cursor-pointer opacity-70 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-300"><span className="w-4 h-5 bg-black block" style={{ clipPath: 'polygon(0 0, 100% 0, 80% 100%, 20% 100%)' }}></span>Manila StockHoldings</motion.div>
                    </motion.div>
                </div>
            </section>

            {/* Precision Tools Section */}
            <section id="features" className="py-24 bg-white">
                <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <h2 className="text-4xl font-bold text-black mb-6">Precision Tools for Loss Prevention</h2>
                        <p className="text-lg text-[#45464d]">
                            Ditch the spreadsheets. Our platform provides a single source of truth for your inventory lifecycle, highlighting discrepancies instantly.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            whileHover={{ y: -5 }}
                            transition={{ duration: 0.5 }}
                            className="md:col-span-2 rounded-2xl border border-[#c6c6cd]/50 bg-[#fcf8fa] p-8 flex flex-col md:flex-row gap-8 overflow-hidden relative"
                        >
                            <div className="flex-1 z-10">
                                <div className="w-10 h-10 rounded bg-[#131b2e] flex items-center justify-center mb-6 text-white">
                                    <BarChart3 className="w-5 h-5" />
                                </div>
                                <h3 className="text-2xl font-bold text-black mb-4">Real-Time Inventory Ledger</h3>
                                <p className="text-[#45464d] mb-8">
                                    Continuous synchronization across all retail nodes. Instantly verify theoretical stock versus actual counts without manual reconciliation, keeping even informal staff coordination in check.
                                </p>
                                <ul className="space-y-3">
                                    <li className="flex items-center gap-3 text-sm text-[#1b1b1d]"><ShieldCheck className="w-4 h-4 text-[#006a61]" /> API integration with POS</li>
                                    <li className="flex items-center gap-3 text-sm text-[#1b1b1d]"><ShieldCheck className="w-4 h-4 text-[#006a61]" /> Immutable audit trails</li>
                                </ul>
                            </div>
                            <div className="flex-1 rounded-xl overflow-hidden shadow-md border border-[#c6c6cd]">
                                <ImageWithFallback src="https://images.unsplash.com/photo-1666875753105-c63a6f3bdc86?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYXRhJTIwYW5hbHl0aWNzJTIwZGFzaGJvYXJkfGVufDF8fHx8MTc4MDY0MTQzMnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral" alt="Data analytics dashboard showing inventory ledger" className="w-full h-full object-cover" />
                            </div>
                        </motion.div>

                        <div className="flex flex-col gap-6">
                            <motion.div
                                initial={{ opacity: 0, x: 30 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true, margin: "-100px" }}
                                whileHover={{ y: -5 }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                                className="rounded-2xl border border-[#c6c6cd]/50 bg-white p-8 shadow-sm"
                            >
                                <div className="flex justify-between items-start mb-6">
                                    <div className="w-10 h-10 rounded bg-red-50 text-red-600 flex items-center justify-center font-bold">
                                        <AlertTriangle className="w-5 h-5" />
                                    </div>
                                    <span className="text-[10px] font-semibold bg-[#f6f3f5] px-2 py-1 rounded uppercase tracking-wider text-[#45464d]">Automated</span>
                                </div>
                                <h3 className="text-xl font-bold text-black mb-3">Wastage Log</h3>
                                <p className="text-sm text-[#45464d]">
                                    Categorize and quantify unavoidable losses from weather-based spoilage or power outages instantly to maintain accurate margin calculations.
                                </p>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, x: 30 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true, margin: "-100px" }}
                                whileHover={{ y: -5 }}
                                transition={{ duration: 0.5, delay: 0.4 }}
                                className="rounded-2xl border border-[#c6c6cd]/50 bg-white p-8 shadow-sm"
                            >
                                <div className="w-10 h-10 rounded bg-teal-50 text-teal-600 flex items-center justify-center mb-6">
                                    <Search className="w-5 h-5" />
                                </div>
                                <h3 className="text-xl font-bold text-black mb-3">Predictive Analytics</h3>
                                <p className="text-sm text-[#45464d]">
                                    Identify seasonal and typhoon-driven shrink patterns and proactive reordering signals before they impact the bottom line.
                                </p>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Deep Dive Dark Section */}
            <section className="relative py-24 bg-black overflow-hidden">
                <div className="absolute inset-0 opacity-20 pointer-events-none">
                    <ImageWithFallback src={imgImage1} alt="Abstract Background" className="w-full h-full object-cover mix-blend-overlay" />
                </div>

                <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <h2 className="text-4xl font-bold text-white mb-6">Root Cause Visibility.<br />Zero Guesswork.</h2>
                            <p className="text-lg text-gray-300 mb-10 max-w-lg">
                                When numbers don't align, generic dashboards aren't enough. LossLogic Pro provides forensic drill-downs into every SKU, tracing movement from receiving dock to point-of-sale.
                            </p>

                            <div className="space-y-8">
                                <div className="pl-4 border-l-2 border-[#006a61]">
                                    <h4 className="text-xl font-semibold text-white mb-2">Vendor Reconciliation</h4>
                                    <p className="text-sm text-gray-400">Automatically flag discrepancies between ASN (Advance Shipping Notice) and actual received quantities.</p>
                                </div>
                                <div className="pl-4 border-l-2 border-gray-700">
                                    <h4 className="text-xl font-semibold text-white mb-2">Transfer Shrink</h4>
                                    <p className="text-sm text-gray-400">Monitor stock integrity during inter-store transfers with geo-fenced status updates.</p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <div className="bg-[#131b2e]/80 backdrop-blur-md rounded-xl border border-gray-800 p-6 shadow-2xl">
                                <div className="flex justify-between items-center mb-6">
                                    <h5 className="text-xs font-semibold tracking-wider text-gray-400 uppercase">Anomaly Investigation: SKU-8472</h5>
                                    <span className="bg-red-900/50 text-red-400 text-[10px] font-bold px-2 py-1 rounded">High Priority</span>
                                </div>

                                <div className="space-y-4">
                                    <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="bg-white/5 border border-gray-700 rounded-lg p-4 flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <Search className="w-4 h-4 text-gray-400" />
                                            <span className="text-sm text-gray-200">Received (Dock A)</span>
                                        </div>
                                        <span className="font-mono text-sm text-white">500 units</span>
                                    </motion.div>

                                    <motion.div initial={{ height: 0 }} whileInView={{ height: 16 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.2 }} className="w-px bg-gray-700 ml-6"></motion.div>

                                    <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.4 }} className="bg-white/5 border border-gray-700 rounded-lg p-4 flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <Package className="w-4 h-4 text-gray-400" />
                                            <span className="text-sm text-gray-200">Sold (POS Data)</span>
                                        </div>
                                        <span className="font-mono text-sm text-white">482 units</span>
                                    </motion.div>

                                    <motion.div initial={{ height: 0 }} whileInView={{ height: 16 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.6 }} className="w-px bg-gray-700 ml-6"></motion.div>

                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        whileInView={{ opacity: 1, scale: 1 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: 0.8, type: "spring", stiffness: 200 }}
                                        className="bg-red-900/20 border border-red-900/50 rounded-lg p-4 flex justify-between items-center"
                                    >
                                        <div className="flex items-center gap-3">
                                            <AlertTriangle className="w-4 h-4 text-red-400" />
                                            <span className="text-sm text-red-400 font-medium">Unaccounted Variance</span>
                                        </div>
                                        <span className="font-mono text-sm text-red-400 font-bold">18 units</span>
                                    </motion.div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 bg-white text-center">
                <div className="max-w-3xl mx-auto px-4">
                    <h2 className="text-3xl md:text-4xl font-bold text-black mb-6">Ready to secure your margins?</h2>
                    <p className="text-lg text-[#45464d] mb-10">
                        Join hundreds of retail operators using LossLogic Pro to turn inventory visibility into a competitive advantage.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link to="/pricing" className="w-full sm:w-auto bg-[#006a61] hover:bg-[#00524b] text-white px-8 py-4 rounded font-semibold text-sm tracking-wide transition-colors">
                            Request a Custom Demo
                        </Link>
                        <Link to="/pricing" className="w-full sm:w-auto bg-[#fcf8fa] hover:bg-gray-100 border border-[#c6c6cd] text-[#1b1b1d] px-8 py-4 rounded font-semibold text-sm tracking-wide transition-colors">
                            View Pricing Plans
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
