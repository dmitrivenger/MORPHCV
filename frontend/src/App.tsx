import { useState, useCallback } from 'react';
import { ParsedCV, JobPosting, AppStep } from './types';
import { customizeCV as apiCustomizeCV } from './services/api';
import { storage } from './services/storage';
import CVUpload from './components/CVUpload';
import JobInput from './components/JobInput';
import CVPreview from './components/CVPreview';
import ChatRefinement from './components/ChatRefinement';
import ExportPDF from './components/ExportPDF';
import StatusMessage from './components/StatusMessage';
import LoadingSpinner from './components/LoadingSpinner';

const STEPS: { id: AppStep; label: string; number: number }[] = [
  { id: 'upload', label: 'Upload CV', number: 1 },
  { id: 'job', label: 'Job Details', number: 2 },
  { id: 'customize', label: 'Customize', number: 3 },
  { id: 'refine', label: 'Refine & Export', number: 4 },
];

export default function App() {
  const [step, setStep] = useState<AppStep>('upload');
  const [cv, setCV] = useState<ParsedCV | null>(null);
  const [job, setJob] = useState<JobPosting | null>(null);
  const [customizedCvId, setCustomizedCvId] = useState<string | null>(null);
  const [customizedContent, setCustomizedContent] = useState<string>('');
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [customizeError, setCustomizeError] = useState<string | null>(null);

  const handleCVParsed = useCallback((parsed: ParsedCV) => {
    setCV(parsed);
    storage.saveCV(parsed);
    setStep('job');
  }, []);

  const handleJobFetched = useCallback((fetchedJob: JobPosting) => {
    setJob(fetchedJob);
    storage.saveJob(fetchedJob);
    setStep('customize');
  }, []);

  async function handleCustomize() {
    if (!cv || !job) return;
    setIsCustomizing(true);
    setCustomizeError(null);
    setCustomizedContent('');
    setStep('customize');

    try {
      const result = await apiCustomizeCV({
        job_posting_id: job.id,
        cv_parsed: cv,
      });
      setCustomizedCvId(result.customized_cv_id);
      setCustomizedContent(result.customized_content);
      storage.saveCVId(result.customized_cv_id);
      storage.saveCVContent(result.customized_content);
      setStep('refine');
    } catch (err) {
      setCustomizeError((err as Error).message || 'Failed to customize CV. Please try again.');
    } finally {
      setIsCustomizing(false);
    }
  }

  function handleCVUpdated(newContent: string) {
    setCustomizedContent(newContent);
    storage.saveCVContent(newContent);
  }

  function handleNewJob() {
    setJob(null);
    setCustomizedCvId(null);
    setCustomizedContent('');
    setCustomizeError(null);
    storage.saveJob(null as unknown as JobPosting);
    storage.saveCVId('');
    storage.saveCVContent('');
    setStep('job');
  }

  function handleNewCV() {
    setStep('upload');
    setCV(null);
    setJob(null);
    setCustomizedCvId(null);
    setCustomizedContent('');
    setCustomizeError(null);
    storage.clear();
  }

  const currentStepIndex = STEPS.findIndex(s => s.id === step);

  return (
    <div className="min-h-screen bg-blue-50 text-slate-800">
      {/* Header */}
      <header className="border-b border-blue-200 bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="font-mono text-xl font-bold text-slate-800">
              <span className="text-blue-600">Morph</span>CV
            </div>
            <span className="hidden sm:block text-slate-400 text-sm">AI CV Optimizer</span>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center">
                <div
                  className={`step-badge text-xs font-bold transition-all ${
                    i < currentStepIndex
                      ? 'bg-blue-600 text-white'
                      : i === currentStepIndex
                      ? 'bg-blue-500 text-white ring-2 ring-blue-300'
                      : 'bg-blue-100 text-blue-400'
                  }`}
                >
                  {i < currentStepIndex ? '✓' : s.number}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`hidden sm:block w-8 h-px mx-1 ${i < currentStepIndex ? 'bg-blue-500' : 'bg-blue-200'}`} />
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-1">
            {cv && step !== 'upload' && (
              <button onClick={handleNewJob} className="btn-ghost text-xs">New Job</button>
            )}
            <button onClick={handleNewCV} className="btn-ghost text-xs">New CV</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Steps 1 & 2 */}
        {(step === 'upload' || step === 'job') && (
          <div className="max-w-2xl mx-auto space-y-6 animate-slide-up">
            <div className={`card transition-all duration-300 ${step === 'job' ? 'opacity-60' : ''}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`step-badge text-xs font-bold ${cv ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-500'}`}>
                  {cv ? '✓' : '1'}
                </div>
                <div>
                  <h2 className="font-semibold text-slate-700">Upload Your CV</h2>
                  <p className="text-slate-400 text-xs">PDF, DOCX, or TXT format</p>
                </div>
              </div>
              <CVUpload onCVParsed={handleCVParsed} existingCV={cv} />
            </div>

            {(step === 'job' || cv) && (
              <div className={`card animate-slide-up ${step === 'upload' ? 'opacity-40 pointer-events-none' : ''}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`step-badge text-xs font-bold ${job ? 'bg-blue-600 text-white' : step === 'job' ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-400'}`}>
                    {job ? '✓' : '2'}
                  </div>
                  <div>
                    <h2 className="font-semibold text-slate-700">Provide Job Description</h2>
                    <p className="text-slate-400 text-xs">URL or paste text</p>
                  </div>
                </div>
                <JobInput onJobFetched={handleJobFetched} existingJob={job} />
              </div>
            )}
          </div>
        )}

        {/* Step 3: Customize */}
        {step === 'customize' && (
          <div className="max-w-2xl mx-auto animate-slide-up">
            <div className="card">
              <div className="flex items-center gap-3 mb-6">
                <div className="step-badge text-xs font-bold bg-blue-500 text-white">3</div>
                <div>
                  <h2 className="font-semibold text-slate-700">Generate Customized CV</h2>
                  <p className="text-slate-400 text-xs">
                    Claude will tailor your CV for{' '}
                    <strong className="text-slate-600">{job?.parsed_json?.title || 'this role'}</strong>
                    {job?.parsed_json?.company && ` at ${job.parsed_json.company}`}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                  <p className="section-label mb-1">Your CV</p>
                  <p className="text-slate-700 font-medium">{cv?.name}</p>
                  <p className="text-slate-400 text-xs">{cv?.experience?.length || 0} positions · {cv?.skills?.length || 0} skills</p>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                  <p className="section-label mb-1">Target Role</p>
                  <p className="text-slate-700 font-medium">{job?.parsed_json?.title || '—'}</p>
                  <p className="text-slate-400 text-xs">{job?.parsed_json?.company || '—'}</p>
                </div>
              </div>

              {customizeError && (
                <div className="mb-4">
                  <StatusMessage type="error" message={customizeError} onDismiss={() => setCustomizeError(null)} />
                </div>
              )}

              <button onClick={handleCustomize} disabled={isCustomizing} className="btn-primary w-full justify-center text-base py-3">
                {isCustomizing ? (
                  <><LoadingSpinner size="sm" />Claude is tailoring your CV...</>
                ) : (
                  '✨ Generate Customized CV'
                )}
              </button>

              {isCustomizing && (
                <p className="text-slate-400 text-xs text-center mt-3">
                  This takes 10–20 seconds. Claude is analysing your CV and the job requirements.
                </p>
              )}

              <div className="flex gap-2 mt-4">
                <button onClick={handleNewCV} className="btn-ghost text-xs">← New CV</button>
                <button onClick={handleNewJob} className="btn-ghost text-xs">← Change Job</button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Refine & Export */}
        {step === 'refine' && customizedCvId && (
          <div className="animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="step-badge text-xs font-bold bg-blue-500 text-white">4</div>
                <div>
                  <h2 className="font-semibold text-slate-700">Refine & Export</h2>
                  <p className="text-slate-400 text-xs">Chat to refine, then download your PDF</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setStep('customize')} className="btn-ghost text-xs">← Re-generate</button>
                <button onClick={handleNewJob} className="btn-ghost text-xs">New Job</button>
                <button onClick={handleNewCV} className="btn-ghost text-xs">New CV</button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: CV Preview */}
              <div className="card overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-700 text-sm">Customized CV Preview</h3>
                  <span className="text-xs text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                    {job?.parsed_json?.title || 'Tailored'}
                  </span>
                </div>
                <div className="overflow-y-auto max-h-[600px] pr-1">
                  <CVPreview cv={customizedContent} isLoading={isCustomizing} />
                </div>
                <div className="mt-4 pt-4 border-t border-blue-100">
                  <ExportPDF customizedCvId={customizedCvId} cvName={cv?.name} />
                </div>
              </div>

              {/* Right: Chat */}
              <div className="card flex flex-col" style={{ height: '700px' }}>
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="font-semibold text-slate-700 text-sm">Refine with Claude</h3>
                  <span className="text-xs text-blue-600 bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-full">
                    AI Chat
                  </span>
                </div>
                <div className="flex-1 overflow-hidden">
                  <ChatRefinement customizedCvId={customizedCvId} onCVUpdated={handleCVUpdated} />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-blue-200 mt-16 py-6 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-slate-400 text-xs">MorphCV — Powered by Claude AI · Personal CV optimization tool</p>
        </div>
      </footer>
    </div>
  );
}
