import mongoose from 'mongoose';
import { RewardVariant } from '@thxnetwork/types/enums';
import { TERC721Perk } from '@thxnetwork/types/interfaces';
import { perkBaseSchema } from '@thxnetwork/api/models/ERC20Perk';

export type ERC721PerkDocument = mongoose.Document & TERC721Perk;

const schema = new mongoose.Schema(
    {
        ...perkBaseSchema,
        variant: { type: Number, default: RewardVariant.NFT },
        erc721Id: String,
        erc1155Id: String,
        erc1155Amount: String,
        metadataId: String,
        tokenId: String,
        price: Number,
        priceCurrency: String,
        redirectUrl: String,
    },
    { timestamps: true },
);
schema.index({ createdAt: 1 });

export const ERC721Perk = mongoose.model<ERC721PerkDocument>('erc721perks', schema);
