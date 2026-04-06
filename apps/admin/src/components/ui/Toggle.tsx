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
      className={`relative h-6 w-11 cursor-pointer rounded-full transition-all duration-300 ease-out ${
        enabled ? 'bg-primary' : 'bg-muted'
      }`}
      style={enabled ? { boxShadow: '0 0 12px hsl(var(--primary) / 0.3)' } : undefined}
    >
      <span
        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-all duration-300 ease-out ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
        style={{ boxShadow: 'var(--shadow-sm)' }}
      />
    </button>
  );
}
