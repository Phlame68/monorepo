import ImageService from '@thxnetwork/api/services/ImageService';
import { Request, Response } from 'express';
import { CustomReward } from '@thxnetwork/api/models/CustomReward';
import { Webhook } from '@thxnetwork/api/models/Webhook';
import { body } from 'express-validator';
import { ForbiddenError } from '@thxnetwork/api/util/errors';

const validation = [body('webhookId').isMongoId()];

const controller = async (req: Request, res: Response) => {
    const poolId = req.header('X-PoolId');
    const image = req.file ? await ImageService.upload(req.file) : '';
    const webhook = await Webhook.findById(req.body.webhookId);
    if (webhook.poolId !== poolId) throw new ForbiddenError('Not your webhook');

    const reward = await CustomReward.create({ ...req.body, poolId, image });

    res.status(201).json(reward);
};

export default { controller, validation };
