import ERC20Manager from '../managers/ERC20Manager';
import ERC721Manager from '../managers/ERC721Manager';
import ERC1155Manager from '../managers/ERC1155Manager';
import RequestManager from '../managers/RequestManager';
import AccountManager from '../managers/AccountManager';
import WalletManager from '../managers/WalletManager';
import QuestManager from '../managers/QuestManager';
import RewardManager from '../managers/RewardManager';
import ClaimsManager from '../managers/ClaimsManager';
import PoolManager from '../managers/PoolManager';
import PointBalanceManager from '../managers/PointBalanceManager';

type THXClientOptions = {
    url: string;
    poolId: string;
    accessToken: string;
};

export default class THXClient {
    options: THXClientOptions;

    request: RequestManager;
    account: AccountManager;
    erc20: ERC20Manager;
    erc721: ERC721Manager;
    erc1155: ERC1155Manager;
    wallets: WalletManager;
    quests: QuestManager;
    rewards: RewardManager;
    claims: ClaimsManager;
    pools: PoolManager;
    pointBalance: PointBalanceManager;

    constructor(options: THXClientOptions) {
        this.options = options;

        this.request = new RequestManager(this);
        this.account = new AccountManager(this);
        this.erc20 = new ERC20Manager(this);
        this.erc721 = new ERC721Manager(this);
        this.erc1155 = new ERC1155Manager(this);
        this.wallets = new WalletManager(this);
        this.quests = new QuestManager(this);
        this.rewards = new RewardManager(this);
        this.claims = new ClaimsManager(this);
        this.pools = new PoolManager(this);
        this.pointBalance = new PointBalanceManager(this);
    }
}
