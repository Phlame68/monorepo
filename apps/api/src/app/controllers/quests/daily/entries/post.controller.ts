import { Request, Response } from 'express';
import { param } from 'express-validator';
import { NotFoundError } from '@thxnetwork/api/util/errors';
import { JobType, QuestVariant } from '@thxnetwork/common/lib/types';
import { agenda } from '@thxnetwork/api/util/agenda';
import PoolService from '@thxnetwork/api/services/PoolService';
import SafeService from '@thxnetwork/api/services/SafeService';
import QuestService from '@thxnetwork/api/services/QuestService';
import AccountProxy from '@thxnetwork/api/proxies/AccountProxy';
import LockService from '@thxnetwork/api/services/LockService';

const validation = [param('id').isMongoId()];

const controller = async (req: Request, res: Response) => {
    const quest = await QuestService.findById(QuestVariant.Daily, req.params.id);
    if (!quest) throw new NotFoundError('Could not find the Daily Reward');

    const pool = await PoolService.getById(quest.poolId);
    if (!pool) throw new NotFoundError('Could not find the campaign for this reward');

    const wallet = await SafeService.findPrimary(req.auth.sub, pool.chainId);
    if (!wallet) throw new NotFoundError('Could not find wallet');

    const isLocked = await LockService.getIsLocked(quest.locks, wallet);
    if (isLocked) {
        return res.json({ error: 'Quest is locked' });
    }

    const account = await AccountProxy.getById(req.auth.sub);
    if (!account) throw new NotFoundError('Account not found.');

    const isAvailable = await QuestService.isAvailable(quest.variant, { quest, account, wallet });
    if (!isAvailable) return res.json({ error: 'Already completed within the last 24 hours.' });

    const { result, reason } = await QuestService.getValidationResult(quest.variant, quest, account, wallet, {});
    if (!result) return res.json({ error: reason });

    const job = await agenda.now(JobType.CreateQuestEntry, {
        variant: QuestVariant.Daily,
        questId: quest._id,
        sub: account.sub,
        data: {},
    });

    res.json({ jobId: job.attrs._id });
};

export default { controller, validation };
