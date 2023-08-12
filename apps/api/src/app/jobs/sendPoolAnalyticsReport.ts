import { TAccount } from '@thxnetwork/types/interfaces';
import { AssetPool } from '../models/AssetPool';
import AccountProxy from '../proxies/AccountProxy';
import MailService from '../services/MailService';
import * as AnalyticsService from '../services/AnalyticsService';
import { DASHBOARD_URL } from '../config/secrets';
import { logger } from '../util/logger';

const emojiMap = ['🥇', '🥈', '🥉'];
const oneDay = 86400000; // one day in milliseconds

export async function sendPoolAnalyticsReport() {
    const endDate = new Date();
    endDate.setHours(0, 0, 0, 0);

    const startDate = new Date(new Date(endDate).getTime() - oneDay * 7);
    const dateRange = { startDate, endDate };

    let account: TAccount;

    for await (const pool of AssetPool.find({ 'settings.isWeeklyDigestEnabled': true })) {
        try {
            if (!account || account.sub != pool.sub) account = await AccountProxy.getById(pool.sub);
            if (!account.email) continue;

            const { dailyQuest, inviteQuest, socialQuest, customQuest, coinReward, nftReward } =
                await AnalyticsService.getPoolMetrics(pool, dateRange);
            const leaderBoard = await AnalyticsService.getLeaderboard(pool);
            const totalPointsClaimed =
                dailyQuest.totalAmount + inviteQuest.totalAmount + socialQuest.totalAmount + customQuest.totalAmount;
            const totalPointsSpent = coinReward.totalAmount + nftReward.totalAmount;

            // Skip if nothing happened.
            if (!totalPointsClaimed && !totalPointsSpent) continue;

            let html = `<p style="font-size: 18px">Hi there!👋</p>`;
            html += `<p>We're pleased to bring you the <strong>Weekly Digest</strong> for "${pool.settings.title}".</p>`;
            html += `<hr />`;

            html += `<p><strong>🏆 Quests: </strong> ${totalPointsClaimed} points claimed</p>`;
            html += `<table width="100%" role="presentation" border="0" cellpadding="0" cellspacing="0">`;
            if (dailyQuest.total) {
                html += `<tr>
                <td><strong>${dailyQuest.claims}x</strong> Daily - ${dailyQuest.totalClaimPoints} pts</td>
                <td align="right"><a href="${DASHBOARD_URL}/pool/${pool._id}/daily">Manage</a></td>
                `;
            }
            if (inviteQuest.total) {
                html += `<tr>
                <td><strong>${inviteQuest.claims}x</strong> Invite - ${inviteQuest.totalClaimPoints} pts)</td>
                <td align="right"><a href="${DASHBOARD_URL}/pool/${pool._id}/referrals">Manage</a></td>
                </tr>`;
            }
            if (socialQuest.total) {
                html += `<tr>
                <td><strong>${socialQuest.claims}x</strong> Social - ${socialQuest.totalClaimPoints} pts</td>
                <td align="right"><a href="${DASHBOARD_URL}/pool/${pool._id}/conditionals">Manage</a></td>
                </tr>`;
            }
            if (customQuest.total) {
                html += `<tr>
                <td><strong>${customQuest.claims}x</strong> Custom - ${customQuest.totalClaimPoints} pts</td>
                <td align="right"><a href="${DASHBOARD_URL}/pool/${pool._id}/milestone-rewards">Manage</a></td>
                </tr>`;
            }
            html += `</table>`;
            html += `<hr />`;

            html += `<p><strong>🎁 Rewards: </strong> ${totalPointsSpent} points spent</p>`;
            html += `<table width="100%" role="presentation" border="0" cellpadding="0" cellspacing="0">`;
            if (coinReward.total) {
                html += `<tr>
                <td><strong>${coinReward.payments}x</strong> Coin Rewards (${coinReward.totalAmount} points)</td>
                <td align="right" ><a href="${DASHBOARD_URL}/pool/${pool._id}/erc20-perks">Manage</a></td>
                </tr>`;
            }
            if (nftReward.total) {
                html += `<tr>
                <td><strong>${nftReward.total}x</strong> NFT Rewards (${nftReward.totalAmount} points)</td>
                <td align="right"><a href="${DASHBOARD_URL}/pool/${pool._id}/erc721-perks">Manage</a></td>
                </tr>`;
            }
            html += `</table>`;
            html += `<hr />`;

            html += `<p style="font-size:16px"><strong>Top 3</strong></p>`;
            html += `<table role="presentation" border="0" cellpadding="0" cellspacing="0">`;

            for (const index in leaderBoard) {
                const entry = leaderBoard[index];
                html += `<tr>
                <td width="5%">${emojiMap[index]}</td>
                <td><strong>${entry.account.firstName || '...'}</strong> ${entry.wallet.address.substring(0, 8)}...</td>
                <td align="right" width="25%"><strong>${entry.score} Points</strong></td>
                </tr>`;
            }
            html += '</table>';
            html += `<a href="${DASHBOARD_URL}/pool/${pool._id}/dashboard">Full leaderboard</a>`;

            await MailService.send(account.email, `🎁 Weekly Digest: "${pool.settings.title}"`, html);
        } catch (error) {
            logger.error(error);
        }
    }
}
