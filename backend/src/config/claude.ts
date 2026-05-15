import Anthropic from '@anthropic-ai/sdk';
import { config } from './env';

let claudeInstance: Anthropic | null = null;

export function getClaude(): Anthropic {
  if (!claudeInstance) {
    if (!config.anthropic.apiKey) {
      throw new Error('Claude API key missing. Set ANTHROPIC_API_KEY.');
    }
    claudeInstance = new Anthropic({
      apiKey: config.anthropic.apiKey,
    });
  }
  return claudeInstance;
}

export default getClaude;
