import express from 'express';
import healthRouter from './health/health.router';
import accountRouter from './account/account.router';
import poolsRouter from './pools/pools.router';
import erc721PerksRouter from './erc721-perks/erc721-perks.router';
import referralRewardsRouter from './referral-rewards/referral-rewards.router';
import erc20PerksRouter from './erc20-perks/erc20-perks.router';
import customRewardsRouter from './custom-rewards/custom-rewards.router';
import couponRewardsRouter from './coupon-rewards/coupon-rewards.router';
import discordRoleRewardsRouter from './discord-role-rewards/discord-role-rewards.router';
import tokenRouter from './token/token.router';
import pointRewardsRouter from './point-rewards/point-rewards.router';
import pointBalancesRouter from './point-balances/point-balances.router';
import metadataRouter from './metadata/metadata.router';
import erc721Router from './erc721/erc721.router';
import erc1155Router from './erc1155/erc1155.router';
import uploadRouter from './upload/upload.router';
import erc20Router from './erc20/erc20.router';
import clientRouter from './client/client.router';
import claimsRouter from './claims/claims.router';
import brandsRouter from './brands/brands.router';
import walletsRouter from './wallets/wallets.router';
import widgetRouter from './widget/widget.router';
import questsRouter from './quests/quests.router';
import rewardsRouter from './rewards/rewards.router';
import leaderboardsRouter from './leaderboards/leaderboards.router';
import dailyRewardsRouter from './daily-rewards/daily-rewards.router';
import milestonesRewardRouter from './milestone-reward/milestone-rewards.router';
import transactionsRouter from './transactions/transactions.router';
import webhookRouter from './webhook/webhook.router';
import webhooksRouter from './webhooks/webhooks.router';
import widgetsRouter from './widgets/widgets.router';
import identityRouter from './identity/identity.router';
import eventsRouter from './events/events.router';
import web3QuestsRouter from './web3-quests/web3-quests.router';
import dataRouter from './data/data.router';
import { checkJwt, corsHandler } from '@thxnetwork/api/middlewares';

const router = express.Router({ mergeParams: true });

router.use('/ping', (_req, res) => res.send('pong'));
router.use('/health', healthRouter);
router.use('/data', dataRouter);
router.use('/token', tokenRouter);
router.use('/metadata', metadataRouter);
router.use('/brands', brandsRouter);
router.use('/claims', claimsRouter);
router.use('/widget', widgetRouter);
router.use('/leaderboards', leaderboardsRouter); // TODO Partial refactor

router.use('/quests', questsRouter); // TODO Refactor
router.use('/rewards', rewardsRouter); // TODO Refactor

router.use('/webhook', webhookRouter); // TODO Deprecate

router.use(checkJwt, corsHandler);
router.use('/identity', identityRouter);
router.use('/events', eventsRouter);
router.use('/pools', poolsRouter);
router.use('/point-rewards', pointRewardsRouter);
router.use('/milestone-rewards', milestonesRewardRouter);
router.use('/daily-rewards', dailyRewardsRouter);
router.use('/point-balances', pointBalancesRouter);
router.use('/web3-quests', web3QuestsRouter);
router.use('/account', accountRouter);
router.use('/widgets', widgetsRouter);
router.use('/erc20', erc20Router);
router.use('/erc721', erc721Router);
router.use('/erc1155', erc1155Router);
router.use('/erc20-perks', erc20PerksRouter);
router.use('/erc721-perks', erc721PerksRouter);
router.use('/custom-rewards', customRewardsRouter);
router.use('/coupon-rewards', couponRewardsRouter);
router.use('/discord-role-rewards', discordRoleRewardsRouter);
router.use('/referral-rewards', referralRewardsRouter);
router.use('/upload', uploadRouter);
router.use('/clients', clientRouter);
router.use('/transactions', transactionsRouter);
router.use('/wallets', walletsRouter);
router.use('/webhooks', webhooksRouter);

export default router;
