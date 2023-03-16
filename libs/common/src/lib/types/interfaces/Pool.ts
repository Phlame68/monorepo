import { TPointReward } from './PointReward';
import { Contract } from 'web3-eth-contract';
import { ChainId } from '../enums';

export type TPool = {
    _id: string;
    address: string;
    contract: Contract;
    chainId: ChainId;
    sub: string;
    transactions: string[];
    version?: string;
    variant?: 'defaultDiamond' | 'registry' | 'factory' | 'sharedWallet';
    archived?: boolean;
    title: string;
    settings: TPoolSettings;
};

export type TPoolSettings = {
    isTwitterSyncEnabled: boolean;
    discordWebhookUrl?: string;
    defaults: {
        conditionalRewards: TPointReward;
    };
};
