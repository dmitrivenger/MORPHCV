import { ParsedCV, JobPosting } from '../types';

const KEYS = {
  CV: 'morphcv_cv',
  JOB: 'morphcv_job',
  CV_ID: 'morphcv_cv_id',
  CV_CONTENT: 'morphcv_cv_content',
};

export const storage = {
  saveCV: (cv: ParsedCV) => {
    try { sessionStorage.setItem(KEYS.CV, JSON.stringify(cv)); } catch {}
  },
  loadCV: (): ParsedCV | null => {
    try {
      const v = sessionStorage.getItem(KEYS.CV);
      return v ? JSON.parse(v) : null;
    } catch { return null; }
  },
  saveJob: (job: JobPosting) => {
    try { sessionStorage.setItem(KEYS.JOB, JSON.stringify(job)); } catch {}
  },
  loadJob: (): JobPosting | null => {
    try {
      const v = sessionStorage.getItem(KEYS.JOB);
      return v ? JSON.parse(v) : null;
    } catch { return null; }
  },
  saveCVId: (id: string) => {
    try { sessionStorage.setItem(KEYS.CV_ID, id); } catch {}
  },
  loadCVId: (): string | null => sessionStorage.getItem(KEYS.CV_ID),
  saveCVContent: (content: string) => {
    try { sessionStorage.setItem(KEYS.CV_CONTENT, content); } catch {}
  },
  loadCVContent: (): string | null => sessionStorage.getItem(KEYS.CV_CONTENT),
  clear: () => {
    Object.values(KEYS).forEach(k => sessionStorage.removeItem(k));
  },
};
