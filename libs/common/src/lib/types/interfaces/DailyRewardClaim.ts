export type TDailyRewardClaim = {
    dailyRewardId: string;
    sub: string;
    uuid: string;
    amount: number;
    poolId: string;
    createdAt?: Date;
};
