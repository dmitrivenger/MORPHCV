import { Response } from 'express';
import getClaude from '../config/claude';
import { ParsedCV, JobPosting, ParsedJD, ChatMessage } from '../types';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';

const MODEL = 'claude-sonnet-4-6';

const FIXED_NAME = 'Dmitri Venger';
const FIXED_CONTACT = 'Mob / WhatsApp: +44(0)7596320384 | E-mail: venger@hotmail.co.uk | London, N6 5AA, UK';
const FIXED_SUMMARY = `Senior Agile Project Manager with 8+ years delivering complex technical projects in regulated environments (fintech, digital transformation, enterprise platforms). Expertise in SAFe, Scrum, and Prince2 methodologies, with proven ability to coordinate distributed teams, manage stakeholders, and drive projects to on-time delivery.`;
const FIXED_EDUCATION = `MSc, Business School – Marketing Management | University of Kent at Canterbury | UK
BA, Criminology and Psychology | Bar Ilan University | Israel`;

const CUSTOMIZE_SYSTEM_PROMPT = `You are a professional CV optimization expert.

Your task: Reorder and rewrite the provided CV to match the job description.

Rules:
1. Reorder sections to emphasize relevant experience first
2. Reword achievements using job description keywords
3. Highlight quantifiable metrics where possible
4. Keep all factual information 100% accurate - never invent facts
5. NEVER mention project management certifications of any kind
6. The name MUST always be "Dmitri Venger" — never change it
7. The contact line MUST always be "Mob / WhatsApp: +44(0)7596320384 | E-mail: venger@hotmail.co.uk | London, N6 5AA, UK"
8. The EXECUTIVE SUMMARY must always be exactly the text shown in the output format — never rewrite it
9. The EDUCATION section must contain EXACTLY these two entries and nothing else:
   MSc, Business School – Marketing Management | University of Kent at Canterbury | UK
   BA, Criminology and Psychology | Bar Ilan University | Israel

Output Format - wrap your response EXACTLY like this:
[CUSTOMIZED_CV]
Dmitri Venger
Mob / WhatsApp: +44(0)7596320384 | E-mail: venger@hotmail.co.uk | London, N6 5AA, UK

EXECUTIVE SUMMARY
Senior Agile Project Manager with 8+ years delivering complex technical projects in regulated environments (fintech, digital transformation, enterprise platforms). Expertise in SAFe, Scrum, and Prince2 methodologies, with proven ability to coordinate distributed teams, manage stakeholders, and drive projects to on-time delivery.

CORE EXPERTISE
• Skill 1
• Skill 2
• Skill 3
[One bullet point per skill, max 15 skills, ordered by relevance to the job]

EXPERIENCE
[Most relevant role first]
Title | Company | Duration
• Achievement 1 (use JD keywords)
• Achievement 2

EDUCATION
MSc, Business School – Marketing Management | University of Kent at Canterbury | UK
BA, Criminology and Psychology | Bar Ilan University | Israel
[/CUSTOMIZED_CV]`;

const REFINE_SYSTEM_PROMPT = `You are a professional CV optimization expert helping refine a customized CV.

Rules:
- Make precise, targeted improvements based on user requests
- NEVER mention project management certifications of any kind
- The name must always be "Dmitri Venger" — never change it
- The contact line must always be "Mob / WhatsApp: +44(0)7596320384 | E-mail: venger@hotmail.co.uk | London, N6 5AA, UK"
- The EXECUTIVE SUMMARY must always be: "Senior Agile Project Manager with 8+ years delivering complex technical projects in regulated environments (fintech, digital transformation, enterprise platforms). Expertise in SAFe, Scrum, and Prince2 methodologies, with proven ability to coordinate distributed teams, manage stakeholders, and drive projects to on-time delivery."
- The EDUCATION section must always contain EXACTLY these two entries:
  MSc, Business School – Marketing Management | University of Kent at Canterbury | UK
  BA, Criminology and Psychology | Bar Ilan University | Israel
- Skills must always be listed as bullet points (one per line with • prefix)
- When returning an updated CV, wrap it in [UPDATED_CV]...[/UPDATED_CV] tags
- After the tags, give a brief explanation of what you changed`;

const PARSE_JD_PROMPT = `Extract structured information from this job description. Return ONLY valid JSON, no other text:
{
  "title": "job title",
  "company": "company name",
  "content": "brief summary of the role",
  "requirements": ["requirement 1", "requirement 2"],
  "nice_to_haves": ["nice to have 1"]
}`;

