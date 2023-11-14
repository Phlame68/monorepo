import { Message } from 'discord.js';
import { logger } from '../util/logger';
import DiscordMessage from '../models/DiscordMessage';
import DiscordGuild from '../models/DiscordGuild';
import { PointReward, PointRewardDocument } from '../models/PointReward';
import { RewardConditionInteraction } from '@thxnetwork/common/lib/types';
import AccountProxy from '../proxies/AccountProxy';

const onMessageCreate = async (message: Message) => {
    try {
        // Only record messages for connected accounts
        const connectedAccount = await AccountProxy.getByDiscordId(message.author.id);
        if (!connectedAccount) return;

        logger.info(`#${message.author.id} created message ${message.id} in guild ${message.guild.id}`);

        const start = new Date();
        start.setUTCHours(0, 0, 0, 0);

        const end = new Date(start);
        end.setUTCHours(23, 59, 59, 999);

        const guild = await DiscordGuild.findOne({ guildId: message.guild.id });
        const quests = await PointReward.find({
            poolId: guild.poolId,
            interaction: RewardConditionInteraction.DiscordMessage,
        });
        if (!quests.length) return;

        // Count the total amount of messages for today
        const dailyMessageCount = await DiscordMessage.countDocuments({
            guildId: message.guild.id,
            memberId: message.author.id,
            createdAt: { $gte: start, $lt: end },
        });

        // Get the highest limit for all available discord message quests in this campaign
        const dailyMessageLimit = quests.reduce((highestLimit: number, quest: PointRewardDocument) => {
            const { limit } = JSON.parse(quest.contentMetadata);
            return limit > highestLimit ? limit : highestLimit;
        }, 0);

        console.log(dailyMessageCount, dailyMessageLimit);

        // Only track messages if daily limit has not been surpassed
        if (dailyMessageCount > dailyMessageLimit) return;
        await DiscordMessage.create({
            messageId: message.id,
            guildId: message.guild.id,
            memberId: message.author.id,
        });
    } catch (error) {
        logger.error(error);
    }
};

export default onMessageCreate;
