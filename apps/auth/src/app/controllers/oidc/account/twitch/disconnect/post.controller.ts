import { Request, Response } from 'express';
import { ERROR_NO_ACCOUNT } from '../../../../../util/messages';
import { AccountService } from '../../../../../services/AccountService';
import { TAccount } from '@thxnetwork/types/interfaces';

const controller = async (req: Request, res: Response) => {
    const { uid, session } = req.interaction;
    const account = await AccountService.get(session.accountId);
    if (!account) throw new Error(ERROR_NO_ACCOUNT);

    await AccountService.update(account, { twitchAccess: false } as TAccount);

    res.redirect(`/oidc/${uid}/account`);
};

export default { controller };
