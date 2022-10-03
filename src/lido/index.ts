export * from "./ids";
export * from "./infos";

import BN from "bn.js";
import { IDepositorInfo, IVaultInfo } from "../types";

// TODO: Add relevant fields
export interface VaultInfo extends IVaultInfo {
  amount: BN;
}

// TODO: Add relavant fields
export interface DepositorInfo extends IDepositorInfo {}
