import mongoose from 'mongoose';
import { TWebhook } from '@thxnetwork/types/interfaces';

export type WebhookDocument = mongoose.Document & TWebhook;

const webhookSchema = new mongoose.Schema(
    {
        sub: String,
        poolId: String,
        url: String,
        requestAmount: Number,
        active: { default: false, type: Boolean },
    },
    { timestamps: true },
);

export const Webhook = mongoose.model<WebhookDocument>('Webhook', webhookSchema, 'wehbooks');
