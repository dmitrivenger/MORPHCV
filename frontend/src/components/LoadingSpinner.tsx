interface Props {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

const sizes = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-10 h-10 border-3',
};

export default function LoadingSpinner({ size = 'md', label }: Props) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`${sizes[size]} rounded-full border-blue-200 border-t-blue-600 animate-spin`}
        role="status"
        aria-label={label || 'Loading'}
      />
      {label && <span className="text-sm text-slate-500">{label}</span>}
    </div>
  );
}
