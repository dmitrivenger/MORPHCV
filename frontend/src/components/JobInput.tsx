import { useState, FormEvent } from 'react';
import { JobPosting } from '../types';
import { fetchJobDescription } from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import StatusMessage from './StatusMessage';

interface Props {
  onJobFetched: (job: JobPosting) => void;
  existingJob?: JobPosting | null;
}

export default function JobInput({ onJobFetched, existingJob }: Props) {
  const [url, setUrl] = useState('');
  const [rawText, setRawText] = useState('');
  const [activeTab, setActiveTab] = useState<'url' | 'text'>('url');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const hasUrl = url.trim().length > 0;
    const hasText = rawText.trim().length > 0;
    if (!hasUrl && !hasText) {
      setError('Please provide a job URL or paste the job description text.');
      return;
    }
    setIsLoading(true);
    try {
      const job = await fetchJobDescription({
        url: hasUrl ? url.trim() : undefined,
        raw_text: !hasUrl && hasText ? rawText.trim() : undefined,
      });
      onJobFetched(job);
    } catch (err) {
      const message = (err as Error).message;
      if (message.includes('scrape') || message.includes('422')) {
        setError(`URL scraping failed. Please switch to "Paste Text" and paste the job description manually.`);
        setActiveTab('text');
      } else {
        setError(message || 'Failed to fetch job description. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-blue-50 border border-blue-100 rounded-lg p-1">
        <button
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
            activeTab === 'url' ? 'bg-white shadow-sm text-slate-700 border border-blue-100' : 'text-slate-500 hover:text-slate-700'
          }`}
          onClick={() => setActiveTab('url')}
          type="button"
        >
          Paste URL
        </button>
        <button
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
            activeTab === 'text' ? 'bg-white shadow-sm text-slate-700 border border-blue-100' : 'text-slate-500 hover:text-slate-700'
          }`}
          onClick={() => setActiveTab('text')}
          type="button"
        >
          Paste Text
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {activeTab === 'url' ? (
          <div className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://linkedin.com/jobs/view/..."
              className="input-field flex-1"
              disabled={isLoading}
              aria-label="Job posting URL"
            />
            <button type="submit" className="btn-primary shrink-0" disabled={isLoading || !url.trim()}>
              {isLoading ? <LoadingSpinner size="sm" /> : null}
              {isLoading ? 'Fetching...' : 'Fetch'}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <textarea
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              placeholder="Paste the full job description here..."
              className="input-field h-40 resize-none"
              disabled={isLoading}
              aria-label="Job description text"
            />
            <button
              type="submit"
              className="btn-primary w-full justify-center"
              disabled={isLoading || rawText.trim().length < 50}
            >
              {isLoading ? <LoadingSpinner size="sm" /> : null}
              {isLoading ? 'Parsing...' : 'Parse Job Description'}
            </button>
          </div>
        )}
      </form>

      {error && <StatusMessage type="error" message={error} onDismiss={() => setError(null)} />}

      {existingJob && !isLoading && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 space-y-2 animate-fade-in">
          <p className="section-label">Parsed Job</p>
          <div className="space-y-1 text-sm">
            <div className="flex gap-3">
              <span className="text-slate-400 w-20 shrink-0">Title</span>
              <span className="text-slate-700 font-medium">{existingJob.parsed_json?.title || '—'}</span>
            </div>
            <div className="flex gap-3">
              <span className="text-slate-400 w-20 shrink-0">Company</span>
              <span className="text-slate-700">{existingJob.parsed_json?.company || '—'}</span>
            </div>
            <div className="flex gap-3">
              <span className="text-slate-400 w-20 shrink-0">Requirements</span>
              <span className="text-slate-700">{existingJob.parsed_json?.requirements?.length || 0} identified</span>
            </div>
          </div>
          {existingJob.parsed_json?.requirements && existingJob.parsed_json.requirements.length > 0 && (
            <div className="mt-2">
              <p className="section-label mb-1">Key Requirements</p>
              <ul className="space-y-0.5">
                {existingJob.parsed_json.requirements.slice(0, 5).map((req, i) => (
                  <li key={i} className="text-xs text-slate-500 flex gap-2">
                    <span className="text-blue-500 shrink-0">•</span>
                    <span>{req}</span>
                  </li>
                ))}
                {existingJob.parsed_json.requirements.length > 5 && (
                  <li className="text-xs text-slate-400">+{existingJob.parsed_json.requirements.length - 5} more...</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
