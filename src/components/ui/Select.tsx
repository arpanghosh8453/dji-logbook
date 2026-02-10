/**
 * Custom themed Select dropdown that works properly in both dark and light themes.
 * Supports filtering by typing — text is discarded on blur if no match is selected.
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  className?: string;
}

export function Select({ value, onChange, options, className = '' }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedLabel = options.find((o) => o.value === value)?.label ?? value;

  const close = useCallback(() => {
    setIsOpen(false);
    setSearch('');
  }, []);

  // Filtered options based on search term
  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const lower = search.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(lower));
  }, [options, search]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, close]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, close]);

  // Focus input when opening & scroll selected into view
  useEffect(() => {
    if (isOpen) {
      // Small delay to let the DOM render
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        if (listRef.current) {
          const active = listRef.current.querySelector('[data-active="true"]');
          if (active) active.scrollIntoView({ block: 'nearest' });
        }
      });
    }
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="themed-select-trigger w-full text-left flex items-center justify-between"
      >
        <span className="truncate">{selectedLabel}</span>
        <svg
          className={`w-3.5 h-3.5 ml-1 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <polyline points="6 9 12 15 18 9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border shadow-xl themed-select-dropdown">
          {/* Search input */}
          <div className="px-2 py-1.5 border-b border-gray-700/50">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && filteredOptions.length > 0) {
                  onChange(filteredOptions[0].value);
                  close();
                }
              }}
              placeholder="Type to filter…"
              className="w-full bg-transparent text-sm text-gray-200 placeholder-gray-500 outline-none"
            />
          </div>
          {/* Options list */}
          <div ref={listRef} className="max-h-48 overflow-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-xs text-gray-500 italic">No matches</div>
            ) : (
              filteredOptions.map((opt) => (
                <div
                  key={opt.value}
                  data-active={opt.value === value}
                  onClick={() => {
                    onChange(opt.value);
                    close();
                  }}
                  className={`themed-select-option cursor-pointer px-3 py-1.5 text-sm truncate
                    ${opt.value === value ? 'font-medium' : ''}`}
                >
                  {opt.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
