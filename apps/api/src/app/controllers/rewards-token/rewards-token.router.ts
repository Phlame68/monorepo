import express from 'express';
import {
    assertAssetPoolAccess,
    assertRequestInput,
    requireAssetPoolHeader,
    guard,
    assertPlan,
} from '@thxnetwork/api/middlewares';
import { AccountPlanType } from '@thxnetwork/api/types/enums';
import CreateRewardToken from './post.controller';
import ReadRewardToken from './get.controller';
import UpdateRewardToken from './patch.controller';
import ListRewardToken from './list.controller';
import GiveRewardToken from './give/post.controller';

const router = express.Router();

router.get(
    '/',
    guard.check(['rewards:read']),
    assertAssetPoolAccess,
    requireAssetPoolHeader,
    assertPlan([AccountPlanType.Basic, AccountPlanType.Premium]),
    ListRewardToken.controller,
);
router.get(
    '/:id',
    guard.check(['rewards:read']),
    //assertAssetPoolAccess,
    assertRequestInput(ReadRewardToken.validation),
    requireAssetPoolHeader,
    assertPlan([AccountPlanType.Basic, AccountPlanType.Premium]),
    ReadRewardToken.controller,
);
router.post(
    '/',
    guard.check(['rewards:write', 'rewards:read']),
    assertAssetPoolAccess,
    assertRequestInput(CreateRewardToken.validation),
    requireAssetPoolHeader,
    assertPlan([AccountPlanType.Basic, AccountPlanType.Premium]),
    CreateRewardToken.controller,
);

router.post(
    '/:id/give',
    guard.check(['rewards:read', 'withdrawals:write']),
    assertAssetPoolAccess,
    assertRequestInput(GiveRewardToken.validation),
    requireAssetPoolHeader,
    assertPlan([AccountPlanType.Basic, AccountPlanType.Premium]),
    GiveRewardToken.controller,
);

router.patch(
    '/:id',
    guard.check(['rewards:write', 'rewards:read']),
    assertAssetPoolAccess,
    assertRequestInput(UpdateRewardToken.validation),
    requireAssetPoolHeader,
    assertPlan([AccountPlanType.Basic, AccountPlanType.Premium]),
    UpdateRewardToken.controller,
);

router.get(
    '/:id/claims/qrcode',
    guard.check(['rewards:read', 'claims:read']),
    assertAssetPoolAccess,
    assertRequestInput(ListRewardToken.validation),
    requireAssetPoolHeader,
    assertPlan([AccountPlanType.Basic, AccountPlanType.Premium]),
    ListRewardToken.controller,
);

export default router;
