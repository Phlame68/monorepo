import path from 'path';
import db from '@thxnetwork/api/util/database';
import { AssetPool } from '@thxnetwork/api/models/AssetPool';
import { ChainId, RewardConditionInteraction, RewardConditionPlatform } from '@thxnetwork/types/enums';
import { Widget } from '@thxnetwork/api/models/Widget';
import { DailyReward } from '@thxnetwork/api/models/DailyReward';
import { ReferralReward } from '@thxnetwork/api/models/ReferralReward';
import { PointReward } from '@thxnetwork/api/models/PointReward';
import { MilestoneReward } from '@thxnetwork/api/models/MilestoneReward';
import {
    readCSV,
    getYoutubeID,
    getTwitterUsername,
    createPool,
    getSuggestion,
    getTwitterTWeet,
    getTwitterUser,
} from './helpers/index';
import { ERC20Perk } from '@thxnetwork/api/models/ERC20Perk';

// db.connect(process.env.MONGODB_URI);
db.connect(process.env.MONGODB_URI_PROD);

const csvFilePath = path.join(__dirname, '../../../', 'quests.csv');
// const sub = '60a38b36bf804b033c5e3faa'; // Local
const sub = '6074cbdd1459355fae4b6a14'; // Prod
// const chainId = ChainId.Hardhat;
const chainId = ChainId.Polygon;
const erc20Id = '6464c665633c1cf385d8cc2b'; // THX Network (POS) on Prod

