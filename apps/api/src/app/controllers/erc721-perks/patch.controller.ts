import ERC721PerkService from '@thxnetwork/api/services/ERC721PerkService';
import ImageService from '@thxnetwork/api/services/ImageService';
import { NotFoundError } from '@thxnetwork/api/util/errors';
import { Request, Response } from 'express';
import { body, check, param } from 'express-validator';

const validation = [
    param('id').exists(),
    check('file')
        .optional()
        .custom((value, { req }) => {
            return ['jpg', 'jpeg', 'gif', 'png'].includes(req.file.mimetype);
        }),
    body('title').isString(),
    body('description').isString(),
    body('pointPrice').optional().isNumeric(),
    body('erc721Id').optional().isMongoId(),
    body('erc1155Id').optional().isMongoId(),
    body('tokenId').optional().isString(),
    body('metadataIds').optional().isString(),
    body('claimAmount').optional().isInt({ lt: 5000 }),
    body('claimLimit').exists().isInt(),
    body('expiryDate').optional().isISO8601(),
    body('limit').optional().isInt(),
    body('price').isInt(),
    body('priceCurrency').isString(),
    body('isPromoted').optional().isBoolean(),
    body('tokenGatingContractAddress').optional().isString(),
    body('tokenGatingVariant').optional().isString(),
    body('tokenGatingAmount').optional().isInt(),
];

const controller = async (req: Request, res: Response) => {
    // #swagger.tags = ['RewardsNft']
    let perk = await ERC721PerkService.get(req.params.id);
    if (!perk) throw new NotFoundError('Could not find the perk');

    let image: string;
    if (req.file) {
        const response = await ImageService.upload(req.file);
        image = ImageService.getPublicUrl(response.key);
    }

    const metadataIdList = req.body.metadataIds ? JSON.parse(req.body.metadataIds) : [];
    const config = {
        ...req.body,
        poolId: req.header('X-PoolId'),
        image,
        metadataId: metadataIdList.length ? metadataIdList[0] : '',
    };
    perk = await ERC721PerkService.update(perk, config);

    return res.json(perk);
};

export default { controller, validation };
