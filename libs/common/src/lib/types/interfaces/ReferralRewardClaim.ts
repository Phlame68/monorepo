export type TReferralRewardClaim = {
    referralRewardId: string;
    sub: string;
    uuid: string;
    amount: number;
    isApproved: boolean;
    createdAt: Date;
    poolId: string;
};
