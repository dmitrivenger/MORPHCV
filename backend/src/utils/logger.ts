type LogLevel = 'info' | 'warn' | 'error' | 'debug';

function formatMessage(level: LogLevel, context: string, message: string, data?: unknown): string {
  const timestamp = new Date().toISOString();
  const dataStr = data ? ` | ${JSON.stringify(data)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] [${context}] ${message}${dataStr}`;
}

export const logger = {
  info: (context: string, message: string, data?: unknown) => {
    console.log(formatMessage('info', context, message, data));
  },
  warn: (context: string, message: string, data?: unknown) => {
    console.warn(formatMessage('warn', context, message, data));
  },
  error: (context: string, message: string, data?: unknown) => {
    console.error(formatMessage('error', context, message, data));
  },
  debug: (context: string, message: string, data?: unknown) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(formatMessage('debug', context, message, data));
    }
  },
  tokens: (context: string, inputTokens: number, outputTokens: number) => {
    const total = inputTokens + outputTokens;
    console.log(formatMessage('info', context, `Tokens used: ${total} (in: ${inputTokens}, out: ${outputTokens})`));
  },
};
