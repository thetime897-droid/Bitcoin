import { FLAG_ASSETS_BY_ISO, type FlagAsset } from "./flagAssets.generated";

export const getFlag = (iso: string): FlagAsset | null => FLAG_ASSETS_BY_ISO[iso] ?? null;
