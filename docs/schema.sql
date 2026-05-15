-- MorphCV Database Schema
-- Run this in your Supabase SQL editor

CREATE TABLE job_postings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT,
  raw_jd TEXT NOT NULL,
  parsed_json JSONB DEFAULT NULL,
  title TEXT,
  company TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_job_postings_created_at ON job_postings(created_at DESC);

CREATE TABLE customized_cvs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_posting_id UUID REFERENCES job_postings(id) ON DELETE CASCADE,
  original_cv_json JSONB NOT NULL,
  customized_content TEXT NOT NULL,
  pdf_binary BYTEA DEFAULT NULL,
  is_downloaded BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customized_cvs_created_at ON customized_cvs(created_at DESC);
CREATE INDEX idx_customized_cvs_job_posting ON customized_cvs(job_posting_id);

CREATE TABLE chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customized_cv_id UUID REFERENCES customized_cvs(id) ON DELETE CASCADE,
  message_role TEXT NOT NULL CHECK (message_role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_history_cv ON chat_history(customized_cv_id);
CREATE INDEX idx_chat_history_created_at ON chat_history(created_at DESC);
