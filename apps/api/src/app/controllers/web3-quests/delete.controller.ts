import { Request, Response } from 'express';
import { CustomReward } from '@thxnetwork/api/models/CustomReward';
import { param } from 'express-validator';
import { ForbiddenError } from '@thxnetwork/api/util/errors';

const validation = [param('id').isMongoId()];

const controller = async (req: Request, res: Response) => {
    const poolId = req.header('X-PoolId');
    const quest = await CustomReward.findByIdAndDelete(req.params.id);
    if (quest.poolId !== poolId) throw new ForbiddenError('Not your custom reward.');

    res.status(204).end();
};

export default { controller, validation };
