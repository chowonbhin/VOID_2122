// Backend hand-off for onboarding answers. No backend exists yet: when VITE_ONBOARDING_API_URL is set the
// payload is POSTed there; otherwise (and on failure) it waits in a local outbox for a later sync.
import type { OnboardingPayload } from './onboardingScore';

const OUTBOX = 'ansan-explore/outbox';
const endpoint = import.meta.env.VITE_ONBOARDING_API_URL as string | undefined;

function queue(payload: OnboardingPayload): void {
  try {
    const items = JSON.parse(localStorage.getItem(OUTBOX) ?? '[]') as unknown[];
    localStorage.setItem(OUTBOX, JSON.stringify([...items, { type: 'onboarding', payload }]));
  } catch {
    // Storage full or blocked: the answers are still applied locally through the profile.
  }
}

export async function submitOnboarding(payload: OnboardingPayload): Promise<'sent' | 'queued'> {
  if (!endpoint) {
    queue(payload);
    return 'queued';
  }
  try {
    const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (response.ok) return 'sent';
  } catch {
    // fall through to the outbox
  }
  queue(payload);
  return 'queued';
}
