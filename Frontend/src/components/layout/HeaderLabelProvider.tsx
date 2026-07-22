import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

interface HeaderContextValue {
  setAction: (msg: string, durationMs?: number) => void;
}

const HeaderContext = createContext<HeaderContextValue>({ setAction: () => {} });

export function useHeaderAction() {
  return useContext(HeaderContext);
}

export type HeaderPhase = 'welcome' | 'tagline' | 'action' | 'idle';

interface State {
  text: string;
  phase: HeaderPhase;
  textVisible: boolean;
  logoVisible: boolean;
}

interface Props {
  welcomeName: string;
  children: (state: State) => React.ReactNode;
}

const TAGLINE = 'Enterprise Retail Solution';

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function HeaderLabelProvider({ welcomeName, children }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [state, setState] = useState<State>({
    text: `Welcome back, ${welcomeName}`,
    phase: 'welcome',
    textVisible: !prefersReducedMotion(),
    logoVisible: false,
  });

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearAll = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const after = (ms: number, fn: () => void) => {
    const t = setTimeout(fn, ms);
    timers.current.push(t);
  };

  const showText = useCallback((text: string, phase: HeaderPhase, holdMs: number, afterHold?: () => void) => {
    if (dismissed) return;
    clearAll();
    const reduced = prefersReducedMotion();
    setState(s => ({ ...s, textVisible: reduced }));
    after(reduced ? 0 : 350, () => {
      if (dismissed) return;
      setState({ text, phase, textVisible: false, logoVisible: true });
      after(50, () => {
        if (dismissed) return;
        setState(s => ({ ...s, textVisible: true }));
        if (holdMs > 0) {
          after(holdMs, () => {
            if (dismissed) return;
            setState(s => ({ ...s, textVisible: false }));
            after(reduced ? 0 : 350, () => {
              if (!dismissed) afterHold?.();
            });
          });
        }
      });
    });
  }, [dismissed]);

  const goIdle = useCallback(() => {
    if (dismissed) return;
    setState({ text: '', phase: 'idle', textVisible: false, logoVisible: true });
  }, [dismissed]);

  // On mount: welcome → 5s → tagline → 5s → idle
  useEffect(() => {
    if (dismissed) return;
    const reduced = prefersReducedMotion();
    const welcomeMs = reduced ? 0 : 5000;
    const taglineMs = reduced ? 0 : 5000;

    after(welcomeMs, () => {
      if (dismissed) return;
      setState(s => ({ ...s, textVisible: false }));
      after(reduced ? 0 : 400, () => {
        if (dismissed) return;
        setState({ text: TAGLINE, phase: 'tagline', textVisible: false, logoVisible: true });
        after(50, () => {
          if (dismissed) return;
          setState(s => ({ ...s, textVisible: true }));
          after(taglineMs, () => {
            if (dismissed) return;
            setState(s => ({ ...s, textVisible: false }));
            after(reduced ? 0 : 350, () => { if (!dismissed) goIdle(); });
          });
        });
      });
    });
    return clearAll;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dismissed]);

  const setAction = useCallback((msg: string, durationMs = 5000) => {
    if (dismissed) return;
    showText(msg, 'action', durationMs, goIdle);
  }, [showText, goIdle, dismissed]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    clearAll();
    goIdle();
  }, [goIdle]);

  return (
    <HeaderContext.Provider value={{ setAction }}>
      {children(state)}
      {!dismissed && state.phase !== 'idle' && (
        <button
          onClick={handleDismiss}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          aria-label="Dismiss header message"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </HeaderContext.Provider>
  );
}
