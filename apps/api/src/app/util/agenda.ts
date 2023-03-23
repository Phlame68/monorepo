import db from './database';
import { Agenda } from 'agenda';
import { logger } from './logger';
import { updatePendingTransactions } from '@thxnetwork/api/jobs/updatePendingTransactions';
import { createConditionalRewards } from '@thxnetwork/api/jobs/createConditionalRewards';
import { createPoolAnalyticsReport } from '@thxnetwork/api/jobs/sendPoolAnalyticsReport';

const agenda = new Agenda({
    name: 'jobs',
    maxConcurrency: 1,
    lockLimit: 1,
    processEvery: '1 second',
});

const EVENT_UPDATE_PENDING_TRANSACTIONS = 'updatePendingTransactions';
const EVENT_CREATE_CONDITIONAL_REWARDS = 'createConditionalRewards';
export const EVENT_CREATE_POOL_ANALYTICS_REPORT = 'createPoolMetricsReport';

agenda.define(EVENT_UPDATE_PENDING_TRANSACTIONS, updatePendingTransactions);
agenda.define(EVENT_CREATE_CONDITIONAL_REWARDS, createConditionalRewards);
agenda.define(EVENT_CREATE_POOL_ANALYTICS_REPORT, createPoolAnalyticsReport);

db.connection.once('open', async () => {
    agenda.mongo(db.connection.getClient().db() as any, 'jobs');

    await agenda.start();
    await agenda.every('10 seconds', EVENT_UPDATE_PENDING_TRANSACTIONS);
    await agenda.every('15 minutes', EVENT_CREATE_CONDITIONAL_REWARDS);
    await agenda.every('0 9 * * MON', EVENT_CREATE_POOL_ANALYTICS_REPORT);

    logger.info('AgendaJS successfully started job processor');
});

export { agenda, EVENT_UPDATE_PENDING_TRANSACTIONS };
