import { Request, Response } from 'express';
import { body, param } from 'express-validator';
import { BadRequestError, NotFoundError } from '@thxnetwork/api/util/errors';
import ERC721Service from '@thxnetwork/api/services/ERC721Service';
import IPFSService from '@thxnetwork/api/services/IPFSService';
import AccountProxy from '@thxnetwork/api/proxies/AccountProxy';
import { AccountPlanType } from '@thxnetwork/api/types/enums';
import { IPFS_BASE_URL } from '@thxnetwork/api/config/secrets';

const validation = [
    param('id').isMongoId(),
    param('metadataId').isMongoId(),
    body('name').optional().isString(),
    body('description').optional().isString(),
    body('externalUrl').optional().isURL(),
    body('imageUrl').optional().isURL(),
];

const controller = async (req: Request, res: Response) => {
    const erc721 = await ERC721Service.findById(req.params.id);
    if (!erc721) throw new NotFoundError('Could not find this NFT in the database');

    const metadata = await ERC721Service.findMetadataById(req.params.metadataId);
    if (!metadata) throw new NotFoundError('Could not find this NFT Metadata in the database');

    const tokens = metadata.tokens || [];
    if (tokens.length) throw new BadRequestError('There token minted with this metadata');

    const account = await AccountProxy.getById(req.auth.sub);
    let image = req.body.imageUrl;

    if (req.body.imageUrl && account.plan === AccountPlanType.Premium) {
        const result = await IPFSService.addImageUrl(req.body.image);
        image = IPFS_BASE_URL + result.cid.toString();
    }

    metadata.name = req.body.name || metadata.name;
    metadata.image = image || metadata.image;
    metadata.imageUrl = req.body.imageUrl || metadata.imageUrl;
    metadata.description = req.body.description || metadata.description;
    metadata.externalUrl = req.body.externalUrl || metadata.externalUrl;

    await metadata.save();

    res.json({ ...metadata.toJSON(), tokens });
};

export default { controller, validation };
