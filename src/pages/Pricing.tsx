import { motion } from "motion/react";
import { Check } from "lucide-react";
import { Link } from 'react-router';

export function Pricing() {
    return (
        <div className="flex flex-col w-full bg-[#f8f9ff]">
            {/* Header */}
            <section className="pt-24 pb-16 px-4 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <h1 className="font-['Hanken_Grotesk',sans-serif] text-4xl md:text-5xl font-bold text-[#0b1c30] mb-4">
                        Transparent Pricing for Resilient<br />Retail
                    </h1>
                    <p className="text-xl text-[#45464d] max-w-2xl mx-auto">
                        Choose the plan that fits your store's volume. Scale as you grow.
                    </p>
                </motion.div>
            </section>

            {/* Pricing Cards */}
            <section className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pb-24 relative">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end max-w-5xl mx-auto">
                    {/* Card 1 */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ y: -5 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm flex flex-col h-full"
                    >
                        <div className="mb-8">
                            <h3 className="font-['Hanken_Grotesk',sans-serif] text-2xl font-semibold text-[#0b1c30] mb-2">Sari-Sari Plus</h3>
                            <p className="text-sm text-[#45464d] mb-6">Perfect for emerging independent retailers.</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-medium text-[#0b1c30]">₱</span>
                                <span className="font-['Hanken_Grotesk',sans-serif] text-5xl font-bold text-[#0b1c30] tracking-tight">1,499</span>
                                <span className="text-sm text-[#45464d]">/mo</span>
                            </div>
                        </div>

                        <div className="flex-grow mb-8 space-y-4">
                            <div className="flex items-start gap-3">
                                <Check className="w-5 h-5 text-[#006b5f] shrink-0" />
                                <span className="text-sm text-[#0b1c30]">Up to 500 SKUs</span>
                            </div>
                            <div className="flex items-start gap-3">
                                <Check className="w-5 h-5 text-[#006b5f] shrink-0" />
                                <span className="text-sm text-[#0b1c30]">Basic Wastage Tracking</span>
                            </div>
                            <div className="flex items-start gap-3">
                                <Check className="w-5 h-5 text-[#006b5f] shrink-0" />
                                <span className="text-sm text-[#0b1c30]">Expiry Alerts</span>
                            </div>
                            <div className="flex items-start gap-3 opacity-50">
                                <div className="w-5 flex justify-center py-2 shrink-0"><div className="w-3 h-0.5 bg-gray-400"></div></div>
                                <span className="text-sm text-[#76777d]">Predictive Analytics</span>
                            </div>
                            <div className="flex items-start gap-3 opacity-50">
                                <div className="w-5 flex justify-center py-2 shrink-0"><div className="w-3 h-0.5 bg-gray-400"></div></div>
                                <span className="text-sm text-[#76777d]">Role-based access</span>
                            </div>
                        </div>

                        <Link
                            to="/register"
                            className="w-full py-3 rounded-lg border border-[#006b5f] text-[#006b5f] font-medium text-sm hover:bg-[#006b5f]/5 transition-colors text-center"
                        >
                            Start Free Trial
                        </Link>
                    </motion.div>

                    {/* Card 2 - Recommended */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ y: -8, scale: 1.02 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="bg-white rounded-xl border-t-4 border-t-[#006b5f] border-x border-b border-gray-200 p-8 shadow-xl flex flex-col h-full relative transform md:-translate-y-4 z-10"
                    >
                        <motion.div
                            animate={{ opacity: [0.3, 0.8, 0.3] }}
                            transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                            className="absolute -inset-[2px] rounded-xl border-2 border-[#006b5f] pointer-events-none opacity-50"
                        />
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#006b5f] text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-md">
                            Recommended
                        </div>
                        <div className="mb-8">
                            <h3 className="font-['Hanken_Grotesk',sans-serif] text-2xl font-semibold text-[#0b1c30] mb-2">Pro Growth</h3>
                            <p className="text-sm text-[#45464d] mb-6">For expanding operations needing deep insights.</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-medium text-[#0b1c30]">₱</span>
                                <span className="font-['Hanken_Grotesk',sans-serif] text-5xl font-bold text-[#0b1c30] tracking-tight">3,499</span>
                                <span className="text-sm text-[#45464d]">/mo</span>
                            </div>
                        </div>

                        <div className="flex-grow mb-8 space-y-4">
                            <div className="flex items-start gap-3">
                                <Check className="w-5 h-5 text-[#006b5f] shrink-0" />
                                <span className="text-sm text-[#0b1c30]">Unlimited SKUs</span>
                            </div>
                            <div className="flex items-start gap-3">
                                <Check className="w-5 h-5 text-[#006b5f] shrink-0" />
                                <span className="text-sm text-[#0b1c30]">Advanced Wastage Log</span>
                            </div>
                            <div className="flex items-start gap-3">
                                <Check className="w-5 h-5 text-[#006b5f] shrink-0" />
                                <span className="text-sm text-[#0b1c30]">Expiry Alerts</span>
                            </div>
                            <div className="flex items-start gap-3">
                                <Check className="w-5 h-5 text-[#006b5f] shrink-0" />
                                <span className="text-sm font-semibold text-[#0b1c30]">Predictive Analytics</span>
                            </div>
                            <div className="flex items-start gap-3">
                                <Check className="w-5 h-5 text-[#006b5f] shrink-0" />
                                <span className="text-sm text-[#0b1c30]">Role-based access</span>
                            </div>
                        </div>

                        <Link
                            to="/register"
                            className="w-full py-3 rounded-lg bg-black text-white font-medium text-sm hover:bg-gray-800 transition-colors text-center"
                        >
                            Get Started
                        </Link>
                    </motion.div>

                    {/* Card 3 */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ y: -5 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm flex flex-col h-full"
                    >
                        <div className="mb-8">
                            <h3 className="font-['Hanken_Grotesk',sans-serif] text-2xl font-semibold text-[#0b1c30] mb-2">Enterprise Hub</h3>
                            <p className="text-sm text-[#45464d] mb-6">Custom architecture for nationwide chains.</p>
                            <div className="flex items-baseline gap-1 mt-6">
                                <span className="text-4xl font-bold text-[#0b1c30] tracking-tight">Custom</span>
                            </div>
                        </div>

                        <div className="flex-grow mb-8 space-y-4">
                            <div className="flex items-start gap-3">
                                <Check className="w-5 h-5 text-[#006b5f] shrink-0" />
                                <span className="text-sm text-[#0b1c30]">Multi-branch Management</span>
                            </div>
                            <div className="flex items-start gap-3">
                                <Check className="w-5 h-5 text-[#006b5f] shrink-0" />
                                <span className="text-sm text-[#0b1c30]">API Access & Integrations</span>
                            </div>
                            <div className="flex items-start gap-3">
                                <Check className="w-5 h-5 text-[#006b5f] shrink-0" />
                                <span className="text-sm text-[#0b1c30]">Dedicated Support Manager</span>
                            </div>
                            <div className="flex items-start gap-3">
                                <Check className="w-5 h-5 text-[#006b5f] shrink-0" />
                                <span className="text-sm text-[#0b1c30]">Custom Reporting</span>
                            </div>
                        </div>

                        <Link
                            to="/register"
                            className="w-full py-3 rounded-lg border border-[#006b5f] text-[#006b5f] font-medium text-sm hover:bg-[#006b5f]/5 transition-colors text-center"
                        >
                            Contact Sales
                        </Link>
                    </motion.div>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="max-w-3xl mx-auto px-4 pb-24">
                <h2 className="text-3xl font-semibold text-center text-[#0b1c30] mb-12">Frequently Asked Questions</h2>

                <div className="space-y-6">
                    <div className="bg-white rounded-xl border border-gray-100 p-8 shadow-sm">
                        <h4 className="text-xl font-semibold text-[#0b1c30] mb-3">Do you fully support Philippine Peso (PHP) billing?</h4>
                        <p className="text-[#45464d] leading-relaxed">
                            Yes. All our plans are billed locally in PHP, ensuring you aren't subjected to unpredictable foreign exchange fluctuations. Invoices are fully compliant with local BIR requirements.
                        </p>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-100 p-8 shadow-sm">
                        <h4 className="text-xl font-semibold text-[#0b1c30] mb-3">Can you handle custom local implementation?</h4>
                        <p className="text-[#45464d] leading-relaxed">
                            Absolutely. For our Enterprise Hub clients, our local Manila-based team provides hands-on implementation, ensuring the system integrates smoothly with your existing regional logistics and point-of-sale systems.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}
