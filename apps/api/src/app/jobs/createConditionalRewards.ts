import { subMinutes } from 'date-fns';
import { RewardConditionInteraction, RewardConditionPlatform } from '@thxnetwork/types/enums';
import { IAccount } from '../models/Account';
import { AssetPool } from '../models/AssetPool';
import { PointReward } from '../models/PointReward';
import TwitterDataProxy from '../proxies/TwitterDataProxy';
import PointRewardService from '../services/PointRewardService';
import AccountProxy from '../proxies/AccountProxy';
import MailService from '../services/MailService';
import { twitterClient } from '../util/twitter';

export async function createConditionalRewards() {
    const endDate = new Date();
    const startDate = subMinutes(endDate, 15);

    for await (const pool of AssetPool.find({ 'settings.isTwitterSyncEnabled': true })) {
        const { isAuthorized } = await TwitterDataProxy.getTwitter(pool.sub);
        if (!isAuthorized) continue;

        const latestTweetsForPoolOwner = await TwitterDataProxy.getLatestTweets(pool.sub, startDate, endDate);
        if (!latestTweetsForPoolOwner.length) continue;

        const { hashtag, title, description, amount } = pool.settings.defaults.conditionalRewards;
        const filteredTweets = await Promise.all(
            latestTweetsForPoolOwner.filter(async (tweet: any) => {
                const isExistingReward = await PointReward.exists({ poolId: String(pool._id), content: tweet.id });
                return (
                    (!isExistingReward && !hashtag) ||
                    (!isExistingReward && hashtag && containsValue(tweet.text, hashtag))
                );
            }),
        );
        if (!filteredTweets.length) continue;

        const rewards = await Promise.all(
            filteredTweets.map(async (tweet) => {
                const contentMetadata = await getContentMetadata(filteredTweets[0].id);
                return await PointRewardService.create(pool, {
                    title,
                    description,
                    amount,
                    platform: RewardConditionPlatform.Twitter,
                    interaction: RewardConditionInteraction.TwitterRetweet,
                    content: tweet.id,
                    contentMetadata,
                });
            }),
        );

        const account: IAccount = await AccountProxy.getById(pool.sub);
        if (account.email) {
            await MailService.send(
                account.email,
                `Published ${rewards.length} reward${rewards.length && 's'}!`,
                `We discovered ${rewards.length} new tweet${
                    rewards.length && 's'
                } in your connected Twitter account! A conditional reward ${
                    rewards.length && 'for each'
                } has been published for your widget.`,
            );
        }
    }
}

function containsValue(text: string, hashtag: string) {
    return text.toLowerCase().includes('#' + hashtag.toLowerCase());
}

async function getContentMetadata(tweetId: string) {
    const { data } = await twitterClient({
        method: 'GET',
        url: `/tweets`,
        params: {
            ids: tweetId,
            expansions: 'author_id',
        },
    });
    const username = data.includes.users[0].username;

    return JSON.stringify({
        url: `https://twitter.com/${username}/status/${tweetId}`,
        username,
        text: data.data[0].text,
    });
}
