import LoadingSpinner from './LoadingSpinner';

interface Props {
  cv: string;
  isLoading?: boolean;
  streamingText?: string;
}

function renderCVLine(line: string, index: number) {
  const trimmed = line.trim();
  if (!trimmed) return <div key={index} className="h-2" />;

  const upperLine = trimmed.toUpperCase();
  const isSectionHeader = /^[A-Z][A-Z\s&/]{3,}$/.test(upperLine) && trimmed.length < 50;
  const isBullet = trimmed.startsWith('-') || trimmed.startsWith('•');
  const isContactLine = trimmed.includes('@') || (trimmed.includes('|') && !isSectionHeader);
  const isNameLine = index === 0;

  if (isNameLine) {
    return (
      <h1 key={index} className="font-mono text-2xl font-bold text-slate-900 mb-1 tracking-tight">
        {trimmed}
      </h1>
    );
  }

  if (isContactLine && index <= 3) {
    return (
      <p key={index} className="text-slate-500 text-sm mb-3">
        {trimmed}
      </p>
    );
  }

  if (isSectionHeader) {
    return (
      <div key={index} className="mt-5 mb-2">
        <h2 className="text-slate-800 text-xs font-bold tracking-widest uppercase">
          {trimmed}
        </h2>
        <div className="h-px bg-slate-300 mt-1" />
      </div>
    );
  }

  if (isBullet) {
    const text = trimmed.replace(/^[-•]\s*/, '');
    return (
      <p
        key={index}
        className="text-slate-700 text-sm leading-relaxed"
        style={{ paddingLeft: '1.2em', textIndent: '-1.2em' }}
      >
        <span className="text-slate-500 mr-2">•</span>
        {text}
      </p>
    );
  }

  if (trimmed.includes('|')) {
    const parts = trimmed.split('|').map(p => p.trim());
    return (
      <div key={index} className="flex flex-wrap gap-x-3 text-sm mt-5">
        <span className="text-slate-900 font-semibold">{parts[0]}</span>
        {parts.slice(1).map((p, i) => (
          <span key={i} className="text-slate-500">{p}</span>
        ))}
      </div>
    );
  }

  return (
    <p key={index} className="text-slate-700 text-sm leading-relaxed">
      {trimmed}
    </p>
  );
}

export default function CVPreview({ cv, isLoading, streamingText }: Props) {
  if (isLoading && !cv && !streamingText) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <LoadingSpinner size="lg" />
        <div className="text-center">
          <p className="text-slate-600 font-medium">Claude is customizing your CV...</p>
          <p className="text-slate-400 text-sm mt-1">This takes about 10–20 seconds</p>
        </div>
      </div>
    );
  }

  const displayContent = streamingText || cv;

  if (!displayContent) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="text-4xl opacity-20 mb-3">📋</div>
        <p className="text-slate-400">Your customized CV will appear here</p>
      </div>
    );
  }

  const lines = displayContent.split('\n');

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute top-0 right-0">
          <LoadingSpinner size="sm" />
        </div>
      )}
      <div className="font-mono text-sm space-y-0.5 leading-relaxed">
        {lines.map((line, i) => renderCVLine(line, i))}
        {isLoading && (
          <span className="inline-block w-2 h-4 bg-slate-400 animate-pulse ml-1" />
        )}
      </div>
    </div>
  );
}
