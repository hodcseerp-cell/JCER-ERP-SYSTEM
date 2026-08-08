import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  userId: string;
  role: string;
  correlationId?: string;
}

export const contextStorage = new AsyncLocalStorage<RequestContext>();
