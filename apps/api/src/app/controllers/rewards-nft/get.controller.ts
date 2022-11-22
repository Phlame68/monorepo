import { Request, Response } from 'express';
import { NotFoundError } from '@thxnetwork/api/util/errors';
import { param } from 'express-validator';
import WithdrawalService from '@thxnetwork/api/services/WithdrawalService';
import ClaimService from '@thxnetwork/api/services/ClaimService';
import RewardNftService from '@thxnetwork/api/services/RewardNftService';
import { RewardBaseDocument } from '@thxnetwork/api/models/RewardBase';
import { formatRewardNft } from '../rewards-utils';

const validation = [param('id').exists()];

const controller = async (req: Request, res: Response) => {
    // #swagger.tags = ['RewardsNft']
    const reward = await RewardNftService.get(req.params.id);
    if (!reward) throw new NotFoundError();

    const claims = await ClaimService.findByReward((await reward.rewardBase) as RewardBaseDocument);
    const withdrawals = await WithdrawalService.findByQuery({
        poolId: String(req.assetPool._id),
        rewardId: reward.id,
    });
    const formattedReward = await formatRewardNft(reward);
    res.json({ ...formattedReward, claims, poolAddress: req.assetPool.address, progress: withdrawals.length });
};

export default { controller, validation };
