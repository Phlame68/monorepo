import { keccak256, toUtf8Bytes } from 'ethers/lib/utils';
import { TransactionReceipt } from 'web3-core';

import { getByteCodeForContractName, getContractFromName } from '@thxnetwork/api/config/contracts';
import { API_URL, VERSION } from '@thxnetwork/api/config/secrets';
import { AssetPoolDocument } from '@thxnetwork/api/models/AssetPool';
import { ERC1155, ERC1155Document, IERC1155Updates } from '@thxnetwork/api/models/ERC1155';
import { ERC1155Metadata, ERC1155MetadataDocument } from '@thxnetwork/api/models/ERC1155Metadata';
import { ERC1155Token, ERC1155TokenDocument } from '@thxnetwork/api/models/ERC1155Token';
import { Transaction } from '@thxnetwork/api/models/Transaction';
import { ChainId, TransactionState } from '@thxnetwork/types/enums';
import { ERC1155TokenState } from '@thxnetwork/api/types/TERC1155';
import { TERC1155DeployCallbackArgs, TERC1155TokenMintCallbackArgs } from '@thxnetwork/api/types/TTransaction';
import { assertEvent, ExpectedEventNotFound, findEvent, parseLogs } from '@thxnetwork/api/util/events';
import { getProvider } from '@thxnetwork/api/util/network';
import { paginatedResults } from '@thxnetwork/api/util/pagination';

import PoolService from './PoolService';
import TransactionService from './TransactionService';

import type { TERC1155, TERC1155Metadata, TERC1155Token } from '@thxnetwork/api/types/TERC1155';
import type { IAccount } from '@thxnetwork/api/models/Account';
import WalletService from './WalletService';
const contractName = 'THX_ERC1155';

async function deploy(data: TERC1155, forceSync = true): Promise<ERC1155Document> {
    const { defaultAccount } = getProvider(data.chainId);
    const contract = getContractFromName(data.chainId, contractName);
    const bytecode = getByteCodeForContractName(contractName);

    data.baseURL = `${API_URL}/${VERSION}/erc1155/metadata/{id}`;

    const erc1155 = await ERC1155.create(data);

    const fn = contract.deploy({
        data: bytecode,
        arguments: [erc1155.baseURL, defaultAccount],
    });

    const txId = await TransactionService.sendAsync(null, fn, erc1155.chainId, forceSync, {
        type: 'ERC1155DeployCallback',
        args: { erc1155Id: String(erc1155._id) },
    });

    return ERC1155.findByIdAndUpdate(erc1155._id, { transactions: [txId] }, { new: true });
}

async function deployCallback({ erc1155Id }: TERC1155DeployCallbackArgs, receipt: TransactionReceipt) {
    const erc1155 = await ERC1155.findById(erc1155Id);
    const contract = getContractFromName(erc1155.chainId, contractName);
    const events = parseLogs(contract.options.jsonInterface, receipt.logs);

    if (!findEvent('OwnershipTransferred', events) && !findEvent('Transfer', events)) {
        throw new ExpectedEventNotFound('Transfer or OwnershipTransferred');
    }

    await ERC1155.findByIdAndUpdate(erc1155Id, { address: receipt.contractAddress });
}

export async function queryDeployTransaction(erc1155: ERC1155Document): Promise<ERC1155Document> {
    if (!erc1155.address && erc1155.transactions[0]) {
        const tx = await Transaction.findById(erc1155.transactions[0]);
        const txResult = await TransactionService.queryTransactionStatusReceipt(tx);
        if (txResult === TransactionState.Mined) {
            erc1155 = await findById(erc1155._id);
        }
    }

    return erc1155;
}

const initialize = async (pool: AssetPoolDocument, address: string) => {
    const erc1155 = await findByQuery({ address, chainId: pool.chainId });
    await addMinter(erc1155, pool.address);
};

export async function findById(id: string): Promise<ERC1155Document> {
    return ERC1155.findById(id);
}

export async function findBySub(sub: string): Promise<ERC1155Document[]> {
    return ERC1155.find({ sub });
}

export async function createMetadata(erc1155: ERC1155Document, attributes: any): Promise<ERC1155MetadataDocument> {
    return ERC1155Metadata.create({
        erc1155: String(erc1155._id),
        attributes,
    });
}

export async function deleteMetadata(id: string) {
    return ERC1155Metadata.findOneAndDelete({ _id: id });
}

export async function mint(
    pool: AssetPoolDocument,
    erc1155: ERC1155Document,
    metadata: ERC1155MetadataDocument,
    sub: string,
    address: string,
    forceSync = true,
): Promise<ERC1155TokenDocument> {
    // const address = await account.getAddress(pool.chainId);
    const wallets = await WalletService.findByQuery({ sub, chainId: erc1155.chainId });
    const erc1155token = await ERC1155Token.create({
        sub,
        recipient: address,
        state: ERC1155TokenState.Pending,
        erc1155Id: String(erc1155._id),
        metadataId: String(metadata._id),
        walletId: wallets.length ? String(wallets[0]._id) : undefined,
    });
    const txId = await TransactionService.sendAsync(
        pool.contract.options.address,
        pool.contract.methods.mintForERC1155(erc1155.address, address, 1, String(metadata._id)),
        pool.chainId,
        forceSync,
        {
            type: 'erc1155TokenMintCallback',
            args: { erc1155tokenId: String(erc1155token._id), assetPoolId: String(pool._id) },
        },
    );

    return ERC1155Token.findByIdAndUpdate(erc1155token._id, { transactions: [txId] }, { new: true });
}

