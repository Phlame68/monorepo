import { Request, Response } from 'express';
import { AccountVariant } from '@thxnetwork/types/interfaces';
import { AccessTokenKind } from '@thxnetwork/common/lib/types';
import AuthService from '@thxnetwork/auth/services/AuthService';
import TokenService from '@thxnetwork/auth/services/TokenService';

export async function controller(req: Request, res: Response) {
    const { code, interaction } = await AuthService.redirectCallback(req);
    const token = await TokenService.requestToken({ kind: AccessTokenKind.Google, code });
    const account = await AuthService.signin(interaction, token, AccountVariant.SSOGoogle);
    const returnUrl = await AuthService.getReturn(interaction, account);

    res.redirect(returnUrl);
}

export default { controller };
