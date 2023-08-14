import { GrantVariant } from '../enums/GrantVariant';

export type TClient = {
    _id: string;
    page: number;
    name: string;
    sub: string;
    poolId: string;
    grantType: GrantVariant;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    requestUri: string;
    createdAt?: Date;
};

export type TClientState = {
    [poolId: string]: {
        [page: number]: TClient[];
    };
};
