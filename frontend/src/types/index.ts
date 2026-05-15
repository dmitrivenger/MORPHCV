export interface JobPosting {
  id: string;
  url?: string;
  raw_jd: string;
  parsed_json?: ParsedJD;
  title?: string;
  company?: string;
  created_at: string;
}

export interface ParsedJD {
  title: string;
  company: string;
  content: string;
  requirements: string[];
  nice_to_haves: string[];
}

export interface ParsedCV {
  name: string;
  email: string;
  phone: string;
  summary?: string;
  skills: string[];
  experience: ExperienceEntry[];
  education: EducationEntry[];
  certifications?: string[];
}

export interface ExperienceEntry {
  title: string;
  company: string;
  duration: string;
  description: string;
}

export interface EducationEntry {
  degree: string;
  school: string;
  year: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface HistoryItem {
  id: string;
  job_posting: {
    title?: string;
    company?: string;
    url?: string;
  };
  created_at: string;
  has_chat: boolean;
  chat_message_count: number;
}

export type AppStep = 'upload' | 'job' | 'customize' | 'refine';
