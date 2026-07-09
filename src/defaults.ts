/** Local dev default — probed first during setup. */
export const DEFAULT_BACKEND_URL = 'http://localhost:3000';

/** Hosted MVP API — used when local backend is not reachable. */
export const FALLBACK_BACKEND_URL = 'http://206.189.229.113:3000';

/** AgentPay Android app (alpha APK) — required for WalletConnect pairing and payment approvals. */
export const ANDROID_APK_URL = 'https://rafaelekol.github.io/agentpay/agentPay.apk';
