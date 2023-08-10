import { Request, Response } from 'express';
import { AccountVariant } from '@thxnetwork/types/interfaces';
import { NODE_ENV } from '@thxnetwork/api/config/secrets';
import { ChainId } from '@thxnetwork/types/enums';
import { logger } from '@thxnetwork/api/util/logger';
import AccountProxy from '@thxnetwork/api/proxies/AccountProxy';
import SafeService from '@thxnetwork/api/services/SafeService';

const validation = [];

const controller = async (req: Request, res: Response) => {
    // #swagger.tags = ['Account']
    const account = await AccountProxy.getById(req.auth.sub);
    const isMetamask = account.variant === AccountVariant.Metamask;
    if (!isMetamask) return res.json(account);

    // On request create wallet for metamask user if none exists
    const chainId = NODE_ENV === 'production' ? ChainId.Polygon : ChainId.Hardhat;
    let wallet = await SafeService.findPrimary(account.sub, chainId);
    if (wallet) return res.json(account);

    // No wallet was found, create metamask wallet
    wallet = await SafeService.create({
        chainId,
        sub: account.sub,
        address: account.address,
    });

    logger.debug(`[${req.auth.sub}] Metamask Wallet: ${wallet.address}`);

    res.json(account);
};

export default { controller, validation };
