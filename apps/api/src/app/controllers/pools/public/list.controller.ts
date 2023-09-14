import { Request, Response } from 'express';
import { NODE_ENV } from '@thxnetwork/api/config/secrets';
import { AssetPool, AssetPoolDocument } from '@thxnetwork/api/models/AssetPool';
import { Widget } from '@thxnetwork/api/models/Widget';
import { logger } from '@thxnetwork/api/util/logger';
import { ChainId } from '@thxnetwork/types/enums';
import BrandService from '@thxnetwork/api/services/BrandService';
import PoolService from '@thxnetwork/api/services/PoolService';
import { query } from 'express-validator';
import { PaginationResult } from '@thxnetwork/api/util/pagination';

export const paginatedResults = async (
    model: any,
    page: number,
    limit: number,
    search: string,
): Promise<PaginationResult> => {
    const startIndex = (page - 1) * limit;
    const $match = {
        chainId: NODE_ENV === 'production' ? ChainId.Polygon : ChainId.Hardhat,
        totalRewardsCount: { $gt: 0 },
    };

    if (search) {
        const $regex = new RegExp(
            search
                .split(/\s+/)
                .map((word) => `(?=.*${word})`)
                .join(''),
            'i',
        );
        $match['settings.title'] = { $regex };
    }
    const [result] = await model
        .aggregate([
            {
                $addFields: {
                    id: { $toString: '$_id' },
                },
            },
            {
                $lookup: {
                    from: 'participants',
                    localField: 'id',
                    foreignField: 'poolId',
                    as: 'participants',
                },
            },
            {
                $lookup: {
                    from: 'erc20perks',
                    localField: 'id',
                    foreignField: 'poolId',
                    as: 'erc20Perks',
                },
            },
            {
                $lookup: {
                    from: 'erc721perks',
                    localField: 'id',
                    foreignField: 'poolId',
                    as: 'erc721Perks',
                },
            },
            {
                $lookup: {
                    from: 'customrewards',
                    localField: 'id',
                    foreignField: 'poolId',
                    as: 'customRewards',
                },
            },
            {
                $addFields: {
                    totalRewardsCount: {
                        $size: {
                            $concatArrays: ['$erc20Perks', '$erc721Perks', '$customRewards'],
                        },
                    },
                    participantCount: { $size: '$participants' },
                },
            },
            {
                $facet: {
                    total: [{ $match }, { $count: 'count' }],
                    results: [
                        { $match },
                        {
                            $sort: { participantCount: -1 },
                        },
                        {
                            $skip: startIndex,
                        },
                        {
                            $limit: limit,
                        },
                    ],
                },
            },
            {
                $unwind: '$total',
            },
            {
                $project: {
                    total: '$total.count',
                    results: 1,
                },
            },
        ])
        .exec();
    return {
        limit,
        ...result,
    };
};

const validation = [query('page').isInt(), query('limit').isInt(), query('search').optional().isString()];

const controller = async (req: Request, res: Response) => {
    // #swagger.tags = ['Pools']
    const { page, limit, search } = req.query;
    const result = await paginatedResults(AssetPool, Number(page), Number(limit), search ? String(search) : '');

    result.results = await Promise.all(
        result.results.map(async (pool: AssetPoolDocument) => {
            try {
                const poolId = String(pool._id);
                const widget = await Widget.findOne({ poolId });
                if (!widget) return;

                const [brand, participants, quests, rewards] = await Promise.all([
                    BrandService.get(poolId),
                    PoolService.getParticipantCount(pool),
                    PoolService.getQuestCount(pool),
                    PoolService.getRewardCount(pool),
                ]);

                const progress = (() => {
                    const data = {
                        start: new Date(pool.createdAt).getTime(),
                        now: Date.now(),
                        end: new Date(pool.settings.endDate).getTime(),
                    };
                    const period = data.end - data.start;
                    const progress = data.now - data.start;
                    return (progress / period) * 100;
                })();

                return {
                    _id: pool._id,
                    title: pool.settings.title,
                    expiryDate: pool.settings.endDate,
                    address: pool.address,
                    chainId: pool.chainId,
                    domain: widget.domain,
                    logoImgUrl: brand && brand.logoImgUrl,
                    backgroundImgUrl: brand && brand.backgroundImgUrl,
                    // tags: ['Gaming', 'Web3'],
                    participants,
                    rewards: rewards.length,
                    quests: quests.length,
                    active: widget.active,
                    progress,
                };
            } catch (error) {
                logger.error(error);
            }
        }),
    );

    res.json(result);
};

export default { controller, validation };
