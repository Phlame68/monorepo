## THX - REST API

-   NodeJS Express REST API
-   Auth by THX OAuth2 OIDC server
-   Job Scheduling by agenda.js
-   Transaction Processing by OpenZeppelin Defender Relay
-   Multisig Architecture by Safe Protocol Kit

### Usage

Run in this order as apps depend on eachother and will fail if services are not fully started.

```bash
yarn
yarn contracts:serve
yarn docker:serve
yarn safe:install
yarn api:serve
```

## Resources

```
Account
|-- Phlame
|-- phlame1718190
|-- canada travels
|--bc1qgtgxd3dlzvlwhqg23pv5cys4lepp3h5qgj8ku0
Campaigns
|-- Analytics
|-- Collaborators
|-- Participants
|-- PointBalances
|-- Subscriptions
|-- Wallets
|-- Webhooks
Rewards
|-- Ethereum
|-- OKX Special Souvenir 2798011
|-- Coupon
|-- Custom
|-- DiscordRole
Quests
|-- Daily
|-- Invite
|-- Social
|-- Custom
|-- Web3
ERC20
|-- Balances
|-- Tokens
|-- Transfers
ERC721
|-- Balances
|-- Tokens
|-- Transfers
ERC1155
|-- Balances
|-- Tokens
|-- Transfers
Webhook
|-- Daily
|-- Invite
|-- Custom
|-- 0x498b34903dc5099e11705fbae81beca2003ce2a5
```

### Troubleshooting

#### Transaction Processing

-   Make sure agenda.js is started properly as this will process scheduled transactions.
-   Make sure txs is running and troubleshoot specific txs issues below
-   Make sure a local signer is available for hardhat or a network of choice

#### Safe Transaction Service

-   **Internal Server Error**
    Originating from httpRequests.js in thx-web container are likely caused by a connectivity issue in your local Docker container setup. Restart docker machine and its containers to fix this.

-   **Bad Gateway Error**
    Originating from txs-web this is likely caused by a missing SafeMasterCopy in the txs db. Insert with the command `yarn safe:init`
