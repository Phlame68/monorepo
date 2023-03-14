import { DiamondVariant } from '@thxnetwork/contracts/exports';
import { Contract } from 'web3-eth-contract';
import { ChainId } from './enums';

export type TAssetPool = {
    address: string;
    contract: Contract;
    chainId: ChainId;
    erc20Id: string;
    erc721Id: string;
    clientId: string;
    sub: string;
    transactions: string[];
    lastTransactionAt?: number;
    version?: string;
    variant?: DiamondVariant;
    archived?: boolean;
    title: string;
    discordWebhookUrl?: string;
    isTwitterSyncEnabled: boolean;
    defaultTwitterConditionalRewardSettings?: string;
};