export async function mintCallback(args: TERC1155TokenMintCallbackArgs, receipt: TransactionReceipt) {
    const { assetPoolId, erc1155tokenId } = args;
    const { contract } = await PoolService.getById(assetPoolId);
    const events = parseLogs(contract.options.jsonInterface, receipt.logs);
    const event = assertEvent('ERC1155Minted', events);

    await ERC1155Token.findByIdAndUpdate(erc1155tokenId, {
        state: ERC1155TokenState.Minted,
        tokenId: Number(event.args.tokenId),
        recipient: event.args.recipient,
    });
}

export async function queryMintTransaction(erc1155Token: ERC1155TokenDocument): Promise<ERC1155TokenDocument> {
    if (erc1155Token.state === ERC1155TokenState.Pending && erc1155Token.transactions[0]) {
        const tx = await Transaction.findById(erc1155Token.transactions[0]);
        const txResult = await TransactionService.queryTransactionStatusReceipt(tx);
        if (txResult === TransactionState.Mined) {
            erc1155Token = await findTokenById(erc1155Token._id);
        }
    }

    return erc1155Token;
}

export async function parseAttributes(entry: ERC1155MetadataDocument) {
    const attrs: { [key: string]: string } = {};

    for (const { key, value } of entry.attributes) {
        attrs[key.toLowerCase()] = value;
    }

    return attrs;
}

async function isMinter(erc1155: ERC1155Document, address: string) {
    return await erc1155.contract.methods.hasRole(keccak256(toUtf8Bytes('MINTER_ROLE')), address).call();
}

async function addMinter(erc1155: ERC1155Document, address: string) {
    const receipt = await TransactionService.send(
        erc1155.address,
        erc1155.contract.methods.grantRole(keccak256(toUtf8Bytes('MINTER_ROLE')), address),
        erc1155.chainId,
    );

    assertEvent('RoleGranted', parseLogs(erc1155.contract.options.jsonInterface, receipt.logs));
}

async function findTokenById(id: string): Promise<ERC1155TokenDocument> {
    return ERC1155Token.findById(id);
}

async function findTokensByMetadataAndSub(metadataId: string, account: IAccount): Promise<ERC1155TokenDocument[]> {
    return ERC1155Token.find({ sub: account.sub, metadataId });
}

async function findTokensBySub(sub: string): Promise<ERC1155TokenDocument[]> {
    return ERC1155Token.find({ sub });
}

async function findTokensByWallet(walletId: string): Promise<ERC1155TokenDocument[]> {
    return ERC1155Token.find({ walletId });
}

async function findMetadataById(id: string): Promise<ERC1155MetadataDocument> {
    return ERC1155Metadata.findById(id);
}

async function findTokensByRecipient(recipient: string, erc1155Id: string): Promise<TERC1155Token[]> {
    const result = [];
    for await (const token of ERC1155Token.find({ recipient, erc1155Id })) {
        const metadata = await ERC1155Metadata.findById(token.metadataId);
        result.push({ ...(token.toJSON() as TERC1155Token), metadata });
    }
    return result;
}

async function findTokensByMetadata(metadata: ERC1155MetadataDocument): Promise<TERC1155Token[]> {
    return ERC1155Token.find({ metadataId: String(metadata._id) });
}

async function findMetadataByNFT(erc1155: string, page = 1, limit = 10, q?: string) {
    let query;
    if (q && q != 'null' && q != 'undefined') {
        query = { erc1155, title: { $regex: `.*${q}.*`, $options: 'i' } };
    } else {
        query = { erc1155 };
    }

    const paginatedResult = await paginatedResults(ERC1155Metadata, page, limit, query);

    const results: TERC1155Metadata[] = [];
    for (const metadata of paginatedResult.results) {
        const tokens = (await this.findTokensByMetadata(metadata)).map((m: ERC1155MetadataDocument) => m.toJSON());
        results.push({ ...metadata.toJSON(), tokens });
    }
    paginatedResult.results = results;
    return paginatedResult;
}

async function findByQuery(query: { poolAddress?: string; address?: string; chainId?: ChainId }) {
    return ERC1155.findOne(query);
}

export const update = (erc1155: ERC1155Document, updates: IERC1155Updates) => {
    return ERC1155.findByIdAndUpdate(erc1155._id, updates, { new: true });
};

export const getOnChainERC1155Token = async (chainId: number, address: string) => {
    const contract = getContractFromName(chainId, contractName, address);
    const uri = await contract.methods.uri(1).call();

    return { uri };
};

export default {
    deploy,
    deployCallback,
    findById,
    createMetadata,
    deleteMetadata,
    mint,
    mintCallback,
    queryMintTransaction,
    findBySub,
    findTokenById,
    findTokensByMetadataAndSub,
    findTokensByMetadata,
    findTokensBySub,
    findMetadataById,
    findMetadataByNFT,
    findTokensByRecipient,
    findByQuery,
    addMinter,
    isMinter,
    parseAttributes,
    update,
    initialize,
    queryDeployTransaction,
    getOnChainERC1155Token,
    findTokensByWallet,
};