async function main() {
    const start = Date.now();
    const skipped = [];
    const results = [];
    console.log('Start', new Date());

    let tokens = 0;
    try {
        const data: any = await readCSV(csvFilePath);

        for (const sql of data) {
            const videoUrl = sql['Youtube Video URL'];
            const tweetUrl = sql['Twitter Tweet URL'];
            const serverId = sql['Discord Server ID'];
            const isScheduled = sql['Contacted'] !== 'Scheduled';
            const hasPreview = sql['Campaign Preview'];
            const gameName = sql['Game'];
            const gameDomain = sql['Game Domain'];
            if (isScheduled || hasPreview || !gameName || !gameDomain) continue;

            console.log('===============');
            console.log('Import: ', gameName, gameDomain);

            let pool = await AssetPool.findOne({ 'settings.title': gameName });
            if (pool) {
                await Widget.updateOne({ poolId: pool._id }, { domain: new URL(gameDomain).origin });
            } else {
                pool = await createPool(sub, chainId, gameName, gameDomain);
            }

            const poolId = pool ? pool._id : 'testtest';

            // Remove all existing quests
            await Promise.all([
                DailyReward.deleteMany({ poolId }),
                ReferralReward.deleteMany({ poolId }),
                PointReward.deleteMany({ poolId }),
                MilestoneReward.deleteMany({ poolId }),
                ERC20Perk.deleteMany({ poolId, erc20Id }),
            ]);

            // Create social quest youtube like
            if (videoUrl && videoUrl !== 'N/A') {
                const videoId = getYoutubeID(videoUrl);
                const socialQuestYoutubeLike = {
                    poolId,
                    uuid: db.createUUID(),
                    title: `Watch & Like`,
                    description: '',
                    amount: 75,
                    platform: RewardConditionPlatform.Google,
                    interaction: RewardConditionInteraction.YouTubeLike,
                    content: videoId,
                    contentMetadata: JSON.stringify({ videoId }),
                };
                await PointReward.create(socialQuestYoutubeLike);
            }

            // Create social quest twitter retweet
            if (tweetUrl && tweetUrl !== 'N/A') {
                const username = getTwitterUsername(tweetUrl);
                const twitterUser = await getTwitterUser(username);
                const socialQuestFollow = {
                    poolId,
                    uuid: db.createUUID(),
                    title: `Follow ${sql['Game']}`,
                    description: '',
                    amount: 75,
                    platform: RewardConditionPlatform.Twitter,
                    interaction: RewardConditionInteraction.TwitterFollow,
                    content: twitterUser.id,
                    contentMetadata: JSON.stringify({
                        id: twitterUser.id,
                        name: twitterUser.name,
                        username: twitterUser.username,
                        profileImgUrl: twitterUser.profile_image_url,
                    }),
                };
                await PointReward.create(socialQuestFollow);

                const tweetId = tweetUrl.match(/\/(\d+)(?:\?|$)/)[1];
                const [tweet] = await getTwitterTWeet(tweetId);
                const socialQuestRetweet = {
                    poolId,
                    uuid: db.createUUID(),
                    title: `Boost Tweet!`,
                    description: '',
                    amount: 50,
                    platform: RewardConditionPlatform.Twitter,
                    interaction: RewardConditionInteraction.TwitterRetweet,
                    content: tweetId,
                    contentMetadata: JSON.stringify({
                        url: tweetUrl,
                        username: twitterUser.username,
                        text: tweet.text,
                    }),
                };
                await PointReward.create(socialQuestRetweet);
            }

            // Create social quest twitter retweet
            if (serverId && serverId !== 'N/A') {
                const inviteURL = sql['Discord Invite URL'];
                const socialQuestJoin = {
                    poolId,
                    uuid: db.createUUID(),
                    title: `Join ${gameName} Discord`,
                    description: 'Become a part of our fam!',
                    amount: 75,
                    platform: RewardConditionPlatform.Discord,
                    interaction: RewardConditionInteraction.DiscordGuildJoined,
                    content: serverId,
                    contentMetadata: JSON.stringify({ serverId, inviteURL: inviteURL || undefined }),
                };
                await PointReward.create(socialQuestJoin);
            }

            // Create default erc20 rewards
            if (serverId && serverId !== 'N/A') {
                await ERC20Perk.create({
                    poolId,
                    uuid: db.createUUID(),
                    title: `Small bag of $THX`,
                    description: 'A token of appreciation offered to you by THX Network.',
                    image: 'https://thx-storage-bucket.s3.eu-west-3.amazonaws.com/widget-referral-xmzfznsqschvqxzvgn47qo-xtencq4fmgjg7qgwewmybj-(1)-8EHr7ckbrEZLqUyxqJK1LG.png',
                    pointPrice: 1000,
                    limit: 1000,
                    amount: 10,
                    erc20Id,
                });

                await ERC20Perk.create({
                    poolId,
                    uuid: db.createUUID(),
                    title: `Large bag of $THX`,
                    description: 'A token of appreciation offered to you by THX Network.',
                    image: 'https://thx-storage-bucket.s3.eu-west-3.amazonaws.com/widget-referral-xmzfznsqschvqxzvgn47qo-xtencq4fmgjg7qgwewmybj-(1)-8EHr7ckbrEZLqUyxqJK1LG.png',
                    pointPrice: 5000,
                    limit: 100,
                    amount: 100,
                    erc20Id,
                });
            }

            // Iterate over available quests and create
            for (let i = 1; i < 4; i++) {
                const questType = sql[`Q${i} - Type`];
                const points = sql[`Q${i} - Points`];
                const title = sql[`Q${i} - Title`];
                if (!questType || !points || !title) {
                    console.log(`Incomplete Q${i}!`);
                    continue;
                }

                let titleSuggestion, descriptionSuggestion;
                if (['Daily', 'Custom'].includes(questType)) {
                    titleSuggestion = await getSuggestion(sql[`Q${i} - Title`], 40);
                    tokens += titleSuggestion.tokensUsed;
                    descriptionSuggestion = await getSuggestion(sql[`Q${i} - Description`], 100);
                    tokens += descriptionSuggestion.tokensUsed;
                }

                switch (questType) {
                    case 'Daily': {
                        const dailyQuest = {
                            poolId,
                            title: titleSuggestion.content,
                            description: descriptionSuggestion.content,
                            amounts: [5, 10, 20, 40, 80, 160, 360],
                        };
                        await DailyReward.create(dailyQuest);
                        console.log(sql[`Q${i} - Type`], titleSuggestion.content, 'quest created!');
                        break;
                    }
                    case 'Custom': {
                        const customQuest = {
                            poolId,
                            title: titleSuggestion.content,
                            description: descriptionSuggestion.content,
                            amount: Number(sql[`Q${i} - Points`]),
                            limit: 0,
                        };
                        await MilestoneReward.create(customQuest);
                        console.log(sql[`Q${i} - Type`], titleSuggestion.content, 'quest created!');
                        break;
                    }
                    default: {
                        console.log(sql[`Q${i} - Type`], 'quest skipped...');
                    }
                }
            }
            results.push([sql['Game'], `https://dashboard.thx.network/preview/${pool._id}`]);
        }
    } catch (err) {
        console.error(err);
    }
    console.log('===============');
    console.log('COPY BELOW INTO SHEET');
    console.log('===============');
    results.forEach((item) => {
        console.log(`${item[0]}\t${item[1]}`);
    });
    console.log('===============');
    console.log('Skipped', skipped);
    console.log('End', new Date());
    console.log('Duration', Date.now() - start, 'seconds');
    console.log('Tokens Spent', tokens);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
