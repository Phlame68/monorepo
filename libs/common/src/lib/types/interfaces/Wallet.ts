import { ChainId } from '../enums';
import { Contract } from 'web3-eth-contract';

export type TWallet = {
    _id?: string;
    sub: string;
    chainId: ChainId;
    address?: string;
    poolId?: string;
    uuid?: string;
    contract?: Contract;
    version?: string;
    isUpgradeAvailable?: boolean;
    createdAt?: Date;
};
