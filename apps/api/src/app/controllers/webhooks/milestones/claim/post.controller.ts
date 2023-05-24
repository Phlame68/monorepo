import MilestoneRewardClaimService from '@thxnetwork/api/services/MilestoneRewardClaimService';
import { Wallet } from '@thxnetwork/api/services/WalletService';
import { MilestoneReward } from '@thxnetwork/api/models/MilestoneReward';
import { MilestoneRewardClaim } from '@thxnetwork/api/models/MilestoneRewardClaims';
import { BadRequestError, ForbiddenError, NotFoundError } from '@thxnetwork/api/util/errors';
import { Request, Response } from 'express';
import { body, param } from 'express-validator';
import { AssetPool, AssetPoolDocument } from '@thxnetwork/api/models/AssetPool';
import { isAddress, toChecksumAddress } from 'web3-utils';
import { WalletDocument } from '@thxnetwork/api/models/Wallet';
import { v4 } from 'uuid';

const validation = [
    param('token').exists(),
    body('walletId').optional().isMongoId(),
    body('address')
        .optional()
        .custom((address) => isAddress(address)),
];

const controller = async (req: Request, res: Response) => {
    // #swagger.tags = ['Rewards']
    const reward = await MilestoneReward.findOne({ uuid: req.params.token });
    if (!reward) throw new NotFoundError('Could not find a milestone reward for this token');

    const pool = await AssetPool.findById(reward.poolId);
    if (!pool) throw new NotFoundError('Could not find a campaign pool for this reward.');

    if (!req.body.walletId && !req.body.address) {
        // We could create a new wallet here and deprecate wallet onboarding webhook
        // We should return the UUID and not the URL and walletId to ease up integration
        throw new BadRequestError('This request requires either a walletId or address body property');
    }

    const wallet: WalletDocument = req.body.walletId
        ? await getWalletForWalletId(pool, req.body.walletId)
        : await getWalletForAddress(pool, toChecksumAddress(req.body.address));

    if (reward.limit) {
        const claimsForAccount = await MilestoneRewardClaim.count({
            milestoneRewardId: reward.id,
            walletId: String(wallet._id),
        });
        if (claimsForAccount >= reward.limit)
            throw new ForbiddenError('This reward has reached its limit for this account.');
    }

    const claim = await MilestoneRewardClaimService.create({
        milestoneRewardId: String(reward._id),
        walletId: String(wallet._id),
        amount: String(reward.amount),
        poolId: reward.poolId,
    });

    res.status(201).json({ ...claim.toJSON(), wallet });
};

async function getWalletForWalletId(pool: AssetPoolDocument, walletId: string) {
    // First find the wallet for the ID
    const wallet = await Wallet.findById(walletId);

    // Second, if that wallet contains no sub it has not been transfered (yet)
    if (!wallet.sub) return wallet;

    // In case of a sub on the wallet, search all for the user by sub and return the wallet with address
    return await Wallet.findOne({ chainId: pool.chainId, sub: wallet.sub, address: { $exists: true } });
}

// @peterpolman This function should deprecate as soon as clients implement the wallet onboarding webhook
async function getWalletForAddress(pool: AssetPoolDocument, address: string) {
    // First find the wallet for this address
    const wallet = await Wallet.findOne({ chainId: pool.chainId, address });

    // Second, if that wallet exists return it
    if (wallet) return wallet;

    // If not, create a wallet for that address, claimable when the user signs in with that address
    // TODO perhaps this is undesired behavior since metamask users are forced to use the same account for the widget
    return await Wallet.create({
        token: v4(),
        poolId: pool._id,
        chainId: pool.chainId,
        address,
    });
}

export default { validation, controller };
