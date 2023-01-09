import express from 'express';

import { assertRequestInput, guard } from '@thxnetwork/api/middlewares';
import CreateAccount from './post.controller';
import ReadAccount from './get.controller';
import UpdateAccount from './patch.controller';
import DeleteAccount from './delete.controller';
import ReadAccountYoutube from './youtube/get.controller';
import ReadAccountTwitter from './twitter/get.controller';
import ReadAccountDiscord from './discord/get.controller';
import CreateAccountLogin from './login/post.controller';

const router = express.Router();

router.get('/', guard.check(['account:read']), ReadAccount.controller);
router.patch('/', guard.check(['account:read', 'account:write']), UpdateAccount.controller);
router.delete('/', guard.check(['account:write']), DeleteAccount.controller);
router.post(
    '/',
    guard.check(['account:write']),
    assertRequestInput(CreateAccount.validation),
    CreateAccount.controller,
);

router.get('/twitter', guard.check(['account:read']), ReadAccountTwitter.controller);
router.get('/youtube', guard.check(['account:read']), ReadAccountYoutube.controller);
router.get('/discord', guard.check(['account:read']), ReadAccountDiscord.controller);

router.post(
    '/login',
    assertRequestInput(CreateAccountLogin.validation),
    guard.check(['account:write']),
    CreateAccountLogin.controller,
);

export default router;
