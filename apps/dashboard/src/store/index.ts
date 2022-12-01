import Vue from 'vue';
import Vuex from 'vuex';

import AccountStore from './modules/account';
import PoolStore from './modules/pools';
import PromotionStore from './modules/promotions';
import PointRewardStore from './modules/pointRewards';
import WidgetStore from './modules/widgets';
import ERC20Store from './modules/erc20';
import ERC20RewardsStore from './modules/erc20Rewards';
import ERC721Store from './modules/erc721';
import ERC721RewardsStore from './modules/erc721Rewards';
import ReferralRewardRewardsStore from './modules/referralRewards';
import PaymentStore from './modules/payments';
import TransactionStore from './modules/transactions';
import SwapRuleStore from './modules/swaprules';
import ClientStore from './modules/clients';
import BrandStore from './modules/brands';
import ImageStore from './modules/images';

Vue.use(Vuex);

const mutations = {};
const actions = {};
const getters = {};
const modules = {
    account: AccountStore,
    pools: PoolStore,
    promotions: PromotionStore,
    pointRewards: PointRewardStore,
    widgets: WidgetStore,
    erc20: ERC20Store,
    erc20Rewards: ERC20RewardsStore,
    erc721: ERC721Store,
    erc721Rewards: ERC721RewardsStore,
    referralRewards: ReferralRewardRewardsStore,
    payments: PaymentStore,
    transactions: TransactionStore,
    swaprules: SwapRuleStore,
    clients: ClientStore,
    brands: BrandStore,
    images: ImageStore,
};

export default new Vuex.Store({
    state: {},
    getters,
    mutations,
    actions,
    modules,
});
