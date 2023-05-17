import { TokenGatingVariant } from '@thxnetwork/types/enums/TokenGatingVariant';
import { getContractFromName } from '../config/contracts';
import { fromWei } from 'web3-utils';
import { WalletDocument } from '../models/Wallet';
import { ERC20PerkDocument } from '../models/ERC20Perk';
import { ERC721PerkDocument } from '../models/ERC721Perk';
import { ShopifyPerkDocument } from '../models/ShopifyPerk';
import { AssetPoolDocument } from '../models/AssetPool';
import { ERC1155Token, ERC1155TokenDocument } from '../models/ERC1155Token';
import { ERC721Token, ERC721TokenDocument } from '../models/ERC721Token';
import WalletService from './WalletService';
import ERC1155Service from './ERC1155Service';
import ERC721Service from './ERC721Service';
import { ClaimDocument } from '../models/Claim';
import { ERC20PerkPayment } from '../models/ERC20PerkPayment';
import { ShopifyPerkPayment } from '../models/ShopifyPerkPayment';
import { ERC721PerkPayment } from '../models/ERC721PerkPayment';
import { isTERC20Perk, isTERC721Perk, isTShopifyPerk } from '../util/rewards';
import mongoose from 'mongoose';

type TAllPerks = ERC20PerkDocument | ERC721PerkDocument | ShopifyPerkDocument;

export async function verifyOwnership(
    { tokenGatingVariant, tokenGatingContractAddress, tokenGatingAmount }: TAllPerks,
    wallet: WalletDocument,
): Promise<boolean> {
    switch (tokenGatingVariant) {
        case TokenGatingVariant.ERC20: {
            const contract = getContractFromName(wallet.chainId, 'LimitedSupplyToken', tokenGatingContractAddress);
            const balance = Number(fromWei(await contract.methods.balanceOf(wallet.address).call(), 'ether'));

            return balance >= tokenGatingAmount;
        }
        case TokenGatingVariant.ERC721: {
            const contract = getContractFromName(wallet.chainId, 'NonFungibleToken', tokenGatingContractAddress);
            const balance = Number(await contract.methods.balanceOf(wallet.address).call());

            return !!balance;
        }
        case TokenGatingVariant.ERC1155: {
            const contract = getContractFromName(wallet.chainId, 'THX_ERC1155', tokenGatingContractAddress);
            const balance = Number(await contract.methods.balanceOf(wallet.address).call());
            return !!balance;
        }
    }
}

export async function getMetadata(perk: ERC721PerkDocument, token?: ERC721TokenDocument | ERC1155TokenDocument) {
    if (perk.erc721Id) {
        return await ERC721Service.findMetadataById(token ? token.metadataId : perk.metadataId);
    }
    if (perk.erc1155Id) {
        return await ERC1155Service.findMetadataById(token ? token.metadataId : perk.metadataId);
    }
}

export async function getToken(perk: ERC721PerkDocument) {
    if (perk.erc721Id) {
        return await ERC721Token.findById(perk.tokenId);
    }
    if (perk.erc1155Id) {
        return await ERC1155Token.findById(perk.tokenId);
    }
}

export async function getNFT(perk: ERC721PerkDocument) {
    if (perk.erc721Id) {
        return await ERC721Service.findById(perk.erc721Id);
    }
    if (perk.erc1155Id) {
        return await ERC1155Service.findById(perk.erc1155Id);
    }
}

export async function getIsLockedForWallet(perk: TAllPerks, wallet: WalletDocument) {
    if (!perk.tokenGatingContractAddress || !wallet) return;
    const isOwned = await verifyOwnership(perk, wallet);
    return !isOwned;
}

export async function getIsLockedForSub(perk: TAllPerks, sub: string, pool: AssetPoolDocument) {
    if (!perk.tokenGatingContractAddress) return;
    const wallet = await WalletService.findOneByQuery({ sub, chainId: pool.chainId });
    if (!wallet) return true;

    const isOwned = await verifyOwnership(perk, wallet);
    return !isOwned;
}

async function getProgress(r: TAllPerks, model: any) {
    return {
        count: await model.countDocuments({ perkId: r._id }),
        limit: r.limit,
    };
}

async function getExpiry(r: TAllPerks) {
    return {
        now: Date.now(),
        date: new Date(r.expiryDate).getTime(),
    };
}

type PerkDocument = ERC20PerkDocument | ERC721PerkDocument | ShopifyPerkDocument;

export function getPaymentModel(perk: PerkDocument): mongoose.Model<any> {
    if (isTERC20Perk(perk)) {
        return ERC20PerkPayment;
    }
    if (isTERC721Perk(perk)) {
        return ERC721PerkPayment;
    }
    if (isTShopifyPerk(perk)) {
        return ShopifyPerkPayment;
    }
}

export async function validate({
    perk,
    pool,
    sub,
}: {
    perk: PerkDocument;
    pool?: AssetPoolDocument;
    claim?: ClaimDocument;
    sub?: string;
}): Promise<{ isError: boolean; errorMessage?: string }> {
    const model = getPaymentModel(perk);
    if (!model) return { isError: true, errorMessage: 'Could not determine payment model.' };

    // Is gated and reqeust is made authenticated
    if (sub && pool && perk.tokenGatingContractAddress) {
        const isPerkLocked = await getIsLockedForSub(perk, sub, pool);
        if (isPerkLocked) {
            return { isError: true, errorMessage: 'This perk has been gated with a token.' };
        }
    }

    // Can be claimed only before the expiry date
    if (perk.expiryDate && new Date(perk.expiryDate).getTime() < Date.now()) {
        return { isError: true, errorMessage: 'This perk claim has expired.' };
    }

    // Can only be claimed for the amount of times per perk specified in the limit
    if (perk.limit > 0) {
        const amountOfPayments = await model.countDocuments({ perkId: perk._id });
        if (amountOfPayments >= perk.limit) {
            return { isError: true, errorMessage: "This perk has reached it's limit." };
        }
    }

    return { isError: false };
}

export default {
    verifyOwnership,
    getIsLockedForWallet,
    getExpiry,
    getProgress,
    getIsLockedForSub,
    getMetadata,
    getToken,
    getNFT,
    validate,
};
