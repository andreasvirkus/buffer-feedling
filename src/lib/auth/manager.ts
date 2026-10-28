import { refreshViaSite } from './refresh';
import { chromeTokenStore, createTokenManager } from './tokens';

export const tokenManager = createTokenManager({ store: chromeTokenStore, refresh: refreshViaSite });
