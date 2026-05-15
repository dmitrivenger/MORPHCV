import getSupabase from '../config/supabase';
import { JobPosting, CustomizedCV, ChatMessage, ParsedCV, ParsedJD, HistoryItem } from '../types';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';

export async function saveJobPosting(
  rawJd: string,
  parsedJson: ParsedJD,
  url?: string
): Promise<JobPosting> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('job_postings')
    .insert({
      url: url || null,
      raw_jd: rawJd,
      parsed_json: parsedJson,
      title: parsedJson.title,
      company: parsedJson.company,
    })
    .select()
    .single();

  if (error) {
    logger.error('DB', 'Failed to save job posting', error);
    throw new AppError('Failed to save job posting', 500);
  }

  return data as JobPosting;
}

export async function getJobPosting(id: string): Promise<JobPosting> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('job_postings')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    throw new AppError('Job posting not found', 404);
  }

  return data as JobPosting;
}

export async function saveCustomizedCV(
  jobPostingId: string,
  originalCvJson: ParsedCV,
  customizedContent: string
): Promise<CustomizedCV> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('customized_cvs')
    .insert({
      job_posting_id: jobPostingId,
      original_cv_json: originalCvJson,
      customized_content: customizedContent,
    })
    .select()
    .single();

  if (error) {
    logger.error('DB', 'Failed to save customized CV', error);
    throw new AppError('Failed to save customized CV', 500);
  }

  return data as CustomizedCV;
}

export async function getCustomizedCV(id: string): Promise<CustomizedCV> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('customized_cvs')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    throw new AppError('Customized CV not found', 404);
  }

  return data as CustomizedCV;
}

export async function updateCustomizedCV(id: string, content: string): Promise<void> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from('customized_cvs')
    .update({ customized_content: content, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    logger.error('DB', 'Failed to update customized CV', error);
    throw new AppError('Failed to update CV', 500);
  }
}

export async function saveChatMessage(
  customizedCvId: string,
  role: 'user' | 'assistant',
  content: string,
  tokensUsed: number = 0
): Promise<ChatMessage> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('chat_history')
    .insert({
      customized_cv_id: customizedCvId,
      message_role: role,
      content,
      tokens_used: tokensUsed,
    })
    .select()
    .single();

  if (error) {
    logger.error('DB', 'Failed to save chat message', error);
    throw new AppError('Failed to save chat message', 500);
  }

  return data as ChatMessage;
}

export async function getChatHistory(customizedCvId: string, limit: number = 5): Promise<ChatMessage[]> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('chat_history')
    .select('*')
    .eq('customized_cv_id', customizedCvId)
    .order('created_at', { ascending: true })
    .limit(limit * 2);

  if (error) {
    logger.error('DB', 'Failed to fetch chat history', error);
    return [];
  }

  return (data || []) as ChatMessage[];
}

export async function getHistory(limit: number = 20, offset: number = 0): Promise<{ items: HistoryItem[]; total: number }> {
  const supabase = getSupabase();

  const { data, error, count } = await supabase
    .from('customized_cvs')
    .select(`
      id,
      created_at,
      job_postings (
        title,
        company,
        url
      ),
      chat_history (count)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    logger.error('DB', 'Failed to fetch history', error);
    return { items: [], total: 0 };
  }

  const items: HistoryItem[] = (data || []).map((row: Record<string, unknown>) => {
    const jobPosting = row.job_postings as { title?: string; company?: string; url?: string } | null;
    const chatArr = row.chat_history as Array<{ count: number }> | null;
    const chatCount = chatArr && chatArr.length > 0 ? (chatArr[0].count || 0) : 0;

    return {
      id: row.id as string,
      job_posting: {
        title: jobPosting?.title,
        company: jobPosting?.company,
        url: jobPosting?.url,
      },
      created_at: row.created_at as string,
      has_chat: chatCount > 0,
      chat_message_count: chatCount,
    };
  });

  return { items, total: count || 0 };
}
