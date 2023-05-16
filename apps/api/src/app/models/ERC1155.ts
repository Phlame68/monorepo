import mongoose from 'mongoose';
import { TERC1155 } from '@thxnetwork/types/interfaces';
import { getAbiForContractName } from '@thxnetwork/api/config/contracts';
import { getProvider } from '@thxnetwork/api/util/network';

export type ERC1155Document = mongoose.Document & TERC1155;

const ERC1155Schema = new mongoose.Schema(
    {
        variant: String,
        chainId: Number,
        sub: String,
        name: String,
        description: String,
        transactions: [String],
        address: String,
        baseURL: String,
        archived: Boolean,
        logoImgUrl: String,
    },
    { timestamps: true },
);

ERC1155Schema.virtual('contract').get(function () {
    if (!this.address) return;
    const { readProvider, defaultAccount } = getProvider(this.chainId);
    const abi = getAbiForContractName('THX_ERC1155');
    return new readProvider.eth.Contract(abi, this.address, { from: defaultAccount });
});

export interface IERC1155Updates {
    archived?: boolean;
}

export const ERC1155 = mongoose.model<ERC1155Document>('ERC1155', ERC1155Schema, 'erc1155');
