import { DailyReward } from '@thxnetwork/api/models/DailyReward';
import { BadRequestError, NotFoundError } from '@thxnetwork/api/util/errors';
import { Request, Response } from 'express';
import { body, param } from 'express-validator';
import { toChecksumAddress } from 'web3-utils';
import { getIdentityForAddress, getIdentityForCode } from '../milestones/claim/post.controller';
import { AssetPool } from '@thxnetwork/api/models/AssetPool';
import { Event } from '@thxnetwork/api/models/Event';

const validation = [
    param('uuid').isUUID('4'),
    body('code').optional().isUUID(4),
    body('address')
        .optional()
        .isEthereumAddress()
        .customSanitizer((address) => toChecksumAddress(address)),
];

const controller = async (req: Request, res: Response) => {
    // #swagger.tags = ['Rewards']
    const quest = await DailyReward.findOne({ uuid: req.params.uuid });
    if (!quest) throw new NotFoundError('Could not find a daily reward for this token');

    const pool = await AssetPool.findById(quest.poolId);
    if (!pool) throw new NotFoundError('Could not find a campaign pool for this reward.');

    if (!req.body.code && !req.body.address) {
        throw new BadRequestError('This request requires either a wallet code or address');
    }

    const identity = req.body.code
        ? await getIdentityForCode(pool, req.body.code)
        : await getIdentityForAddress(pool, req.body.address);

    await Event.create({ name: quest.eventName, identityId: identity._id, poolId: pool._id });

    res.status(201).end();
};

export default { validation, controller };
