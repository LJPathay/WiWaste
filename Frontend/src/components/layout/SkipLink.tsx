import React from 'react';

interface SkipLinkProps {
  targets: Array<{ id: string; label: string }>;
}

export function SkipLink({ targets }: SkipLinkProps) {
  return (
    <nav aria-label="Skip links" className="sr-only focus-within:not-sr-only fixed top-4 left-4 z-[100] w-full">
      <ul className="flex flex-col gap-2 p-4" role="list">
        {targets.map((target) => (
          <li key={target.id}>
            <a
              href={`#${target.id}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg shadow-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
              <span>Skip to {target.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}