import mongoose from 'mongoose';
import { TWallet } from '@thxnetwork/types/interfaces';

export type WalletDocument = mongoose.Document & TWallet;

const walletSchema = new mongoose.Schema(
    {
        uuid: String,
        poolId: String,
        address: String,
        sub: { type: String, index: 'hashed' },
        chainId: Number,
        version: String,
        safeVersion: String,
        variant: String,
    },
    { timestamps: true },
);

export const Wallet = mongoose.model<WalletDocument>('wallet', walletSchema);
