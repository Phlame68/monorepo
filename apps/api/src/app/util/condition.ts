import { IAccount } from '@thxnetwork/api/models/Account';
import TwitterDataProxy from '@thxnetwork/api/proxies/TwitterDataProxy';
import YouTubeDataProxy from '@thxnetwork/api/proxies/YoutubeDataProxy';
import DiscordDataProxy from '@thxnetwork/api/proxies/DiscordDataProxy';

import { RewardConditionPlatform, RewardConditionInteraction, TBaseReward } from '@thxnetwork/types/index';
import { Claim } from '@thxnetwork/api/models/Claim';

export const validateCondition = async (
    account: IAccount,
    reward: TBaseReward,
): Promise<{ result?: boolean; error?: string }> => {
    // If not platform skip condition validation
    if (reward.platform === RewardConditionPlatform.None) {
        return { result: true };
    }

    switch (reward.interaction) {
        case RewardConditionInteraction.YouTubeLike: {
            const result = await YouTubeDataProxy.validateLike(account, reward.content);
            if (!result) return { error: 'Youtube: Video has not been liked.' };
            break;
        }
        case RewardConditionInteraction.YouTubeSubscribe: {
            const result = await YouTubeDataProxy.validateSubscribe(account, reward.content);
            if (!result) return { error: 'Youtube: Not subscribed to channel.' };
            break;
        }
        case RewardConditionInteraction.TwitterLike: {
            const result = await TwitterDataProxy.validateLike(account, reward.content);
            if (!result) return { error: 'Twitter: Tweet has not been liked.' };
            break;
        }
        case RewardConditionInteraction.TwitterRetweet: {
            const result = await TwitterDataProxy.validateRetweet(account, reward.content);
            if (!result) return { error: 'Twitter: Tweet is not retweeted.' };
            break;
        }
        case RewardConditionInteraction.TwitterFollow: {
            const result = await TwitterDataProxy.validateFollow(account, reward.content);
            if (!result) return { error: 'Twitter: Account is not followed.' };
            break;
        }
        case RewardConditionInteraction.DiscordGuildJoined: {
            const result = await DiscordDataProxy.validateGuildJoined(account, reward.content);
            if (!result) return { error: 'Discord: Account not yet joined guild.' };
            break;
        }
    }
    return { result: true };
};
