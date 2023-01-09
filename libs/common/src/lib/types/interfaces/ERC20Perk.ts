import { TBaseReward } from './BaseReward';

export type TERC20Perk = TBaseReward & {
    erc20Id: string;
    amount: string;
    pointPrice: number;
    isPromoted: boolean;
    image?: string;
};
