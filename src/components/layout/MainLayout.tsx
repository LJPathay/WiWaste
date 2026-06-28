import { Outlet, Link, useLocation } from "react-router";
import { ThemeToggle } from "../ThemeToggle";


export function MainLayout() {
    const location = useLocation();

    return (
        <div className="min-h-screen flex flex-col font-['Inter',sans-serif] bg-[#fcf8fa] text-[#1b1b1d] transition-colors dark:bg-slate-950 dark:text-slate-100">
            <header className="sticky top-0 z-50 backdrop-blur-md bg-white/85 border-b border-[#c6c6cd] transition-colors dark:border-white/10 dark:bg-slate-950/85">
                <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2">
                        <img src="/images/Logo_fullwobg.png" alt="LossLogic Pro" className="h-12 w-auto object-contain" />
                    </Link>

                    <nav className="hidden md:flex items-center gap-8">
                        <Link
                            to="/#features"
                            className={`text-sm font-medium transition-colors hover:text-[#006a61] dark:hover:text-[#7ef0cf] ${location.pathname === '/' && location.hash === '#features' ? 'text-[#006a61] dark:text-[#7ef0cf]' : 'text-[#45464d] dark:text-slate-300'}`}
                        >
                            Features
                        </Link>
                        <Link
                            to="/solutions"
                            className={`text-sm font-medium transition-colors hover:text-[#006a61] dark:hover:text-[#7ef0cf] ${location.pathname === '/solutions' ? 'text-[#006a61] dark:text-[#7ef0cf]' : 'text-[#45464d] dark:text-slate-300'}`}
                        >
                            Solutions
                        </Link>
                        <Link
                            to="/pricing"
                            className={`text-sm font-medium transition-colors hover:text-[#006a61] dark:hover:text-[#7ef0cf] ${location.pathname === '/pricing' ? 'text-[#006a61] dark:text-[#7ef0cf]' : 'text-[#45464d] dark:text-slate-300'}`}
                        >
                            Pricing
                        </Link>
                    </nav>

                    <div className="flex items-center gap-4">
                        <Link to="/login" className="hidden md:block text-sm font-medium text-[#45464d] hover:text-black dark:text-slate-300 dark:hover:text-white">
                            Login
                        </Link>
                        <Link to="/pricing" className="bg-[#131b2e] hover:bg-black text-white text-sm font-semibold px-6 py-2.5 rounded shadow-sm transition-all">
                            Request Demo
                        </Link>
                        <ThemeToggle />
                    </div>
                </div>
            </header>

            <main className="theme-content flex-grow">
                <Outlet />
            </main>

            <footer className="border-t border-[#c6c6cd] bg-[#fcf8fa] pt-16 pb-8 transition-colors dark:border-white/10 dark:bg-slate-950">
                <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                        <div className="col-span-1 md:col-span-1">
                            <Link to="/" className="flex items-center gap-2 mb-4">
                                <img src="/images/Logo_fullwobg.png" alt="WiWaste" className="h-10 w-auto object-contain" />
                            </Link>
                            <p className="text-sm text-[#45464d] max-w-xs dark:text-slate-400">
                                Inventory intelligence for all retail operations.
                            </p>
                        </div>

                        <div>
                            <h4 className="font-semibold text-sm mb-4 text-[#1b1b1d] tracking-wider uppercase dark:text-slate-100">Product</h4>
                            <ul className="space-y-3">
                                <li><Link to="/#features" className="text-sm text-[#45464d] hover:text-[#006a61] dark:text-slate-400 dark:hover:text-[#7ef0cf]">Features</Link></li>
                                <li><Link to="/solutions" className="text-sm text-[#45464d] hover:text-[#006a61] dark:text-slate-400 dark:hover:text-[#7ef0cf]">Solutions</Link></li>
                                <li><Link to="/" className="text-sm text-[#45464d] hover:text-[#006a61] dark:text-slate-400 dark:hover:text-[#7ef0cf]">Security</Link></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-semibold text-sm mb-4 text-[#1b1b1d] tracking-wider uppercase dark:text-slate-100">Company</h4>
                            <ul className="space-y-3">
                                <li><Link to="/" className="text-sm text-[#45464d] hover:text-[#006a61] dark:text-slate-400 dark:hover:text-[#7ef0cf]">About Us</Link></li>
                                <li><Link to="/" className="text-sm text-[#45464d] hover:text-[#006a61] dark:text-slate-400 dark:hover:text-[#7ef0cf]">Careers</Link></li>
                                <li><Link to="/" className="text-sm text-[#45464d] hover:text-[#006a61] dark:text-slate-400 dark:hover:text-[#7ef0cf]">Contact</Link></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-semibold text-sm mb-4 text-[#1b1b1d] tracking-wider uppercase dark:text-slate-100">Legal</h4>
                            <ul className="space-y-3">
                                <li><Link to="/" className="text-sm text-[#45464d] hover:text-[#006a61] dark:text-slate-400 dark:hover:text-[#7ef0cf]">Privacy Policy</Link></li>
                                <li><Link to="/" className="text-sm text-[#45464d] hover:text-[#006a61] dark:text-slate-400 dark:hover:text-[#7ef0cf]">Terms of Service</Link></li>
                            </ul>
                        </div>
                    </div>

                    <div className="border-t border-[#c6c6cd] pt-8 flex flex-col md:flex-row justify-between items-center gap-4 dark:border-white/10">
                        <p className="text-sm text-[#45464d] dark:text-slate-400">
                            © 2026 WiWaste. All rights reserved.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
