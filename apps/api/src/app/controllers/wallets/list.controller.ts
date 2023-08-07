import { Request, Response } from 'express';
import { query } from 'express-validator';
import { Wallet } from '@thxnetwork/api/services/WalletService';
import { ChainId } from '@thxnetwork/types/enums';
import { NODE_ENV } from '@thxnetwork/api/config/secrets';

const validation = [query('chainId').optional().isNumeric(), query('chainId').optional().isString()];

const controller = async (req: Request, res: Response) => {
    // #swagger.tags = ['Wallets']
    const chainId = NODE_ENV === 'production' ? ChainId.Polygon : ChainId.Hardhat;
    const wallets = await Wallet.find({ sub: req.auth.sub, chainId });

    res.json(wallets);
};

export default { controller, validation };
