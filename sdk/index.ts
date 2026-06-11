import axios from 'axios';
import {
  AgentPayError,
  NO_ACTIVE_SESSION_MESSAGE,
  PAYMENT_REJECTED_MESSAGE,
  WC_SESSION_DEAD_MESSAGE,
  type AgentPayErrorCode
} from './errors';

export type AgentPayOptions = {
    /** e.g. http://localhost:3000 — `/v1` is appended automatically */
    baseUrl?: string;
    /** Optional bearer token sent to the backend */
    apiKey?: string;
};

function mapBackendCode(code: unknown): AgentPayErrorCode {
    const c = String(code ?? '').toUpperCase();
    if (c === 'PAYMENT_REJECTED') return 'PAYMENT_REJECTED';
    if (c === 'NO_ACTIVE_SESSION') return 'NO_ACTIVE_SESSION';
    if (c === 'WC_SESSION_DEAD') return 'WC_SESSION_DEAD';
    if (c === 'SIGNING_FAILED') return 'SIGNING_FAILED';
    return 'UNKNOWN';
}

function messageForCode(code: AgentPayErrorCode, fallback: string): string {
    switch (code) {
        case 'PAYMENT_REJECTED':
            return PAYMENT_REJECTED_MESSAGE;
        case 'NO_ACTIVE_SESSION':
            return NO_ACTIVE_SESSION_MESSAGE;
        case 'WC_SESSION_DEAD':
            return WC_SESSION_DEAD_MESSAGE;
        default:
            return fallback;
    }
}

function inferCodeFromMessage(errMsg: string, status?: number): AgentPayErrorCode {
    const m = errMsg.toLowerCase();
    if (status === 402 || m.includes('payment rejected')) return 'PAYMENT_REJECTED';
    if (m.includes('session dead on relay')) return 'WC_SESSION_DEAD';
    if (status === 409 || m.includes('no active session')) return 'NO_ACTIVE_SESSION';
    if (
        m.includes('invalid agent') ||
        m.includes('unknown catalog') ||
        m.includes('unknown agent')
    ) {
        return 'CATALOG_MISMATCH';
    }
    return 'UNKNOWN';
}

function resolveBaseUrl(options?: AgentPayOptions): string {
    const raw =
        options?.baseUrl ??
        process.env.AGENTPAY_API_BASE_URL ??
        process.env.AGENTPAY_BACKEND_URL ??
        'http://localhost:3000';
    const trimmed = raw.replace(/\/$/, '');
    return trimmed.endsWith('/v1') ? trimmed : `${trimmed}/v1`;
}

export * from './x402';
export * from './errors';

export class AgentPay {
    private agentId: string;
    private baseURL: string;
    private apiKey?: string;

    constructor(agentId: string, options?: AgentPayOptions) {
        this.agentId = agentId;
        this.baseURL = resolveBaseUrl(options);
        this.apiKey = options?.apiKey;
    }

    async getWalletConnectStatus() {
        const headers = this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : undefined;
        const response = await axios.get(`${this.baseURL}/wc/status`, { headers });
        return response.data as import('./x402/types').WalletConnectStatus;
    }

    async payAndCall(serviceId: string, payload: unknown) {
        try {
            const headers = this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : undefined;
            const response = await axios.post(
                `${this.baseURL}/pay-and-call`,
                {
                    agentId: this.agentId,
                    serviceId,
                    payload
                },
                { headers }
            );
            const data = response.data as { signature?: string };
            if (!data?.signature || typeof data.signature !== 'string' || !data.signature.trim()) {
                throw new AgentPayError(
                    'Backend returned no payment signature',
                    'NO_PAYMENT_SIGNATURE'
                );
            }
            return response.data;
        } catch (error: any) {
            if (error instanceof AgentPayError) throw error;

            const body = error.response?.data;
            const errMsg = body?.error || error.message;
            const status = error.response?.status as number | undefined;
            const backendCode = body?.code ? mapBackendCode(body.code) : inferCodeFromMessage(String(errMsg), status);
            console.error(`[SDK ERROR] code=${backendCode} ${errMsg}`);

            if (backendCode === 'CATALOG_MISMATCH') {
                throw new AgentPayError(
                    `${errMsg}. Use AgentPay MCP fetch_paid_service (SDK signs via x402_custom automatically).`,
                    'CATALOG_MISMATCH'
                );
            }

            if (backendCode !== 'UNKNOWN') {
                throw new AgentPayError(messageForCode(backendCode, String(errMsg)), backendCode);
            }

            if (errMsg) {
                throw new AgentPayError(String(errMsg), 'UNKNOWN');
            }
            throw error;
        }
    }
}
