import axios from 'axios';
import { ParsedCV, JobPosting } from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '60000', 10),
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  res => res,
  err => {
    const message = err.response?.data?.error || err.message || 'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);

export async function fetchJobDescription(params: {
  url?: string;
  raw_text?: string;
}): Promise<JobPosting> {
  const { data } = await api.post('/jd/fetch', params);
  return data;
}

export async function parseCV(rawText: string): Promise<ParsedCV> {
  const { data } = await api.post('/cv/parse', { raw_text: rawText });
  return data;
}

export async function customizeCV(params: {
  job_posting_id: string;
  cv_parsed: ParsedCV;
}): Promise<{ customized_cv_id: string; customized_content: string; created_at: string }> {
  const { data } = await api.post('/customize', params);
  return data;
}

export async function exportPDF(customizedCvId: string): Promise<Blob> {
  const { data } = await api.post(
    '/export-pdf',
    { customized_cv_id: customizedCvId },
    { responseType: 'blob' }
  );
  return data;
}

export async function fetchHistory(limit = 20, offset = 0) {
  const { data } = await api.get('/history', { params: { limit, offset } });
  return data;
}

export function streamChatRefinement(
  customizedCvId: string,
  userMessage: string,
  onText: (text: string) => void,
  onCVUpdate: (cv: string) => void,
  onDone: () => void,
  onError: (err: Error) => void
): () => void {
  const baseUrl = import.meta.env.VITE_API_URL || '';
  const url = `${baseUrl}/api/chat`;

  const controller = new AbortController();

  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customized_cv_id: customizedCvId, user_message: userMessage }),
    signal: controller.signal,
  })
    .then(async res => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || 'Chat request failed');
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(line.slice(6));
              if (parsed.type === 'text') onText(parsed.content);
              if (parsed.type === 'cv_updated') onCVUpdate(parsed.content);
              if (parsed.type === 'done') onDone();
            } catch {
              // ignore parse errors for partial chunks
            }
          }
        }
      }
      onDone();
    })
    .catch(err => {
      if (err.name !== 'AbortError') onError(err);
    });

  return () => controller.abort();
}

export default api;
