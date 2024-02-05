import AccountProxy from '@thxnetwork/api/proxies/AccountProxy';
import DiscordDataProxy from '@thxnetwork/api/proxies/DiscordDataProxy';
import { getToken } from '@thxnetwork/api/services/maps/quests';
import { NotFoundError } from '@thxnetwork/api/util/errors';
import { AccessTokenKind, OAuthDiscordScope } from '@thxnetwork/common/lib/types';
import { Request, Response } from 'express';

export const controller = async (req: Request, res: Response) => {
    const account = await AccountProxy.findById(req.auth.sub);
    const token = getToken(account, AccessTokenKind.Discord, [OAuthDiscordScope.Identify, OAuthDiscordScope.Guilds]);
    if (!token) throw new NotFoundError('Discord token not found.');

    const guilds = await DiscordDataProxy.getGuilds(token);

    res.json({ guilds });
};
export default { controller };
