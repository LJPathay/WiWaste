"use client";

import * as React from "react";
import { cn } from "./utils";

function TooltipProvider({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

const TooltipContext = React.createContext<{
    open: boolean;
    setOpen: React.Dispatch<React.SetStateAction<boolean>>;
    timerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
}>({ open: false, setOpen: () => {}, timerRef: { current: null } });

function Tooltip({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = React.useState(false);
    const ref = React.useRef<HTMLDivElement>(null);
    const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    React.useEffect(() => {
        if (!open) return;
        const close = (e: MouseEvent | TouchEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                if (timerRef.current) clearTimeout(timerRef.current);
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", close);
        document.addEventListener("touchstart", close);
        return () => {
            document.removeEventListener("mousedown", close);
            document.removeEventListener("touchstart", close);
        };
    }, [open]);

    return (
        <TooltipContext.Provider value={{ open, setOpen, timerRef }}>
            <div ref={ref} className="relative inline-flex items-center">
                {children}
            </div>
        </TooltipContext.Provider>
    );
}

function TooltipTrigger({
    children,
    asChild,
    ...props
}: {
    children: React.ReactNode;
    asChild?: boolean;
    [key: string]: any;
}) {
    const { open, setOpen, timerRef } = React.useContext(TooltipContext);

    const handleToggle = (e: React.SyntheticEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const isTouch = e.nativeEvent instanceof TouchEvent;
        const next = !open;
        if (timerRef.current) clearTimeout(timerRef.current);
        setOpen(next);
        if (next && isTouch) {
            timerRef.current = setTimeout(() => setOpen(false), 10000);
        }
    };

    const sharedProps = {
        onClick: handleToggle,
        onMouseEnter: () => { if (timerRef.current) clearTimeout(timerRef.current); setOpen(true); },
        onMouseLeave: () => setOpen(false),
    };

    if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children as React.ReactElement<any>, { ...props, ...sharedProps });
    }

    return (
        <button type="button" {...props} {...sharedProps}>
            {children}
        </button>
    );
}

function TooltipContent({
    children,
    className,
    sideOffset = 4,
    ...props
}: {
    children: React.ReactNode;
    className?: string;
    sideOffset?: number;
    [key: string]: any;
}) {
    const { open } = React.useContext(TooltipContext);
    if (!open) return null;

    return (
        <div
            role="tooltip"
            className={cn(
                "absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-max max-w-xs rounded-md px-3 py-1.5 text-xs shadow-md",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
