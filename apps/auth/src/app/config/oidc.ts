import MongoAdapter from '../util/adapter';
import { Account } from '../models/Account';
import { AccountDocument } from '../models/Account';
import { API_URL, INITIAL_ACCESS_TOKEN, NODE_ENV, SECURE_KEY } from './secrets';
import { Configuration, interactionPolicy } from 'oidc-provider';
import { getJwks } from '../util/jwks';

const basePolicy = interactionPolicy.base();
const promptReset = new interactionPolicy.Prompt({ name: 'reset', requestable: true });
const promptCreate = new interactionPolicy.Prompt({ name: 'create', requestable: true });
const promptConfirm = new interactionPolicy.Prompt({ name: 'confirm', requestable: true });
const promptVerifyEmail = new interactionPolicy.Prompt({ name: 'verify_email', requestable: true });
const promptConnect = new interactionPolicy.Prompt({ name: 'connect', requestable: true });
const promptAccount = new interactionPolicy.Prompt({ name: 'account-settings', requestable: true });
const promtotp = new interactionPolicy.Prompt({ name: 'totp-setup', requestable: true });

basePolicy.add(promptCreate);
basePolicy.add(promptConfirm);
basePolicy.add(promptVerifyEmail);
basePolicy.add(promptConnect);
basePolicy.add(promptReset);
basePolicy.add(promptAccount);
basePolicy.add(promtotp);
basePolicy.remove('consent');

// Configuration defaults:
// https://github.com/panva/node-oidc-provider/blob/master/lib/helpers/defaults.js

const keys = [SECURE_KEY.split(',')[0], SECURE_KEY.split(',')[1]];
const config: Configuration = {
    jwks: getJwks(),
    adapter: MongoAdapter,
    loadExistingGrant: async (ctx) => {
        const grant = new ctx.oidc.provider.Grant({
            clientId: ctx.oidc.client.clientId,
            accountId: ctx.oidc.session.accountId,
        });

        grant.addOIDCScope('openid offline_access');
        grant.addOIDCClaims(['sub', 'email']);
        grant.addResourceScope(API_URL, ctx.oidc.client.scope);
        await grant.save();
        return grant;
    },
    async findAccount(ctx: any, sub: string) {
        const account: AccountDocument = await Account.findById(sub);

        return {
            accountId: sub,
            claims: () => {
                return {
                    sub,
                    ...account.toJSON(),
                };
            },
        };
    },
    extraParams: [
        'claim_id',
        'reward_hash',
        'signup_email',
        'return_url',
        'signup_token',
        'authentication_token',
        'secure_key',
        'password_reset_token',
        'prompt',
        'channel',
        'verifyEmailToken',
        'access_token_kind',
        'distinct_id',
        'pool_id',
        'pool_transfer_token',
    ],
    scopes: [
        'openid',
        'offline_access',
        'account:read',
        'account:write',
        'accounts:read',
        'accounts:write',
        'brands:read',
        'brands:write',
        'pools:read',
        'pools:write',
        'rewards:read',
        'rewards:write',
        'members:read',
        'members:write',
        'memberships:read',
        'memberships:write',
        'withdrawals:read',
        'withdrawals:write',
        'deposits:read',
        'deposits:write',
        'erc20:read',
        'erc20:write',
        'erc721:read',
        'erc721:write',
        'erc1155:read',
        'erc1155:write',
        'promotions:read',
        'promotions:write',
        'point_balances:read',
        'point_balances:write',
        'point_rewards:read',
        'point_rewards:write',
        'transactions:read',
        'transactions:write',
        'payments:read',
        'payments:write',
        'widgets:write',
        'widgets:read',
        'relay:write',
        'metrics:read',
        'swaprule:read',
        'swaprule:write',
        'swap:read',
        'swap:write',
        'claims:write',
        'claims:read',
        'clients:write',
        'clients:read',
        'wallets:read',
        'wallets:write',
        'erc20_rewards:read',
        'erc20_rewards:write',
        'erc721_rewards:read',
        'erc721_rewards:write',
        'referral_rewards:read',
        'referral_rewards:write',
        'referal_reward_claims:read',
        'referal_reward_claims:write',
        'shopify_rewards:read',
        'shopify_rewards:write',
        'pool_analytics:read',
        'pool_subscription:read',
        'pool_subscription:write',
    ],
    claims: {
        openid: ['sub', 'email', 'variant', 'address'],
    },
    ttl: {
        Interaction: 24 * 60 * 60, // 24 hours in seconds
        Session: 24 * 60 * 60, // 24 hours in seconds
        Grant: 24 * 60 * 60, // 24 hours in seconds
        IdToken: 24 * 60 * 60, // 24 hours in seconds
        AccessToken: 24 * 60 * 60, // 24 hours in seconds,
        AuthorizationCode: 10 * 60, // 10 minutes in seconds
        ClientCredentials: 1 * 60 * 60, // 10 minutes in seconds
    },
    interactions: {
        policy: basePolicy,
        url(ctx: any, interaction: any) {
            return `/oidc/${interaction.uid}`;
        },
    },
    features: {
        devInteractions: { enabled: false },
        clientCredentials: { enabled: true },
        encryption: { enabled: true },
        introspection: { enabled: true },
        registration: { enabled: true, initialAccessToken: INITIAL_ACCESS_TOKEN },
        registrationManagement: { enabled: true },
        resourceIndicators: {
            enabled: true,
            defaultResource: () => API_URL,
            getResourceServerInfo: async (ctx, resourceIndicator, client) => {
                return {
                    scope: client.scope,
                    audience: client.clientId,
                    accessTokenTTL: 1 * 60 * 60,
                    accessTokenFormat: 'jwt',
                };
            },
            useGrantedResource: () => true,
        },
        rpInitiatedLogout: {
            enabled: true,
            logoutSource: async (ctx: any, form: any) => {
                ctx.body = `<!DOCTYPE html>
                <head>
                <title>Logout</title>
                </head>
                <body>
                ${form}
                <script src="/js/logout.js"></script>
                </body>
                </html>`;
            },
        },
    },
    cookies: {
        long: { signed: true, secure: true, sameSite: 'none' },
        short: { signed: true, secure: true, sameSite: 'none' },
        keys,
    },
};

if (NODE_ENV === 'test') {
    config.pkce = {
        methods: ['S256'],
        required: () => false,
    };
    config.cookies.long = undefined;
    config.cookies.short = undefined;
}
export default config;
