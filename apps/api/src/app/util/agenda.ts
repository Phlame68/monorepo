import db from './database';
import { Agenda, Job } from '@hokify/agenda';
import { updatePendingTransactions } from '@thxnetwork/api/jobs/updatePendingTransactions';
import { createConditionalRewards } from '@thxnetwork/api/jobs/createConditionalRewards';
import { sendPoolAnalyticsReport } from '@thxnetwork/api/jobs/sendPoolAnalyticsReport';
import { JobType } from '@thxnetwork/types/enums';
import SafeService from '@thxnetwork/api/services/SafeService';
import WebhookService from '../services/WebhookService';
import { logger } from './logger';
import { MONGODB_URI } from '../config/secrets';

const agenda = new Agenda({
    db: {
        address: MONGODB_URI,
        collection: 'jobs',
    },
    maxConcurrency: 1,
    lockLimit: 1,
    processEvery: '1 second',
});

agenda.define(JobType.UpdatePendingTransactions, updatePendingTransactions);
agenda.define(JobType.CreateConditionalRewards, createConditionalRewards);
agenda.define(JobType.SendCampaignReport, sendPoolAnalyticsReport);
agenda.define(JobType.DeploySafe, (job: Job) => SafeService.createJob(job));
agenda.define(JobType.MigrateWallets, (job: Job) => SafeService.migrateJob(job));
agenda.define(JobType.RequestAttemp, (job: Job) => WebhookService.requestAttemptJob(job));

db.connection.once('open', async () => {
    await agenda.start();

    await agenda.every('10 seconds', JobType.UpdatePendingTransactions);
    await agenda.every('15 minutes', JobType.CreateConditionalRewards);
    await agenda.every('0 9 * * MON', JobType.SendCampaignReport);

    logger.info('AgendaJS started job processor');
});

export { agenda, JobType };
