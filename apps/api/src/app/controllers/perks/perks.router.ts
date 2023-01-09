import { assertRequestInput, checkJwt, corsHandler } from '@thxnetwork/api/middlewares';
import express from 'express';
import ListPerks from './list.controller';
import PayERC20Perk from './erc20/payment/post.controller';
import PayERC721Perk from './erc721/payment/post.controller';

const router = express.Router();

router.get('/', ListPerks.controller);

router.use(checkJwt).use(corsHandler).post(
    '/erc20/:uuid/payment',
    // guard.check(['perks_redeem:read']),
    assertRequestInput(PayERC20Perk.validation),
    PayERC20Perk.controller,
);

router.use(checkJwt).use(corsHandler).post(
    '/erc721/:uuid/payment',
    // guard.check(['perks_redeem:read']),
    assertRequestInput(PayERC721Perk.validation),
    PayERC721Perk.controller,
);

export default router;
