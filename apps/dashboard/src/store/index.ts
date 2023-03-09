import Vue from 'vue';
import Vuex from 'vuex';

import AccountStore from './modules/account';
import PoolStore from './modules/pools';
import PointRewardStore from './modules/pointRewards';
import WidgetStore from './modules/widgets';
import ERC20Store from './modules/erc20';
import ERC20PerksStore from './modules/erc20Perks';
import ERC721Store from './modules/erc721';
import ERC1155Store from './modules/erc1155';
import ERC721PerksStore from './modules/erc721Perks';
import ShopifyPerksStore from './modules/shopifyPerks';
import ReferralRewardRewardsStore from './modules/referralRewards';
import ReferralRewardRewardClaimsStore from './modules/referralRewardClaims';
import SwapRuleStore from './modules/swaprules';
import ClientStore from './modules/clients';
import BrandStore from './modules/brands';
import ImageStore from './modules/images';
import MilestoneRewardStore from './modules/milestoneRewards';
import DailyRewardStore from './modules/dailyRewards';
import MerchantStore from './modules/merchants';

Vue.use(Vuex);

const mutations = {};
const actions = {};
const getters = {};
const modules = {
    account: AccountStore,
    pools: PoolStore,
    pointRewards: PointRewardStore,
    widgets: WidgetStore,
    erc20: ERC20Store,
    erc20Perks: ERC20PerksStore,
    erc721: ERC721Store,
    erc1155: ERC1155Store,
    erc721Perks: ERC721PerksStore,
    shopifyPerks: ShopifyPerksStore,
    referralRewards: ReferralRewardRewardsStore,
    referralRewardClaims: ReferralRewardRewardClaimsStore,
    swaprules: SwapRuleStore,
    clients: ClientStore,
    brands: BrandStore,
    images: ImageStore,
    milestoneRewards: MilestoneRewardStore,
    dailyRewards: DailyRewardStore,
    merchants: MerchantStore,
};

export default new Vuex.Store({
    state: {},
    getters,
    mutations,
    actions,
    modules,
});
