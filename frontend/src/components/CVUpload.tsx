import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { ParsedCV } from '../types';
import { extractTextFromFile, formatFileSize } from '../utils/fileHelpers';
import { parseCV } from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import StatusMessage from './StatusMessage';

interface Props {
  onCVParsed: (cv: ParsedCV) => void;
  existingCV?: ParsedCV | null;
}

export default function CVUpload({ onCVParsed, existingCV }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function processFile(file: File) {
    if (file.size > 10 * 1024 * 1024) {
      setError('File too large. Maximum size is 10MB.');
      return;
    }
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'docx', 'txt'].includes(ext || '')) {
      setError('Please upload a PDF, DOCX, or TXT file.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setUploadedFile({ name: file.name, size: file.size });
    try {
      const rawText = await extractTextFromFile(file);
      const parsed = await parseCV(rawText);
      onCVParsed(parsed);
    } catch (err) {
      console.error('CV upload error:', err);
      let msg: string;
      if (err instanceof Error) {
        msg = err.message;
      } else if (err && typeof err === 'object') {
        const e = err as Record<string, unknown>;
        msg = typeof e.message === 'string' ? e.message : JSON.stringify(err);
      } else {
        msg = String(err);
      }
      setError(msg || 'Failed to parse CV. Please try again.');
      setUploadedFile(null);
    } finally {
      setIsLoading(false);
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  const hasCV = existingCV || uploadedFile;

  return (
    <div className="space-y-4">
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer ${
          isDragging
            ? 'border-blue-500 bg-blue-100'
            : hasCV
            ? 'border-green-400 bg-green-50'
            : 'border-blue-200 hover:border-blue-400 bg-blue-50/50'
        }`}
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
        aria-label="Upload CV file"
      >
        <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt" onChange={handleFileChange} className="hidden" aria-hidden="true" />

        {isLoading ? (
          <div className="flex flex-col items-center gap-3">
            <LoadingSpinner size="lg" />
            <p className="text-slate-500 text-sm">Parsing your CV with AI...</p>
          </div>
        ) : hasCV ? (
          <div className="flex flex-col items-center gap-2">
            <div className="text-3xl">✅</div>
            <p className="text-green-700 font-medium">{uploadedFile ? uploadedFile.name : 'CV loaded'}</p>
            {uploadedFile && <p className="text-slate-400 text-xs">{formatFileSize(uploadedFile.size)}</p>}
            <p className="text-slate-400 text-xs mt-1">Click to replace</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="text-4xl opacity-40">📄</div>
            <div>
              <p className="text-slate-600 font-medium">Drop your CV here</p>
              <p className="text-slate-400 text-sm mt-1">or click to browse</p>
            </div>
            <p className="text-slate-400 text-xs">PDF, DOCX, or TXT · Max 10MB</p>
          </div>
        )}
      </div>

      {error && <StatusMessage type="error" message={error} onDismiss={() => setError(null)} />}

      {existingCV && !isLoading && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 space-y-2">
          <p className="section-label">Parsed CV Preview</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <span className="text-slate-400">Name</span>
            <span className="text-slate-700 font-medium">{existingCV.name || '—'}</span>
            <span className="text-slate-400">Email</span>
            <span className="text-slate-700">{existingCV.email || '—'}</span>
            <span className="text-slate-400">Skills</span>
            <span className="text-slate-700">{existingCV.skills?.length || 0} identified</span>
            <span className="text-slate-400">Experience</span>
            <span className="text-slate-700">{existingCV.experience?.length || 0} positions</span>
            <span className="text-slate-400">Education</span>
            <span className="text-slate-700">{existingCV.education?.length || 0} entries</span>
          </div>
        </div>
      )}
    </div>
  );
}
