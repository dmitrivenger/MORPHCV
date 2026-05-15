interface Props {
  type: 'error' | 'success' | 'info' | 'warning';
  message: string;
  onDismiss?: () => void;
}

const styles = {
  error: 'bg-red-50 border-red-200 text-red-700',
  success: 'bg-green-50 border-green-200 text-green-700',
  info: 'bg-blue-50 border-blue-200 text-blue-700',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-700',
};

const icons = { error: '✕', success: '✓', info: 'ℹ', warning: '⚠' };

export default function StatusMessage({ type, message, onDismiss }: Props) {
  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-lg border text-sm ${styles[type]} animate-fade-in`}>
      <span className="font-bold mt-0.5 shrink-0">{icons[type]}</span>
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="shrink-0 opacity-50 hover:opacity-100 transition-opacity ml-2" aria-label="Dismiss">✕</button>
      )}
    </div>
  );
}
