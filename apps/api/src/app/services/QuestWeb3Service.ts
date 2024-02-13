import { WalletDocument } from '../models/Wallet';
import { Web3QuestClaim } from '../models/Web3QuestClaim';
import { BigNumber, ethers } from 'ethers';
import { logger } from '@thxnetwork/api/util/logger';
import { IQuestService } from './interfaces/IQuestService';
import { TAccount, TWeb3Quest, TValidationResult, TWeb3QuestClaim } from '@thxnetwork/common/lib/types';
import { Web3Quest, Web3QuestDocument } from '../models/Web3Quest';

export default class QuestWeb3Service implements IQuestService {
    models = {
        quest: Web3Quest,
        entry: Web3QuestClaim,
    };

    findEntryMetadata(options: { quest: TWeb3Quest }) {
        return {};
    }

    async decorate({
        quest,
        wallet,
        account,
        data,
    }: {
        quest: TWeb3Quest;
        data: Partial<TWeb3QuestClaim>;
        account?: TAccount;
        wallet?: WalletDocument;
    }): Promise<TWeb3Quest & { isAvailable: boolean }> {
        const isAvailable = await this.isAvailable({ quest, wallet, account, data });

        return {
            ...quest,
            isAvailable: isAvailable.result,
            amount: quest.amount,
            contracts: quest.contracts,
            methodName: quest.methodName,
            threshold: quest.threshold,
        };
    }

    async isAvailable({
        quest,
        wallet,
        data,
    }: {
        quest: TWeb3Quest;
        wallet: WalletDocument;
        account: TAccount;
        data: Partial<TWeb3QuestClaim>;
    }): Promise<TValidationResult> {
        const ids = [];
        if (wallet) ids.push({ sub: wallet.sub });
        if (wallet) ids.push({ walletId: wallet._id });
        if (data && data.address) ids.push({ address: data.address });

        const isCompleted = wallet
            ? await Web3QuestClaim.exists({
                  questId: quest._id,
                  $or: ids,
              })
            : false;
        if (!isCompleted) return { result: true, reason: '' };

        return { result: false, reason: 'You have completed this quest with this account and/or address already.' };
    }

    async getAmount({ quest }: { quest: TWeb3Quest; wallet: WalletDocument; account: TAccount }): Promise<number> {
        return quest.amount;
    }

    async getValidationResult({
        quest,
        account,
        wallet,
        data,
    }: {
        quest: TWeb3Quest;
        account: TAccount;
        wallet: WalletDocument;
        data: Partial<TWeb3QuestClaim & { rpc: string }>;
    }): Promise<TValidationResult> {
        const { rpc, chainId, address } = data;
        const provider = new ethers.providers.JsonRpcProvider(rpc);
        const isClaimed = await Web3QuestClaim.exists({
            questId: quest._id,
            $or: [{ sub: account.sub }, { walletId: wallet._id }, { address }],
        });
        if (isClaimed) {
            return { result: false, reason: 'You have claimed this quest already' };
        }

        const contract = quest.contracts.find((c) => c.chainId === chainId);
        if (!contract) return { result: false, reason: 'Smart contract not found.' };

        const contractInstance = new ethers.Contract(
            contract.address,
            ['function ' + quest.methodName + '(address) view returns (uint256)'],
            provider,
        );

        let result: BigNumber;
        try {
            result = await contractInstance[quest.methodName](address);
        } catch (error) {
            logger.error(error);
            return { result: false, reason: `Smart contract call on ${name} failed` };
        }

        const threshold = BigNumber.from(quest.threshold);
        if (result.lt(threshold)) {
            return { result: false, reason: 'Result does not meet the threshold' };
        }

        return { result: true, reason: '' };
    }
}
