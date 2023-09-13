import express from 'express';
import { assertRequestInput, assertPoolAccess, guard, checkJwt, corsHandler } from '@thxnetwork/api/middlewares';
import CreatePool from './post.controller';
import ReadPool from './get.controller';
import PoolsAnalytics from './analytics/get.controller';
import PoolsAnalyticsLeaderBoard from './analytics/leaderboard/get.controller';
import PoolsAnalyticsLeaderBoardClient from './analytics/leaderboard/client/get.controller';
import PoolsAnalyticsMetrics from './analytics/metrics/get.controller';
import DeletePool from './delete.controller';
import ListPools from './list.controller';
import ListPoolsPublic from './public/list.controller';
import CreatePoolTopup from './topup/post.controller';
import ReadPoolTransfer from './transfers/get.controller';
import CreatePoolTransfer from './transfers/post.controller';
import DeletePoolTransfer from './transfers/delete.controller';
import CreatePoolSubscription from './subscriptions/post.controller';
import ReadPoolSubscription from './subscriptions/get.controller';
import ListPoolParticipants from './participants/list.controller';
import CreatePoolCollaborator from './collaborators/post.controller';
import DeletePoolCollaborator from './collaborators/delete.controller';
import UpdatePoolCollaborator from './collaborators/patch.controller';
import DeletePoolSubscription from './subscriptions/delete.controller';
import CreatePoolTransferRefresh from './transfers/refresh/post.controller';
import ListPoolTransfer from './transfers/list.controller';
import UpdatePool from './patch.controller';
import ListPoolWallets from './wallets/list.controller';

const router = express.Router();

router.post(
    '/',
    checkJwt,
    corsHandler,
    guard.check(['pools:read', 'pools:write']),
    assertRequestInput(CreatePool.validation),
    CreatePool.controller,
);
router.post(
    '/:id/transfers',
    checkJwt,
    corsHandler,
    guard.check(['pools:write']),
    assertRequestInput(CreatePoolTransfer.validation),
    CreatePoolTransfer.controller,
);
router.post(
    '/:id/subscription',
    checkJwt,
    corsHandler,
    guard.check(['pool_subscription:write']),
    assertRequestInput(CreatePoolSubscription.validation),
    CreatePoolSubscription.controller,
);
router.get(
    '/:id/wallets',
    checkJwt,
    corsHandler,
    guard.check(['pools:read']),
    assertPoolAccess,
    assertRequestInput(ListPoolWallets.validation),
    ListPoolWallets.controller,
);
router.delete(
    '/:id/transfers',
    checkJwt,
    corsHandler,
    guard.check(['pools:write']),
    assertPoolAccess,
    assertRequestInput(DeletePoolTransfer.validation),
    DeletePoolTransfer.controller,
);
router.get('/:id/transfers/:token', assertRequestInput(ReadPoolTransfer.validation), ReadPoolTransfer.controller);
router.get(
    '/:id/transfers',
    checkJwt,
    corsHandler,
    guard.check(['pools:read']),
    assertPoolAccess,
    assertRequestInput(ListPoolTransfer.validation),
    ListPoolTransfer.controller,
);
router.post(
    '/:id/transfers/refresh',
    checkJwt,
    corsHandler,
    guard.check(['pools:write']),
    assertPoolAccess,
    assertRequestInput(CreatePoolTransferRefresh.validation),
    CreatePoolTransferRefresh.controller,
);
router.get('/', checkJwt, guard.check(['pools:read']), assertRequestInput(ListPools.validation), ListPools.controller);
router.get('/public', assertRequestInput(ListPoolsPublic.validation), ListPoolsPublic.controller);
router.get(
    '/:id',
    checkJwt,
    corsHandler,
    guard.check(['pools:read']),
    assertPoolAccess,
    assertRequestInput(ReadPool.validation),
    ReadPool.controller,
);
router.get(
    '/:id/analytics',
    checkJwt,
    corsHandler,
    guard.check(['pools:read']),
    assertPoolAccess,
    assertRequestInput(PoolsAnalytics.validation),
    PoolsAnalytics.controller,
);
router.get(
    '/:id/analytics/leaderboard/client',
    checkJwt,
    corsHandler,
    guard.check(['pool_analytics:read']),
    //assertPoolAccess,
    assertRequestInput(PoolsAnalyticsLeaderBoardClient.validation),
    PoolsAnalyticsLeaderBoardClient.controller,
);
router.get(
    '/:id/analytics/leaderboard',
    checkJwt,
    corsHandler,
    guard.check(['pools:read']),
    assertPoolAccess,
    assertRequestInput(PoolsAnalyticsLeaderBoard.validation),
    PoolsAnalyticsLeaderBoard.controller,
);
router.get(
    '/:id/analytics/metrics',
    checkJwt,
    corsHandler,
    guard.check(['pools:read']),
    assertPoolAccess,
    assertRequestInput(PoolsAnalyticsMetrics.validation),
    PoolsAnalyticsMetrics.controller,
);
router.get(
    '/:id/subscription',
    checkJwt,
    corsHandler,
    guard.check(['pool_subscription:read']),
    assertRequestInput(ReadPoolSubscription.validation),
    ReadPoolSubscription.controller,
);
router.get(
    '/:id/participants',
    checkJwt,
    corsHandler,
    guard.check(['pools:read']), // TODO Should become pool_participants:read
    assertPoolAccess,
    assertRequestInput(ListPoolParticipants.validation),
    ListPoolParticipants.controller,
);
router.patch(
    '/:id/collaborators/:uuid',
    checkJwt,
    corsHandler,
    guard.check(['pools:read', 'pools:write']),
    // assertPoolAccess, // No access check because user needs to be able to update using obtained uuid
    assertRequestInput(UpdatePoolCollaborator.validation),
    UpdatePoolCollaborator.controller,
);
router.post(
    '/:id/collaborators',
    checkJwt,
    corsHandler,
    guard.check(['pools:read', 'pools:write']),
    assertPoolAccess,
    assertRequestInput(CreatePoolCollaborator.validation),
    CreatePoolCollaborator.controller,
);
router.delete(
    '/:id/collaborators/:uuid',
    checkJwt,
    corsHandler,
    guard.check(['pools:read', 'pools:write']),
    assertPoolAccess,
    assertRequestInput(DeletePoolCollaborator.validation),
    DeletePoolCollaborator.controller,
);
router.delete(
    '/:id',
    checkJwt,
    corsHandler,
    guard.check(['pools:write']),
    assertPoolAccess,
    assertRequestInput(DeletePool.validation),
    DeletePool.controller,
);
router.delete(
    '/:id/subscription',
    checkJwt,
    corsHandler,
    guard.check(['pool_subscription:write']),
    assertRequestInput(DeletePoolSubscription.validation),
    DeletePoolSubscription.controller,
);
router.post(
    '/:id/topup',
    checkJwt,
    corsHandler,
    guard.check(['deposits:read', 'deposits:write']),
    assertPoolAccess,
    assertRequestInput(CreatePoolTopup.validation),
    CreatePoolTopup.controller,
);
router.patch(
    '/:id',
    checkJwt,
    corsHandler,
    guard.check(['pools:read', 'pools:write']),
    assertPoolAccess,
    assertRequestInput(UpdatePool.validation),
    UpdatePool.controller,
);
export default router;
