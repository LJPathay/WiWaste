import { motion } from "motion/react";
import { ArrowRight, Box, Store, Users, Truck, CheckCircle2 } from "lucide-react";
import { Link } from "react-router";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

export function Solutions() {
    return (
        <div className="flex flex-col w-full bg-white">
            {/* Hero Section */}
            <section className="relative pt-24 pb-20 bg-gradient-to-br from-[#006a61] to-[#00423c] overflow-hidden">
                <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden">
                    <motion.div
                        animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.3, 0.5, 0.3],
                        }}
                        transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
                        className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.4)_0%,transparent_70%)] blur-3xl"
                    />
                    <motion.div
                        animate={{
                            scale: [1, 1.5, 1],
                            opacity: [0.2, 0.4, 0.2],
                        }}
                        transition={{ repeat: Infinity, duration: 10, ease: "easeInOut", delay: 1 }}
                        className="absolute top-[40%] -right-[10%] w-[50%] h-[50%] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.3)_0%,transparent_70%)] blur-3xl"
                    />
                </div>

                <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="text-center max-w-3xl mx-auto">
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="font-['Hanken_Grotesk',sans-serif] text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight"
                        >
                            Solutions for Every Link in Your Supply Chain
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="text-lg md:text-xl text-teal-100 mb-10"
                        >
                            Whether you operate a single minimart or a nationwide distribution network, LossLogic Pro adapts to secure your inventory and protect your margins.
                        </motion.p>
                    </div>
                </div>
            </section>

            {/* Target Audiences Section */}
            <section className="py-24 bg-[#fcf8fa]">
                <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center mb-24">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                        >
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-100 mb-6">
                                <Store className="w-4 h-4 text-[#006a61]" />
                                <span className="text-xs font-semibold tracking-widest text-[#006a61] uppercase">Retail Operations</span>
                            </div>
                            <h2 className="font-['Hanken_Grotesk',sans-serif] text-3xl md:text-4xl font-bold text-black mb-6">
                                Supermarkets & Independent Grocers
                            </h2>
                            <p className="text-lg text-[#45464d] mb-8">
                                Stop relying on manual stock takes that mask continuous shrinkage. Unify your POS data with receiving logs to spot exact moments when stock goes unaccounted for.
                            </p>
                            <ul className="space-y-4 mb-8">
                                <li className="flex items-start gap-3">
                                    <CheckCircle2 className="w-6 h-6 text-[#006a61] shrink-0" />
                                    <div>
                                        <strong className="text-black block mb-1">Perishable Goods Tracking</strong>
                                        <span className="text-sm text-[#45464d]">Automatically calculate expected vs. actual spoilage rates based on local weather disruptions and historical trends.</span>
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle2 className="w-6 h-6 text-[#006a61] shrink-0" />
                                    <div>
                                        <strong className="text-black block mb-1">Shift Handover Audits</strong>
                                        <span className="text-sm text-[#45464d]">Enforce accountability during employee changeovers with quick, mandatory blind cycle counts for high-risk SKUs.</span>
                                    </div>
                                </li>
                            </ul>
                            <Link to="/pricing" className="inline-flex items-center gap-2 text-[#006a61] font-semibold hover:text-[#00423c] transition-colors">
                                See retail pricing <ArrowRight className="w-4 h-4" />
                            </Link>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                            className="relative"
                        >
                            <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl border border-[#c6c6cd]">
                                <ImageWithFallback
                                    src="https://images.unsplash.com/photo-1604719312566-8912e9227c6a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZXRhaWwlMjBzdXBlcm1hcmtldCUyMGdyb2NlcnklMjBhaXNsZXxlbnwxfHx8fDE3ODA2ODU5Nzh8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                                    alt="Supermarket grocery aisle"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </motion.div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                            className="relative order-2 md:order-1"
                        >
                            <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl border border-[#c6c6cd]">
                                <ImageWithFallback
                                    src="https://images.unsplash.com/photo-1592228533283-d78f7c1cf453?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3YXJlaG91c2UlMjBpbnZlbnRvcnklMjB3b3JrZXJ8ZW58MXx8fHwxNzgwNjg1OTgyfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                                    alt="Warehouse inventory worker scanning items"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                            className="order-1 md:order-2"
                        >
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 mb-6">
                                <Truck className="w-4 h-4 text-blue-700" />
                                <span className="text-xs font-semibold tracking-widest text-blue-700 uppercase">Logistics & Warehousing</span>
                            </div>
                            <h2 className="font-['Hanken_Grotesk',sans-serif] text-3xl md:text-4xl font-bold text-black mb-6">
                                Regional Distribution Centers
                            </h2>
                            <p className="text-lg text-[#45464d] mb-8">
                                Inter-store transfers and central warehouse dispatches are common blind spots. Secure the movement of goods with end-to-end ledger updates that verify every single handoff.
                            </p>
                            <ul className="space-y-4 mb-8">
                                <li className="flex items-start gap-3">
                                    <CheckCircle2 className="w-6 h-6 text-blue-700 shrink-0" />
                                    <div>
                                        <strong className="text-black block mb-1">Transit Shrink Dashboards</strong>
                                        <span className="text-sm text-[#45464d]">Instantly detect discrepancies between items dispatched from the warehouse and items received at the storefront.</span>
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle2 className="w-6 h-6 text-blue-700 shrink-0" />
                                    <div>
                                        <strong className="text-black block mb-1">Vendor Compliance Logs</strong>
                                        <span className="text-sm text-[#45464d]">Automatically build a case for vendor credits when inbound shipments consistently fall short of the Advance Shipping Notice (ASN).</span>
                                    </div>
                                </li>
                            </ul>
                            <Link to="/pricing" className="inline-flex items-center gap-2 text-blue-700 font-semibold hover:text-blue-900 transition-colors">
                                Contact for enterprise plan <ArrowRight className="w-4 h-4" />
                            </Link>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Feature Grid */}
            <section className="py-24 bg-black text-white">
                <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <h2 className="font-['Hanken_Grotesk',sans-serif] text-3xl md:text-4xl font-bold mb-6">How LossLogic Works For You</h2>
                        <p className="text-gray-400">Our enterprise-grade tools are designed with a single goal: turning hidden operational losses into recoverable margin.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <motion.div whileHover={{ y: -10 }} className="bg-[#131b2e] border border-gray-800 p-8 rounded-2xl hover:border-[#006a61] transition-all duration-300 shadow-lg hover:shadow-[#006a61]/20">
                            <Box className="w-10 h-10 text-[#006a61] mb-6" />
                            <h3 className="text-xl font-semibold mb-3">Inventory Traceability</h3>
                            <p className="text-gray-400 text-sm">Follow the lifecycle of any item from the moment it enters your loading dock until it passes the checkout register.</p>
                        </motion.div>

                        <motion.div whileHover={{ y: -10 }} className="bg-[#131b2e] border border-gray-800 p-8 rounded-2xl hover:border-[#006a61] transition-all duration-300 shadow-lg hover:shadow-[#006a61]/20">
                            <Users className="w-10 h-10 text-[#006a61] mb-6" />
                            <h3 className="text-xl font-semibold mb-3">Role-Based Intelligence</h3>
                            <p className="text-gray-400 text-sm">Give Owner/Administrators actionable local insights while providing regional directors with macro-level loss trend reports.</p>
                        </motion.div>

                        <motion.div whileHover={{ y: -10 }} className="bg-[#131b2e] border border-gray-800 p-8 rounded-2xl hover:border-[#006a61] transition-all duration-300 shadow-lg hover:shadow-[#006a61]/20">
                            <Store className="w-10 h-10 text-[#006a61] mb-6" />
                            <h3 className="text-xl font-semibold mb-3">Multi-Branch Scaling</h3>
                            <p className="text-gray-400 text-sm">Standardize loss prevention protocols across 10 or 1,000 stores with a centralized, cloud-native architecture.</p>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 bg-white text-center">
                <div className="max-w-3xl mx-auto px-4">
                    <h2 className="font-['Hanken_Grotesk',sans-serif] text-3xl md:text-4xl font-bold text-black mb-6">Transform your operations today</h2>
                    <p className="text-lg text-[#45464d] mb-10">
                        Discover why the fastest-growing retail chains in the Philippines trust LossLogic Pro.
                    </p>
                    <Link to="/pricing" className="inline-flex bg-[#006a61] hover:bg-[#00524b] text-white px-8 py-4 rounded font-semibold text-sm tracking-wide transition-colors">
                        View Pricing & Plans
                    </Link>
                </div>
            </section>
        </div>
    );
}
