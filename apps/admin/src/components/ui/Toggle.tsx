'use client';

interface ToggleProps {
  enabled: boolean;
  onToggle: () => void;
}

export function Toggle({ enabled, onToggle }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative h-6 w-11 rounded-full transition-all duration-300 ease-out ${
        enabled ? 'bg-primary shadow-sm shadow-primary/30' : 'bg-muted'
      }`}
    >
      <span
        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-all duration-300 ease-out ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}