const PARSE_CV_PROMPT = `Extract structured information from this CV/resume text. Return ONLY valid JSON, no other text:
{
  "name": "full name",
  "email": "email address",
  "phone": "phone number",
  "summary": "professional summary if present",
  "skills": ["skill1", "skill2"],
  "experience": [
    {
      "title": "job title",
      "company": "company name",
      "duration": "date range",
      "description": "role description and achievements"
    }
  ],
  "education": [
    {
      "degree": "degree name",
      "school": "school name",
      "year": "graduation year"
    }
  ],
  "certifications": []
}`;

export async function parseJDWithClaude(rawText: string): Promise<ParsedJD> {
  const client = getClaude();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1000,
    messages: [{ role: 'user', content: `${PARSE_JD_PROMPT}\n\nJob Description:\n${rawText.substring(0, 4000)}` }],
  });
  logger.tokens('ParseJD', response.usage.input_tokens, response.usage.output_tokens);
  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');
    return JSON.parse(jsonMatch[0]) as ParsedJD;
  } catch {
    return { title: 'Unknown Position', company: 'Unknown Company', content: rawText.substring(0, 500), requirements: [], nice_to_haves: [] };
  }
}

export async function parseCVWithClaude(rawText: string): Promise<ParsedCV> {
  const client = getClaude();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    messages: [{ role: 'user', content: `${PARSE_CV_PROMPT}\n\nCV Text:\n${rawText.substring(0, 6000)}` }],
  });
  logger.tokens('ParseCV', response.usage.input_tokens, response.usage.output_tokens);
  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');
    return JSON.parse(jsonMatch[0]) as ParsedCV;
  } catch {
    throw new AppError('Failed to parse CV structure. Please ensure the CV has clear sections.', 422);
  }
}

export async function customizeCV(cv: ParsedCV, jd: JobPosting): Promise<string> {
  const client = getClaude();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2500,
    system: CUSTOMIZE_SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `CV (JSON format):\n${JSON.stringify(cv, null, 2)}\n\nJOB DESCRIPTION:\n${(jd.raw_jd || '').substring(0, 3000)}\n\nPlease customize this CV for this specific role.`,
    }],
  });
  logger.tokens('CustomizeCV', response.usage.input_tokens, response.usage.output_tokens);
  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const match = text.match(/\[CUSTOMIZED_CV\]([\s\S]*?)\[\/CUSTOMIZED_CV\]/);
  let content = match ? match[1].trim() : text.trim();
  // Enforce fixed education regardless of what Claude produced
  content = enforceFixedFields(content);
  return content;
}

export async function refineCVWithStream(
  cvContent: string,
  userMessage: string,
  chatHistory: ChatMessage[],
  res: Response
): Promise<{ fullResponse: string; tokensUsed: number }> {
  const client = getClaude();

  const historyMessages = chatHistory.slice(-5).map(msg => ({
    role: msg.message_role as 'user' | 'assistant',
    content: msg.content,
  }));

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    ...historyMessages,
    {
      role: 'user',
      content: `Current CV:\n${cvContent}\n\nUser request: ${userMessage}`,
    },
  ];

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 2000,
    system: REFINE_SYSTEM_PROMPT,
    messages,
  });

  let fullResponse = '';
  let inputTokens = 0;
  let outputTokens = 0;

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      fullResponse += event.delta.text;
      res.write(`data: ${JSON.stringify({ type: 'text', content: event.delta.text })}\n\n`);
    }
    if (event.type === 'message_delta' && event.usage) outputTokens = event.usage.output_tokens;
    if (event.type === 'message_start' && event.message.usage) inputTokens = event.message.usage.input_tokens;
  }

  logger.tokens('RefineCV', inputTokens, outputTokens);
  res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
  return { fullResponse, tokensUsed: inputTokens + outputTokens };
}

export function extractUpdatedCV(response: string): string | null {
  const match = response.match(/\[UPDATED_CV\]([\s\S]*?)\[\/UPDATED_CV\]/);
  if (!match) return null;
  return enforceFixedFields(match[1].trim());
}

function enforceFixedFields(content: string): string {
  const lines = content.split('\n');
  // Always fix line 0 (name) and line 1 (contact)
  if (lines.length > 0) lines[0] = FIXED_NAME;
  if (lines.length > 1) lines[1] = FIXED_CONTACT;

  let result = lines.join('\n');

  // Fix the executive summary section
  result = result.replace(
    /(EXECUTIVE SUMMARY\s*\n)([\s\S]*?)(\n[A-Z][A-Z\s&/]{3,}\n)/,
    (_m, header, _body, next) => `${header}${FIXED_SUMMARY}\n${next}`
  );

  // Fix the education section
  result = result.replace(
    /(EDUCATION\s*\n)([\s\S]*?)(\n(?:[A-Z][A-Z\s&/]{3,}|$))/,
    (_m, header, _body, after) => `${header}${FIXED_EDUCATION}${after}`
  );

  return result;
}
