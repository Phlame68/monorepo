import { assertEvent, parseLogs } from '@thxnetwork/api/util/events';
import { ChainId, CollaboratorInviteState } from '@thxnetwork/types/enums';
import { AssetPool, AssetPoolDocument } from '@thxnetwork/api/models/AssetPool';
import TransactionService from './TransactionService';
import { diamondContracts, getContract, poolFacetAdressesPermutations } from '@thxnetwork/api/config/contracts';
import { pick, sleep } from '@thxnetwork/api/util';
import { diamondSelectors, getDiamondCutForContractFacets, updateDiamondContract } from '@thxnetwork/api/util/upgrades';
import { currentVersion } from '@thxnetwork/contracts/exports';
import { TransactionReceipt } from 'web3-eth-accounts/node_modules/web3-core';
import { TAssetPoolDeployCallbackArgs } from '@thxnetwork/api/types/TTransaction';
import { createDummyContents } from '../util/rewards';
import AccountProxy from '../proxies/AccountProxy';
import MailService from './MailService';
import { Widget } from './WidgetService';
import { PoolSubscription, PoolSubscriptionDocument } from '../models/PoolSubscription';
import { logger } from '../util/logger';
import { TAccount, TPointReward } from '@thxnetwork/types/interfaces';
import { AccountVariant } from '@thxnetwork/types/interfaces';
import { DailyRewardClaim } from '../models/DailyRewardClaims';
import { ReferralRewardClaim } from '../models/ReferralRewardClaim';
import { PointRewardClaim } from '../models/PointRewardClaim';
import { MilestoneRewardClaim } from '../models/MilestoneRewardClaims';
import { v4 } from 'uuid';
import { DailyReward } from '../models/DailyReward';
import { ReferralReward } from '../models/ReferralReward';
import { PointReward } from '../models/PointReward';
import { MilestoneReward } from '../models/MilestoneReward';
import { ERC20Perk } from '../models/ERC20Perk';
import { ERC721Perk } from '../models/ERC721Perk';
import { getsigningSecret } from '../util/signingsecret';
import { Web3Quest } from '../models/Web3Quest';
import { Web3QuestClaim } from '../models/Web3QuestClaim';
import { CustomReward } from '../models/CustomReward';
import { Participant } from '../models/Participant';
import { paginatedResults } from '../util/pagination';
import { PointBalance } from './PointBalanceService';
import SafeService from './SafeService';
import { Collaborator } from '../models/Collaborator';
import { DASHBOARD_URL } from '../config/secrets';
import { WalletDocument } from '../models/Wallet';
import { PointBalanceDocument } from '../models/PointBalance';

export const ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';

function isPoolClient(clientId: string, poolId: string) {
    return AssetPool.exists({ _id: poolId, clientId });
}

async function hasAccess(sub: string, poolId: string) {
    const isOwner = await AssetPool.exists({
        _id: poolId,
        sub,
    });
    const isCollaborator = await Collaborator.exists({ sub, poolId, state: CollaboratorInviteState.Accepted });
    return isOwner || isCollaborator;
}

function getById(id: string) {
    return AssetPool.findById(id);
}

function getByAddress(address: string) {
    return AssetPool.findOne({ address });
}

async function deploy(
    sub: string,
    chainId: ChainId,
    title: string,
    forceSync = true,
    dummyContent = true,
    startDate: Date,
    endDate?: Date,
): Promise<AssetPoolDocument> {
    const factory = getContract(chainId, 'Factory', currentVersion);
    const variant = 'defaultDiamond';
    const poolFacetContracts = diamondContracts(chainId, variant);
    const pool = await AssetPool.create({
        sub,
        chainId,
        version: currentVersion,
        token: v4(),
        signingSecret: getsigningSecret(64),
        settings: {
            title,
            description: '',
            startDate,
            endDate,
            isArchived: false,
            isWeeklyDigestEnabled: true,
            isTwitterSyncEnabled: false,
            defaults: {
                conditionalRewards: { title: 'Retweet this tweet', description: '', amount: 50 },
            },
            authenticationMethods: [
                AccountVariant.EmailPassword,
                AccountVariant.Metamask,
                AccountVariant.SSOGoogle,
                AccountVariant.SSODiscord,
            ],
        },
    });

    if (dummyContent) {
        await createDummyContents(pool);
    }

    const txId = await TransactionService.sendAsync(
        factory.options.address,
        factory.methods.deploy(getDiamondCutForContractFacets(poolFacetContracts, [])),
        pool.chainId,
        forceSync,
        {
            type: 'assetPoolDeployCallback',
            args: { chainId, assetPoolId: String(pool._id) },
        },
    );

    return AssetPool.findByIdAndUpdate(pool._id, { transactions: [txId] }, { new: true });
}

async function deployCallback(args: TAssetPoolDeployCallbackArgs, receipt: TransactionReceipt) {
    const { assetPoolId, chainId } = args;
    const contract = getContract(chainId, 'Factory');
    const pool = await getById(assetPoolId);
    const events = parseLogs(contract.options.jsonInterface, receipt.logs);
    const event = assertEvent('DiamondDeployed', events);
    pool.address = event.args.diamond;
    await pool.save();
}

async function getAllBySub(sub: string, archived = false) {
    const pools = await AssetPool.find({ sub, 'settings.isArchived': archived });
    const collaborations = await Collaborator.find({ sub });
    const poolIds = collaborations.map((c) => c.poolId);
    const collaborationPools = await AssetPool.find({ _id: poolIds });

    return pools.concat(collaborationPools);
}

function getAll() {
    return AssetPool.find({});
}

function findByAddress(address: string) {
    return AssetPool.findOne({
        address: address,
    });
}

async function countByNetwork(chainId: ChainId) {
    return AssetPool.countDocuments({ chainId });
}

