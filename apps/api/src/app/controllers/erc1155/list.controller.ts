import { Request, Response } from 'express';
import { ERC1155, ERC1155Document } from '@thxnetwork/api/models/ERC1155';
import { query } from 'express-validator';

export const validation = [query('archived').optional().isBoolean()];

const controller = async (req: Request, res: Response) => {
    /* #swagger.tags = ['ERC1155']
       #swagger.responses[200] = { schema: { $ref: '#/definitions/ERC1155' } } 
    */

    const archived = req.query.archived ? JSON.parse(String(req.query.archived)) : false;
    const result = await ERC1155.find({ sub: req.auth.sub, archived });

    res.json(result.map((erc1155: ERC1155Document) => erc1155._id));
};

export default { controller, validation };
