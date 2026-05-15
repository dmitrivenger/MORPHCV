import { useState } from 'react';
import { exportPDF } from '../services/api';
import { downloadBlob } from '../utils/fileHelpers';
import LoadingSpinner from './LoadingSpinner';
import StatusMessage from './StatusMessage';

interface Props {
  customizedCvId: string;
  cvName?: string;
}

export default function ExportPDF({ customizedCvId, cvName }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleExport() {
    setIsLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const blob = await exportPDF(customizedCvId);
      const filename = cvName ? `${cvName.replace(/\s+/g, '_')}_CV.pdf` : 'Customized_CV.pdf';
      downloadBlob(blob, filename);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError((err as Error).message || 'Failed to generate PDF. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <button onClick={handleExport} disabled={isLoading} className="btn-primary w-full justify-center text-base py-3" aria-label="Download customized CV as PDF">
        {isLoading ? (
          <><LoadingSpinner size="sm" />Generating PDF...</>
        ) : success ? (
          <>✓ Downloaded!</>
        ) : (
          <>⬇ Download PDF</>
        )}
      </button>
      {cvName && !isLoading && (
        <p className="text-xs text-slate-400 text-center">{cvName.replace(/\s+/g, '_')}_CV.pdf</p>
      )}
      {error && <StatusMessage type="error" message={error} onDismiss={() => setError(null)} />}
      {success && <StatusMessage type="success" message="PDF downloaded successfully!" onDismiss={() => setSuccess(false)} />}
    </div>
  );
}