async function contractVersionVariant(assetPool: AssetPoolDocument) {
    const permutations = Object.values(poolFacetAdressesPermutations(assetPool.chainId));
    const facets = await assetPool.contract.methods.facets().call();

    const facetAddresses = facets
        .filter((facet: any) => !facet.functionSelectors.every((sel: string) => diamondSelectors.includes(sel)))
        .map((facet: any) => facet.facetAddress);

    const match = permutations.find(
        (permutation) => permutation.facetAddresses.sort().join('') === facetAddresses.sort().join(''),
    );
    return match ? pick(match, ['version', 'variant']) : { version: 'unknown', variant: 'unknown' };
}

async function updateAssetPool(pool: AssetPoolDocument, version?: string) {
    const tx = await updateDiamondContract(pool.chainId, pool.contract, 'defaultDiamond', version);

    pool.version = version;

    await pool.save();

    return tx;
}

async function sendNotification(pool: AssetPoolDocument, reward: TPointReward) {
    const sleepTime = 60; // seconds
    const chunkSize = 600;

    const widget = await Widget.findOne({ poolId: pool._id });
    const subscriptions = await PoolSubscription.find({ poolId: pool._id }, { sub: 1, _id: 0 });
    const subs = subscriptions.map((x) => x.sub);

    for (let i = 0; i < subs.length; i += chunkSize) {
        const subsChunk = subs.slice(i, i + chunkSize);

        let html = `<p style="font-size: 18px">New reward!🔔</p>`;
        html += `You can earn <strong>${reward.amount} points ✨</strong> at <a href="${widget.domain}">${pool.settings.title}</a>.`;
        html += `<hr />`;
        html += `<strong>${reward.title}</strong><br />`;
        html += `<i>${reward.description}</i>`;

        const promises = subsChunk.map(async (sub) => {
            try {
                const account = await AccountProxy.getById(sub);
                if (!account.email) return;

                await MailService.send(account.email, `🎁 New Quest: "${reward.title}"`, html);
            } catch (error) {
                logger.error(error);
            }
        });

        await Promise.all(promises);
        await sleep(sleepTime);
    }
}

async function find(model: any, pool: AssetPoolDocument) {
    return await model.find({ poolId: String(pool._id) });
}

async function countBySub(model: any, pool: AssetPoolDocument) {
    return await model.count({ poolId: String(pool._id) }).distinct('sub');
}

async function getQuestCount(pool: AssetPoolDocument) {
    const result = await Promise.all(
        [DailyReward, ReferralReward, PointReward, MilestoneReward, Web3Quest].map(
            async (model) => await find(model, pool),
        ),
    );
    return Array.from(new Set(result.flat(1)));
}

async function getRewardCount(pool: AssetPoolDocument) {
    const result = await Promise.all(
        [ERC20Perk, ERC721Perk, CustomReward].map(async (model) => await find(model, pool)),
    );
    return Array.from(new Set(result.flat(1)));
}

async function findParticipants(pool: AssetPoolDocument, page: number, limit: number) {
    const participants = await paginatedResults(Participant, page, limit, {
        poolId: pool._id,
    });
    const subs = participants.results.map((p) => p.sub);
    const accounts = await AccountProxy.getMany(subs);

    async function attempt(fn: any) {
        try {
            await fn();
        } catch (error) {
            logger.error(error);
        }
    }

    participants.results = await Promise.all(
        participants.results.map(async (participant) => {
            let wallet: WalletDocument,
                account: TAccount,
                subscription: PoolSubscriptionDocument,
                pointBalance: PointBalanceDocument;

            attempt((wallet = await SafeService.findPrimary(participant.sub, pool.chainId)));
            attempt((account = accounts.find((a) => a.sub === wallet.sub)));
            attempt((subscription = await PoolSubscription.findOne({ poolId: pool._id, sub: account.sub })));
            attempt(
                (pointBalance = await PointBalance.findOne({
                    poolId: participant.poolId,
                    walletId: wallet._id,
                })),
            );

            return {
                ...participant.toJSON(),
                account,
                wallet,
                subscription,
                pointBalance: pointBalance ? pointBalance.balance : 0,
            };
        }),
    );

    return participants;
}

async function getParticipantCount(pool: AssetPoolDocument) {
    return await Participant.count({ poolId: pool._id });
}

async function inviteCollaborator(pool: AssetPoolDocument, email: string) {
    const uuid = v4();
    let collaborator = await Collaborator.findOne({ email, poolId: pool._id });

    if (collaborator) {
        collaborator = await Collaborator.findByIdAndUpdate(collaborator._id, { uuid }, { new: true });
    } else {
        collaborator = await Collaborator.create({
            email,
            uuid,
            poolId: pool._id,
            state: CollaboratorInviteState.Pending,
        });
    }

    const url = new URL(DASHBOARD_URL);
    url.pathname = 'collaborator';
    url.searchParams.append('poolId', pool._id);
    url.searchParams.append('collaboratorRequestToken', collaborator.uuid);

    await MailService.send(
        email,
        `👋 Collaboration Request: ${pool.settings.title}`,
        `<p>Hi!👋</p><p>You have received a collaboration request for Quest &amp; Reward campaign: <strong>${pool.settings.title}</strong></p>`,
        { src: url.href, text: 'Accept Request' },
    );

    return collaborator;
}

export default {
    isPoolClient,
    hasAccess,
    getById,
    getByAddress,
    deploy,
    deployCallback,
    getAllBySub,
    getAll,
    findByAddress,
    countByNetwork,
    contractVersionVariant,
    updateAssetPool,
    sendNotification,
    getParticipantCount,
    getQuestCount,
    getRewardCount,
    findParticipants,
    inviteCollaborator,
};
