import { Request, Response } from 'express';
import { body, param } from 'express-validator';
import { NotFoundError } from '@thxnetwork/api/util/errors';
import PoolService from '@thxnetwork/api/services/PoolService';
import { AssetPool } from '@thxnetwork/api/models/AssetPool';

export const validation = [
    param('id').exists(),
    body('settings.title').optional().isString().trim().escape().isLength({ max: 50 }),
    body('settings.description').optional().isString().trim().escape().isLength({ max: 255 }),
    body('settings.startDate').optional({ nullable: true }).isString(),
    body('settings.endDate').optional({ nullable: true }).isString(),
    body('settings.discordWebhookUrl').optional({ checkFalsy: true }).isURL(),
    body('settings.isArchived').optional().isBoolean(),
    body('settings.isWeeklyDigestEnabled').optional().isBoolean(),
    body('settings.isTwitterSyncEnabled').optional().isBoolean(),
    body('settings.defaults.conditionalRewards.title').optional().isString(),
    body('settings.defaults.conditionalRewards.description').optional().isString(),
    body('settings.defaults.conditionalRewards.amount').optional().isInt(),
    body('settings.defaults.conditionalRewards.hashtag').optional().isString(),
    body('settings.authenticationMethods').optional().isArray(),
];

export const controller = async (req: Request, res: Response) => {
    // #swagger.tags = ['Pools']
    const pool = await PoolService.getById(req.params.id);
    if (!pool) throw new NotFoundError('Could not find the Asset Pool for this id');

    console.log(req.body);
    const result = await AssetPool.findByIdAndUpdate(
        pool._id,
        { settings: Object.assign(pool.settings, req.body.settings) },
        { new: true },
    );
    return res.json(result);
};
export default { controller, validation };
