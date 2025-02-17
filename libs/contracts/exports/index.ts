import { version as currentVersion } from '../package.json';
import { AbiItem } from 'web3-utils';
import Launchpad from './abis/Launchpad.json';
import VotingEscrow from './abis/VotingEscrow.json';
import RewardDistributor from './abis/RewardDistributor.json';
import SmartWalletWhitelist from './abis/SmartWalletWhitelist.json';
import RewardFaucet from './abis/RewardFaucet.json';
import LensReward from './abis/LensReward.json';
import BalMinter from './abis/BalancerMinter.json';
import BPT from './abis/BPT.json';
import BPTGauge from './abis/BPTGauge.json';
import BAL from './abis/BAL.json';
import THX from './abis/THX.json';
import USDC from './abis/USDC.json';
import BalancerVault from './abis/BalancerVault.json';
import { ContractNetworksConfig } from '@safe-global/protocol-kit';

export const contractNetworks = {
    '31337': {
        // Safe
        safeMasterCopyAddress: '0xC44951780f195Ed71145e3d0d2F25726A097C348',
        safeProxyFactoryAddress: '0x1122fD9eBB2a8E7c181Cc77705d2B4cA5D72988A',
        multiSendAddress: '0x7E4728eFfC9376CC7C0EfBCc779cC9833D83a984',
        multiSendCallOnlyAddress: '0x75Cbb6C4Db4Bb4f6F8D5F56072A6cF4Bf4C5413C',
        fallbackHandlerAddress: '0x5D3D550Da6678C0444F5D77Ca086678D9CdeEecA',
        signMessageLibAddress: '0x658FAD2acB6d1E615f295E566ee9a6d32Cc97b10',
        createCallAddress: '0x40Efd8a16485213445E6d8b9a4266Fd2dFf7C69a',
        simulateTxAccessorAddress: '0xFF1eE64b8806C0891e8F73b37f8403F441b552E1',
        // Tokens
        THX: '0xc368fA6A4057BcFD9E49221d8354d5fA6B88945a',
        USDC: '0x439F0128d07f005e0703602f366599ACaaBfEA18',
        BAL: '0x24E91C3a2822bDc4bc73512872ab07fD93c8101b',
        BPT: '0x76aBe9ec9b15947ba1Ca910695B8b6CffeD8E6CA',
        BPTGauge: '0x7Cb8d1EAd6303C079c501e93F3ba28C227cd7000',
        BalancerVault: '0xb3B2b0fc5ce12aE58EEb13E19547Eb2Dd61A79D5',

        // veTHX
        VotingEscrow: '0xe3C1Fda814032919F7CE63D9c3cd5C0F9a579d1A',
        RewardDistributor: '0xf0Ac139fD5362E2823667c7F9dD7238b020D44EC',
        RewardFaucet: '0x879E73B20973d78c55b5B07566A3355327Db47bd',
        SmartWalletWhitelist: '0xD4702511e43E2b778b34185A59728B57bE61aEd1',
        LensReward: '0x36260689483bc55753E3258725f31E8aee31A7B0',
    },
    '137': {
        // Tokens
        BPT: '0xb204BF10bc3a5435017D3db247f56dA601dFe08A',
        BPTGauge: '0xf16BECC1Bcaf0fF0b865024a644a4da1A2f8585c',
        BalancerVault: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
        BAL: '0x9a71012B13CA4d3D0Cdc72A177DF3ef03b0E76A3',
        USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
        THX: '0x2934b36ca9A4B31E633C5BE670C8C8b28b6aA015',
        // veTHX
        VotingEscrow: '0xE3B8E734e7BCcB64B63e032795896CC57012A51D',
        RewardDistributor: '0xCc62c812EfF9cA4c35623103B2Bb63E22f465E09',
        RewardFaucet: '0xA1D7671f73FbcB5e079d4dC4Cffb7dDD0967EA7E',
        SmartWalletWhitelist: '0x876625a92cEAa7f1Bddd40908B8eb5C6080cB83C',
        LensReward: '0xE8D9624E0B7f839540E7c13577550E3Eff3FC8aA',
    },
} as ContractNetworksConfig & any;

export const contractArtifacts: { [contractName: string]: { abi: any; bytecode: string } } = {
    RewardFaucet,
    RewardDistributor,
    SmartWalletWhitelist,
    Launchpad,
    LensReward,
    BalMinter,
    VotingEscrow,
    BalancerVault,
    BPT,
    BPTGauge,
    USDC,
    THX,
    BAL,
};
export const networkNames = ['matic', 'maticdev', 'hardhat'] as const;
export type TNetworkName = typeof networkNames[number];

export const contractNames = ['BalancerVault'] as const;
export const tokenContractNames = [
    'LimitedSupplyToken',
    'UnlimitedSupplyToken',
    'NonFungibleToken',
    'UnlimitedSupplyToken',
    'THX_ERC1155',
    'VotingEscrow',
    'BPT',
    'BPTGauge',
    'USDC',
    'THX',
    'BAL',
] as const;
export type TokenContractName = typeof tokenContractNames[number];

export interface ContractConfig {
    address: string;
    abi: AbiItem[];
    bytecode: string;
}

export interface ExportJsonFile {
    name: string;
    chainId: string;
    contracts: { [key: string]: ContractConfig };
}

const cache: { [key in TNetworkName]: { versions: string[]; contracts: { [version: string]: ExportJsonFile } } } = {
    hardhat: { versions: [], contracts: {} },
    matic: { versions: [], contracts: {} },
    maticdev: { versions: [], contracts: {} },
};

const getArtifacts = (network: TNetworkName, version: string) => {
    if (!cache[network].contracts[version]) {
        const v = network === 'hardhat' ? 'latest' : version;
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const contract = require(`./${network}/${v}.json`);
        cache[network].contracts[version] = contract;
    }

    return cache[network].contracts[version];
};

export const contractConfig = (network: TNetworkName, contractName: TokenContractName): ContractConfig => {
    const artifacts = getArtifacts(network, currentVersion);
    return artifacts.contracts[contractName];
};

export const networkChainId = (network: TNetworkName): string => {
    return getArtifacts(network, currentVersion).chainId;
};

export { currentVersion };
