export type TClaim = {
    sub?: string;
    uuid: string;
    poolId: string;
    rewardUuid: string;
    erc20Id?: string;
    erc721Id?: string;
    claimedAt?: Date;
    error?: string;
};
