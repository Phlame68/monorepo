import AccountProxy from '@thxnetwork/api/proxies/AccountProxy';
import { CommandInteraction, User } from 'discord.js';
import PointBalanceService from '@thxnetwork/api/services/PointBalanceService';
import DiscordGuild from '@thxnetwork/api/models/DiscordGuild';
import { AssetPool, AssetPoolDocument } from '@thxnetwork/api/models/AssetPool';
import { PointBalance } from '@thxnetwork/api/models/PointBalance';
import SafeService from '@thxnetwork/api/services/SafeService';
import { WalletDocument } from '@thxnetwork/api/models/Wallet';

export enum DiscordCommandVariant {
    GivePoints = 0,
    RemovePoints = 1,
}

async function removePoints(
    pool: AssetPoolDocument,
    wallet: WalletDocument,
    sender: User,
    receiver: User,
    amount: number,
) {
    await PointBalanceService.subtract(pool, wallet._id, amount);

    const balance = await PointBalance.findOne({
        poolId: pool._id,
        walletId: wallet._id,
    });

    const senderMessage = `The balance of <@${receiver.id}> has been decreased with **${amount} points** and is now **${balance.balance}** !`;
    const receiverMessage = `<@${sender.id}> decreased your balance with **${amount}** resulting in a total of **${balance.balance} points**.`;

    return { senderMessage, receiverMessage };
}

async function addPoints(
    pool: AssetPoolDocument,
    wallet: WalletDocument,
    sender: User,
    receiver: User,
    amount: number,
) {
    await PointBalanceService.add(pool, wallet._id, amount);

    const balance = await PointBalance.findOne({
        poolId: pool._id,
        walletId: wallet._id,
    });
    const senderMessage = `The balance of <@${receiver.id}> has been increased with **${amount} points** and is now **${balance.balance}** !`;
    const receiverMessage = `<@${sender.id}> increased your balance with **${amount}** resulting in a total of **${balance.balance} points**.`;

    return { senderMessage, receiverMessage };
}

const pointsFunctionMap = {
    [DiscordCommandVariant.GivePoints]: addPoints,
    [DiscordCommandVariant.RemovePoints]: removePoints,
};

export const onSubcommandPoints = async (interaction: CommandInteraction, variant: DiscordCommandVariant) => {
    try {
        const account = await AccountProxy.getByDiscordId(interaction.user.id);
        if (!account) throw new Error('Please, connect your THX Account with Discord first.');

        const user = interaction.options.getUser('user');
        if (!user) throw new Error('Please, provide a valid username.');

        const discordGuild = await DiscordGuild.findOne({ guildId: interaction.guild.id });
        if (!discordGuild) throw new Error('Could not find server in database.');

        // Check role
        const member = await interaction.guild.members.fetch(user.id);
        if (!member.roles.cache.has(discordGuild.adminRoleId)) {
            const role = await interaction.guild.roles.fetch(discordGuild.adminRoleId);
            throw new Error(`Only **${role.name}** roles have access to this command!`);
        }

        const amount = interaction.options.get('amount');
        if (!amount.value || Number(amount.value) < 1) throw new Error('Please, provide a valid amount.');

        const receiver = await AccountProxy.getByDiscordId(user.id);
        if (!receiver) throw new Error('Please, ask receiver to connect his Discord account.');

        const pool = await AssetPool.findById(discordGuild.poolId);
        if (!pool) throw new Error('Could not find connected campaign.');

        const wallet = await SafeService.findPrimary(account.sub, pool.chainId);
        if (!wallet) throw new Error('Could not find your wallet.');

        // Determine if we should add or remove using pointsFunctionMap
        const { senderMessage, receiverMessage } = await pointsFunctionMap[variant](
            pool,
            wallet,
            interaction.user,
            user,
            Number(amount.value),
        );

        // Send reaction to caller
        interaction.reply({
            content: senderMessage,
            ephemeral: true,
        });

        // Send DM to user
        user.send({ content: receiverMessage });
    } catch (error) {
        interaction.reply({
            content: error.message,
            ephemeral: true,
        });
    }
};
export default { onSubcommandPoints };
