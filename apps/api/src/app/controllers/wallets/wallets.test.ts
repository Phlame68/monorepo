import request from 'supertest';
import app from '@thxnetwork/api/';
import {
    widgetAccessToken,
    sub,
    sub2,
    userWalletAddress2,
    authAccessToken,
    userWalletAddress3,
    sub3,
} from '@thxnetwork/api/util/jest/constants';
import { afterAllCallback, beforeAllCallback } from '@thxnetwork/api/util/jest/config';
import { ChainId } from '@thxnetwork/types/enums';
import { currentVersion } from '@thxnetwork/contracts/exports';
import PoolService from '@thxnetwork/api/services/PoolService';
const user = request.agent(app);

describe('Wallets', () => {
    let walletId;

    beforeAll(async () => await beforeAllCallback({ skipWalletCreation: true }));
    afterAll(afterAllCallback);

    describe('POST /wallets', () => {
        it('HTTP 201 with deploy', (done) => {
            user.post('/v1/wallets')
                .set({ Authorization: authAccessToken })
                .send({
                    sub,
                    chainId: ChainId.Hardhat,
                    forceSync: true,
                })
                .expect((res: request.Response) => {
                    expect(res.body.sub).toEqual(sub);
                    expect(res.body.chainId).toEqual(ChainId.Hardhat);
                    expect(res.body.address).toBeDefined();
                    walletId = res.body._id;
                })
                .expect(201, done);
        });

        it('HTTP 201 without deploy', (done) => {
            user.post('/v1/wallets')
                .set({ Authorization: authAccessToken })
                .send({
                    sub: sub2,
                    chainId: ChainId.Hardhat,
                    address: userWalletAddress2,
                })
                .expect((res: request.Response) => {
                    expect(res.body.sub).toEqual(sub2);
                    expect(res.body.chainId).toEqual(ChainId.Hardhat);
                    expect(res.body.address).toBe(userWalletAddress2);
                })
                .expect(201, done);
        });
    });

    describe('GET /wallets', () => {
        it('HTTP 200 if OK', (done) => {
            user.get(`/v1/wallets?chainId=${ChainId.Hardhat}&sub=${sub}`)
                .set({ Authorization: widgetAccessToken })
                .expect((res: request.Response) => {
                    expect(res.body.length).toEqual(1);
                    expect(res.body[0].sub).toEqual(sub);
                    expect(res.body[0].chainId).toEqual(ChainId.Hardhat);
                    expect(res.body[0].address).toBeDefined();
                    expect(res.body[0].version).toBe(currentVersion);
                })
                .expect(200, done);
        });
    });

    describe('GET /wallets (deployment skipped)', () => {
        it('HTTP 200 if OK', (done) => {
            user.get(`/v1/wallets?chainId=${ChainId.Hardhat}&address=${userWalletAddress2}`)
                .set({ Authorization: widgetAccessToken })
                .expect((res: request.Response) => {
                    expect(res.body.length).toEqual(1);
                    expect(res.body[0].sub).toEqual(sub2);
                    expect(res.body[0].chainId).toEqual(ChainId.Hardhat);
                    expect(res.body[0].address).toBe(userWalletAddress2);
                    expect(res.body[0].version).toBeUndefined();
                })
                .expect(200, done);
        });
    });

    describe('GET /wallets/:id', () => {
        it('HTTP 200 if OK', (done) => {
            user.get(`/v1/wallets/${walletId}`)
                .set({ Authorization: widgetAccessToken })
                .expect((res: request.Response) => {
                    expect(res.body.sub).toEqual(sub);
                    expect(res.body.chainId).toEqual(ChainId.Hardhat);
                    expect(res.body.address).toBeDefined();
                })
                .expect(200, done);
        });
    });

    describe('POST /wallets (onboard flow)', () => {
        let pool;

        beforeAll(async () => {
            pool = await PoolService.deploy(sub, ChainId.Hardhat, 'My Loyalty Campaign');
        });

        it('HTTP 201 without sub', (done) => {
            user.post(`/v1/webhook/wallet/${pool.token}`)
                .send({
                    address: userWalletAddress3,
                })
                .expect((res: request.Response) => {
                    expect(res.body.sub).toBeUndefined();
                    expect(res.body.chainId).toEqual(ChainId.Hardhat);
                    expect(res.body.address).toBe(userWalletAddress3);
                    walletId = res.body._id;
                })
                .expect(201, done);
        });

        it('HTTP 200 ', (done) => {
            user.patch(`/v1/wallets/${walletId}`)
                .set({ Authorization: authAccessToken })
                .send({
                    sub: sub3,
                })
                .expect((res: request.Response) => {
                    expect(res.body.sub).toEqual(sub3);
                    expect(res.body.chainId).toEqual(ChainId.Hardhat);
                    expect(res.body.address).toBe(userWalletAddress3);
                })
                .expect(200, done);
        });
    });
});
