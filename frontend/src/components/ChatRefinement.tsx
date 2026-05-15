import { useState, useRef, useEffect, FormEvent } from 'react';
import { ChatMessage } from '../types';
import { streamChatRefinement } from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import StatusMessage from './StatusMessage';

interface Props {
  customizedCvId: string;
  onCVUpdated: (newContent: string) => void;
}

export default function ChatRefinement({ customizedCvId, onCVUpdated }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingMessage, setStreamingMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const cancelStreamRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    sendMessage(input.trim());
  }

  function sendMessage(text: string) {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsStreaming(true);
    setStreamingMessage('');
    setError(null);

    let accumulated = '';

    const cancel = streamChatRefinement(
      customizedCvId,
      text,
      (chunk) => { accumulated += chunk; setStreamingMessage(accumulated); },
      (newCV) => { onCVUpdated(newCV); },
      () => {
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: accumulated,
          timestamp: new Date().toISOString(),
        }]);
        setStreamingMessage('');
        setIsStreaming(false);
        cancelStreamRef.current = null;
      },
      (err) => {
        setError(err.message);
        setIsStreaming(false);
        setStreamingMessage('');
        cancelStreamRef.current = null;
      }
    );
    cancelStreamRef.current = cancel;
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isStreaming) sendMessage(input.trim());
    }
  }

  const suggestions = [
    'Make the summary more concise',
    'Emphasize leadership experience',
    'Add more quantifiable metrics',
    'Reorder skills by relevance',
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-4 min-h-0 pb-4">
        {messages.length === 0 && !isStreaming && (
          <div className="space-y-3">
            <p className="text-slate-400 text-sm text-center py-4">Ask Claude to refine your CV</p>
            <div className="space-y-2">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s)}
                  disabled={isStreaming}
                  className="w-full text-left px-3 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-slate-500 hover:text-slate-700 text-xs border border-blue-100 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-50 border border-blue-100 text-slate-700'
            }`}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {streamingMessage && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed bg-blue-50 border border-blue-100 text-slate-700">
              <p className="whitespace-pre-wrap">{streamingMessage}</p>
              <span className="inline-block w-1.5 h-3.5 bg-blue-400 animate-pulse ml-0.5 align-middle" />
            </div>
          </div>
        )}

        {isStreaming && !streamingMessage && (
          <div className="flex justify-start">
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              <LoadingSpinner size="sm" label="Claude is thinking..." />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="mb-2">
          <StatusMessage type="error" message={error} onDismiss={() => setError(null)} />
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2 mt-2">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Claude to refine your CV... (Enter to send)"
          className="input-field flex-1 resize-none h-10 py-2 leading-6 max-h-32"
          disabled={isStreaming}
          rows={1}
          aria-label="Chat message"
        />
        <button type="submit" className="btn-primary shrink-0 self-end" disabled={isStreaming || !input.trim()} aria-label="Send message">
          {isStreaming ? <LoadingSpinner size="sm" /> : '↑'}
        </button>
      </form>
      <p className="text-xs text-slate-400 mt-1">Shift+Enter for new line</p>
    </div>
  );
}
