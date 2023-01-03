import { NotFoundError } from '@thxnetwork/api/util/errors';
import { Request, Response } from 'express';
import { body, param } from 'express-validator';
import ERC20PerkService from '@thxnetwork/api/services/ERC20PerkService';

const validation = [
    param('id').exists(),
    body('title').isString(),
    body('description').isString(),
    body('amount').exists().isInt({ gt: 0 }),
    body('expiryDate').optional().isString(),
    body('rewardLimit').isNumeric(),
    body('claimAmount').optional().isInt({ gt: 0 }),
    body('platform').optional().isNumeric(),
    body('interaction').optional().isNumeric(),
    body('content').optional().isString(),
    body('isPromoted').optional().isBoolean(),
    body('image').optional().isString(),
];

const controller = async (req: Request, res: Response) => {
    // #swagger.tags = ['RewardsToken']
    let reward = await ERC20PerkService.get(req.params.id);
    if (!reward) throw new NotFoundError('Could not find the reward');
    reward = await ERC20PerkService.update(reward, { ...req.body });
    return res.json(reward.toJSON());
};

export default { controller, validation };
