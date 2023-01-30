import { Provider } from 'oidc-provider';
import configuration from '../config/oidc';
import { AUTH_URL, NODE_ENV } from '../config/secrets';
import { AccountService } from '../services/AccountService';
import { validateEmail } from './validate';
import { AccountVariant } from '../types/enums/AccountVariant';

const oidc = new Provider(AUTH_URL, configuration);

oidc.proxy = true;

if (NODE_ENV !== 'production') {
    const { invalidate: orig } = (oidc.Client as any).Schema.prototype;
    (oidc.Client as any).Schema.prototype.invalidate = function invalidate(message, code) {
        if (code === 'implicit-force-https' || code === 'implicit-forbid-localhost') return;
        orig.call(this, message);
    };
}

async function getAccountByEmail(email: string, variant: AccountVariant) {
    // Gets the account for the specified email
    const account = await AccountService.getByEmail(email);

    if (!account) {
        // Creates a new account for specified variant
        return await AccountService.signup({
            email,
            variant,
            active: true,
        });
    } else if (account && !account.active && validateEmail(email)) {
        // Creates a new signup token and proceeds
        return await AccountService.signup({
            email,
            variant: account.variant,
            active: true,
        });
    }

    return account;
}

async function getAccountByTwitterId(twitterId: string) {
    // Gets the account for the specified email
    const account = await AccountService.getByTwitterId(twitterId);

    if (!account) {
        // Creates a new account for specified variant
        return await AccountService.signup({
            twitterId,
            variant: AccountVariant.SSOTwitter,
            active: true,
        });
    }
    return account;
}

async function saveInteraction(interaction, sub: string) {
    interaction.result = { login: { accountId: sub } };
    await interaction.save(Date.now() + 10000);
    return interaction.prompt.name === 'connect' ? interaction.params.return_url : interaction.returnTo;
}

async function getInteraction(uid: string) {
    const interaction = await oidc.Interaction.find(uid);
    if (!interaction) throw new Error('Could not find interaction for this state');
    return interaction;
}

export { oidc, getAccountByEmail, saveInteraction, getInteraction, getAccountByTwitterId };
