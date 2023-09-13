import { AccountPlanType } from './types/enums';
import { TAccount } from './types/interfaces';

function hasBasicAccess(owner: TAccount) {
    if (!owner) return false;
    return [AccountPlanType.Basic, AccountPlanType.Premium].includes(owner.plan);
}

function hasPremiumAccess(owner: TAccount) {
    if (!owner) return false;
    return [AccountPlanType.Premium].includes(owner.plan);
}

export { hasBasicAccess, hasPremiumAccess };
