import axios from 'axios';
import { AssetPool, AssetPoolDocument } from '@thxnetwork/api/models/AssetPool';
import { Webhook } from '@thxnetwork/api/models/Webhook';
import { WebhookRequest } from '@thxnetwork/api/models/WebhookRequest';
import { Job } from '@hokify/agenda';
import { agenda } from '@thxnetwork/api/util/agenda';
import { JobType } from '@thxnetwork/types/enums';
import { signPayload } from '@thxnetwork/api/util/signingsecret';
import { Event, WebhookRequestState } from '@thxnetwork/types/enums';

async function create(pool: AssetPoolDocument, payload: { event: Event; data: any }) {
    // TODO replace with CustomReward webhookId
    const webhook = await Webhook.findOne({ poolId: pool._id });
    if (!webhook) return;

    const webhookRequest = await WebhookRequest.create({
        webhookId: webhook._id,
        payload: JSON.stringify(payload),
        state: WebhookRequestState.Pending,
    });

    await agenda.now(JobType.RequestAttemp, { webhookRequestId: webhookRequest._id, poolId: pool._id });
}

async function requestAttemptJob(job: Job) {
    const { webhookRequestId, poolId } = job.attrs.data as any;
    const { signingSecret } = await AssetPool.findById(poolId);
    if (!signingSecret) return;

    const webhookRequest = await WebhookRequest.findById(webhookRequestId);
    if (!webhookRequest) return;
    const webhook = await Webhook.findById(webhookRequest.webhookId);
    if (!webhook) return;

    try {
        const signature = signPayload(webhookRequest.payload, signingSecret);
        await axios({
            method: 'POST',
            url: webhook.url,
            data: { signature, payload: webhookRequest.payload },
            headers: {
                'Content-Type': 'application/json',
            },
        });
    } catch (error) {
        console.error(error);
        await webhookRequest.updateOne({ status: WebhookRequestState.Failed });
    } finally {
        await webhookRequest.updateOne({ attempt: webhookRequest.attempts++ });
    }
}

export default {
    create,
    requestAttemptJob,
};
