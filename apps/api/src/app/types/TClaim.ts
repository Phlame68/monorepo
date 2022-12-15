import mongoose from 'mongoose';

export type TClaim = {
    sub?: string;
    uuid: string;
    poolId: string;
    rewardUuid: string;
    erc20Id?: string;
    erc721Id?: string;
};
export type ClaimDocument = mongoose.Document & TClaim;
