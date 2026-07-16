import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

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
  textVisible: boolean;  // controls slide+fade of the text
  logoVisible: boolean;  // controls fade of the logo
}

interface Props {
  welcomeName: string;
  children: (state: State) => React.ReactNode;
}

const TAGLINE = 'Enterprise Retail Solution';

export function HeaderLabelProvider({ welcomeName, children }: Props) {
  const [state, setState] = useState<State>({
    text: `Welcome back, ${welcomeName}`,
    phase: 'welcome',
    textVisible: true,
    logoVisible: false, // logo hidden during welcome
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

  // Slide text out, swap text, slide back in, then optionally hold and return to idle
  const showText = useCallback((text: string, phase: HeaderPhase, holdMs: number, afterHold?: () => void) => {
    clearAll();
    // 1. slide current text out
    setState(s => ({ ...s, textVisible: false }));
    after(350, () => {
      // 2. swap text + phase, bring logo in if not already
      setState({ text, phase, textVisible: false, logoVisible: true });
      after(50, () => {
        // 3. slide new text in
        setState(s => ({ ...s, textVisible: true }));
        if (holdMs > 0) {
          after(holdMs, () => {
            // 4. slide text out
            setState(s => ({ ...s, textVisible: false }));
            after(350, () => {
              afterHold?.();
            });
          });
        }
      });
    });
  }, []);

  const goIdle = useCallback(() => {
    setState({ text: '', phase: 'idle', textVisible: false, logoVisible: true });
  }, []);

  // On mount: welcome text visible (no logo), after 15s → fade welcome → show tagline → 10s → idle
  useEffect(() => {
    after(15000, () => {
      // fade out welcome text + fade in logo simultaneously
      setState(s => ({ ...s, textVisible: false }));
      after(400, () => {
        setState({ text: TAGLINE, phase: 'tagline', textVisible: false, logoVisible: true });
        after(50, () => {
          setState(s => ({ ...s, textVisible: true }));
          after(10000, () => {
            setState(s => ({ ...s, textVisible: false }));
            after(350, goIdle);
          });
        });
      });
    });
    return clearAll;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setAction = useCallback((msg: string, durationMs = 10000) => {
    showText(msg, 'action', durationMs, goIdle);
  }, [showText, goIdle]);

  return (
    <HeaderContext.Provider value={{ setAction }}>
      {children(state)}
    </HeaderContext.Provider>
  );
}
