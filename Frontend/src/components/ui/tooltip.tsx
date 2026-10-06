"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "./utils";

/**
 * Tooltips are portalled to <body> and positioned against the trigger's viewport
 * rect.
 *
 * They used to render in place, as an absolutely positioned `w-64` white panel inside
 * the trigger's own element. Inside a table cell that panel is wider than the cell, so
 * hovering an Edit / Archive / View button painted a white rectangle across the
 * neighbouring columns and made the table appear to shift. Because it was in the DOM
 * subtree it also inherited the cell's stacking context, which is what let the pinned
 * columns draw over it.
 */

function TooltipProvider({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

type Align = "center" | "start" | "end";

const TooltipContext = React.createContext<{
    open: boolean;
    setOpen: React.Dispatch<React.SetStateAction<boolean>>;
    timerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
    anchorRef: React.RefObject<HTMLDivElement | null>;
}>({
    open: false,
    setOpen: () => {},
    timerRef: { current: null },
    anchorRef: { current: null },
});

function Tooltip({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = React.useState(false);
    const anchorRef = React.useRef<HTMLDivElement>(null);
    const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    React.useEffect(() => {
        if (!open) return;
        const close = (e: MouseEvent | TouchEvent) => {
            if (anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
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

    // A portalled tooltip is positioned against viewport coordinates, so anything that
    // moves the anchor — scrolling the table, resizing the window — would otherwise
    // leave it stranded in mid-air.
    React.useEffect(() => {
        if (!open) return;
        const close = () => setOpen(false);
        window.addEventListener("scroll", close, true);
        window.addEventListener("resize", close);
        return () => {
            window.removeEventListener("scroll", close, true);
            window.removeEventListener("resize", close);
        };
    }, [open]);

    return (
        <TooltipContext.Provider value={{ open, setOpen, timerRef, anchorRef }}>
            <div ref={anchorRef} className="relative inline-flex items-center">
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
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "onMouseEnter" | "onMouseLeave">) {
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
        const child = children as React.ReactElement<React.ButtonHTMLAttributes<HTMLButtonElement>>;
        return React.cloneElement(child, {
            ...props,
            ...sharedProps,
            onClick: (e) => {
                handleToggle(e);
                child.props.onClick?.(e);
            },
            // The shared handlers take no arguments -- they only toggle state -- so the
            // mouse event is forwarded to the child's own handler alone.
            onMouseEnter: (e) => {
                sharedProps.onMouseEnter();
                child.props.onMouseEnter?.(e);
            },
            onMouseLeave: (e) => {
                sharedProps.onMouseLeave();
                child.props.onMouseLeave?.(e);
            },
        });
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
    align = "center",
    sideOffset = 8,
    ...props
}: {
    children: React.ReactNode;
    className?: string;
    sideOffset?: number;
    align?: Align;
} & React.HTMLAttributes<HTMLDivElement>) {
    const { open, anchorRef } = React.useContext(TooltipContext);
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => setMounted(true), []);

    if (!open || !mounted) return null;

    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return null;

    // Sits above the trigger by default, flipping below when there is no room.
    const spaceAbove = rect.top;
    const placeBelow = spaceAbove < 80;
    const vertical = placeBelow
        ? { top: `${rect.bottom + sideOffset}px` }
        : { bottom: `${window.innerHeight - rect.top + sideOffset}px` };

    const horizontal =
        align === "end"
            ? { right: `${Math.max(8, window.innerWidth - rect.right)}px` }
            : align === "start"
              ? { left: `${rect.left}px` }
              : {
                  left: `${rect.left + rect.width / 2}px`,
                  transform: "translateX(-50%)",
              };

    return createPortal(
        <div
            role="tooltip"
            className={cn(
                "fixed z-[9999] w-max max-w-64 rounded-md px-3 py-2 text-[11px] font-medium shadow-lg",
                "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border border-slate-700 dark:border-border",
                className
            )}
            style={{ ...vertical, ...horizontal }}
            {...props}
        >
            {children}
        </div>,
        document.body
    );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
