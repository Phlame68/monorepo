import mongoose from 'mongoose';
import { TReferralReward } from '@thxnetwork/types/';
import { rewardBaseSchema } from '@thxnetwork/api/models/ERC20Perk';

export type ReferralRewardDocument = mongoose.Document & TReferralReward;

const schema = new mongoose.Schema(
    {
        ...rewardBaseSchema,
        amount: Number,
        successUrl: String,
        token: String,
        isMandatoryReview: Boolean,
    },
    { timestamps: true },
);
schema.index({ createdAt: 1 });

export const ReferralReward = mongoose.model<ReferralRewardDocument>('ReferralRewards', schema);
