import { Request, Response } from 'express';
import { body, param } from 'express-validator';
import ERC1155Service from '@thxnetwork/api/services/ERC1155Service';
import { NotFoundError } from '@thxnetwork/api/util/errors';

export const validation = [param('id').exists(), body('archived').exists().isBoolean()];

export const controller = async (req: Request, res: Response) => {
    // #swagger.tags = ['ERC1155']
    const erc1155 = await ERC1155Service.findById(req.params.id);
    if (!erc1155) throw new NotFoundError('Could not find the token for this id');
    const result = await ERC1155Service.update(erc1155, req.body);
    return res.json(result);
};
export default { controller, validation };
