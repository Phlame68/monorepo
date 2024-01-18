import request from 'supertest';
import app from '@thxnetwork/api/';
import { afterAllCallback, beforeAllCallback } from '@thxnetwork/api/util/jest/config';
import { getProvider } from '@thxnetwork/api/util/network';
import { BigNumber, Contract, ethers } from 'ethers';
import { ChainId } from '@thxnetwork/types/enums';
import { contractArtifacts } from '@thxnetwork/contracts/exports';
import { sub, userWalletPrivateKey, widgetAccessToken } from '@thxnetwork/api/util/jest/constants';
import SafeService from '@thxnetwork/api/services/SafeService';
import { WalletDocument } from '@thxnetwork/api/models/Wallet';
import { signTxHash, timeTravel } from '@thxnetwork/api/util/jest/network';
import { poll } from '@thxnetwork/api/util/polling';
import { BPT_ADDRESS, RD_ADDRESS, RF_ADDRESS, SC_ADDRESS, VE_ADDRESS } from '@thxnetwork/api/config/secrets';

const user = request.agent(app);
const { signer, defaultAccount } = getProvider(ChainId.Hardhat);

describe('VESytem', () => {
    beforeAll(beforeAllCallback);
    afterAll(afterAllCallback);

    const totalSupplyInWei = String(ethers.utils.parseUnits('1000000', 'ether'));
    const amountInWei = String(ethers.utils.parseUnits('1000', 'ether'));

    let safeWallet!: WalletDocument,
        testBPT!: Contract,
        smartCheckerList!: Contract,
        vethx!: Contract,
        rdthx!: Contract,
        rfthx!: Contract,
        scthx!: Contract;

    it('Deploy Tokens', async () => {
        safeWallet = await SafeService.findPrimary(sub, ChainId.Hardhat);
        expect(safeWallet.address).toBeDefined();

        testBPT = new ethers.Contract(BPT_ADDRESS, contractArtifacts['BPTToken'].abi, signer);
        expect(testBPT.address).toBe(BPT_ADDRESS);

        vethx = new ethers.Contract(VE_ADDRESS, contractArtifacts['VotingEscrow'].abi, signer);
        rdthx = new ethers.Contract(RD_ADDRESS, contractArtifacts['RewardDistributor'].abi, signer);
        rfthx = new ethers.Contract(RF_ADDRESS, contractArtifacts['RewardFaucet'].abi, signer);
        scthx = new ethers.Contract(SC_ADDRESS, contractArtifacts['SmartWalletWhitelist'].abi, signer);
    });

    describe('Deposit BPT ', () => {
        it('Balance = total', async () => {
            let tx = await testBPT.mint(safeWallet.address, totalSupplyInWei);
            tx = await tx.wait();
            const event = tx.events.find((ev) => ev.event === 'Transfer');
            expect(event).toBeDefined();
            const balanceInWei = await testBPT.balanceOf(safeWallet.address);
            expect(balanceInWei.eq(totalSupplyInWei)).toBe(true);
        });

        it('WhiteList Safe Wallet', async () => {
            // Move this to step 1 in VE UI modals
            let tx = await smartCheckerList.approveWallet(safeWallet.address);
            tx = await tx.wait();
            const event = tx.events.find((ev) => ev.event === 'ApproveWallet');
            expect(event).toBeDefined();
        });

        it('Approve', async () => {
            const { status, body } = await user
                .post('/v1/ve/approve')
                .set({ Authorization: widgetAccessToken })
                .send({ amountInWei, spender: VE_ADDRESS });
            expect(body.safeTxHash).toBeDefined();
            expect(status).toBe(201);

            const { signature } = await signTxHash(safeWallet.address, body.safeTxHash, userWalletPrivateKey);
            await user
                .post('/v1/account/wallet/confirm')
                .set({ Authorization: widgetAccessToken })
                .send({ chainId: ChainId.Hardhat, safeTxHash: body.safeTxHash, signature })
                .expect(200);
        });

        it('Wait for approved amount', async () => {
            // Replace with API call
            await poll(
                () => testBPT.allowance(safeWallet.address, vethx.address),
                (result: BigNumber) => result.eq(0),
                1000,
            );
        });

        it('Deposit 1000', async () => {
            const endTimestamp = Math.ceil(Date.now() / 1000) + 60 * 60 * 24 * 12; // 12 weeks from now
            const { status, body } = await user
                .post('/v1/ve/deposit')
                .set({ Authorization: widgetAccessToken })
                .send({ amountInWei, endTimestamp });
            expect(body.safeTxHash).toBeDefined();
            expect(status).toBe(201);

            const { signature } = await signTxHash(safeWallet.address, body.safeTxHash, userWalletPrivateKey);
            await user
                .post('/v1/account/wallet/confirm')
                .set({ Authorization: widgetAccessToken })
                .send({ chainId: ChainId.Hardhat, safeTxHash: body.safeTxHash, signature })
                .expect(200);
        });

        it('Balance = total - deposit', async () => {
            await poll(
                () => vethx.locked(safeWallet.address),
                (result: { amount: BigNumber }) => BigNumber.from(result.amount).eq(0),
                1000,
            );

            const balanceInWei = await testBPT.balanceOf(safeWallet.address);
            const rdBalanceInWei = await testBPT.balanceOf(rdthx.address);
            const totalMinDeposit = BigNumber.from(totalSupplyInWei).sub(amountInWei);

            expect(rdBalanceInWei.eq(0)).toBe(true);
            expect(balanceInWei.eq(totalMinDeposit)).toBe(true);
        });

        it('List locks ', async () => {
            const { status, body } = await user.get('/v1/ve').set({ Authorization: widgetAccessToken }).send();

            expect(Number(body[0].end)).toBeGreaterThan(Number(body[0].now));
            expect(body[0].amount).toBe(amountInWei);
            expect(status).toBe(200);
        });
    });

    describe('Claim THX incentives', () => {
        it('Create Reward Distribution after first week', async () => {
            const depositAmount = String(ethers.utils.parseUnits('100000', 'ether'));

            // Travel past first week else this throws "Reward distribution has not started yet"
            await timeTravel(60 * 60 * 24 * 7);

            // Add test THX as allowed reward token (incentive)
            await rdthx.addAllowedRewardTokens([testBPT.address]);

            // Mint 10000 tokens for relayer to deposit into reward distributor
            await testBPT.mint(defaultAccount, depositAmount);

            // Deposit 10000 tokens into rdthx
            await testBPT.approve(rfthx.address, depositAmount);
            await rfthx.depositEqualWeeksPeriod(testBPT.address, depositAmount, '4');

            console.log(await rfthx.getUpcomingRewardsForNWeeks(testBPT.address, 0));
            console.log(await rfthx.getUpcomingRewardsForNWeeks(testBPT.address, 1));
            console.log(await rfthx.getUpcomingRewardsForNWeeks(testBPT.address, 2));
            console.log(await rfthx.getUpcomingRewardsForNWeeks(testBPT.address, 4));
        });
        it('Claim Tokens (after 8 days)', async () => {
            // Travel pas end date of the first reward eligible week
            await timeTravel(60 * 60 * 24 * 8);

            const balance = await testBPT.balanceOf(safeWallet.address);
            console.log(String(balance));

            let tx = await rdthx.claimToken(safeWallet.address, testBPT.address);
            tx = await tx.wait();
            console.log(tx.events);

            const event = tx.events.find((ev) => ev.event === 'TokenCheckpointed');
            expect(event).toBeDefined();

            const balanceAfterClaim = await testBPT.balanceOf(safeWallet.address);
            console.log(String(balanceAfterClaim));
        });
    });

    describe('Withdraw BPT', () => {
        it('Withdraw', async () => {
            const { status, body } = await user
                .post('/v1/ve/withdraw')
                .set({ Authorization: widgetAccessToken })
                .send({ isEarly: false, veAddress: vethx.address });
            expect(status).toBe(403);
            expect(body.error.message).toBe('Funds are locked');
        });

        it('Withdraw Early 1000 - penalty', async () => {
            const { status, body } = await user
                .post('/v1/ve/withdraw')
                .set({ Authorization: widgetAccessToken })
                .send({ isEarly: true, veAddress: vethx.address });
            expect(body.safeTxHash).toBeDefined();
            expect(status).toBe(201);

            const { signature } = await signTxHash(safeWallet.address, body.safeTxHash, userWalletPrivateKey);
            await user
                .post('/v1/account/wallet/confirm')
                .set({ Authorization: widgetAccessToken })
                .send({ chainId: ChainId.Hardhat, safeTxHash: body.safeTxHash, signature })
                .expect(200);
        });

        it('Balance = total + deposit - penalty', async () => {
            await poll(
                () => vethx.locked(safeWallet.address),
                (result: { amount: BigNumber }) => !BigNumber.from(result.amount).eq(0),
                1000,
            );

            const balanceInWei = await testBPT.balanceOf(safeWallet.address);
            const rdBalanceInWei = await testBPT.balanceOf(rdthx.address);

            // Due to early exit expect less BPT to be returned and the balance of
            // the penalty treasury to increase. Formula to calculate the penalty is in
            // the VE contract.
            // Eg:
            // balanceInWei     = 999917384259259259260000
            // rdBalanceInWei   =     82615740740740740000
            expect(balanceInWei.add(rdBalanceInWei).eq(totalSupplyInWei)).toBe(true);
        });
    });
});
