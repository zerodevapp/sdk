import { ECDSAValidator } from "./ecdsa-validator.js";
import { KillSwitchValidator } from "./kill-switch-validator.js";
import type { ValidatorMap } from "./types.js";

export const Validators: ValidatorMap = {
  ECDSA: ECDSAValidator,
  KILL_SWITCH: KillSwitchValidator,
};

export { ECDSAValidator, KillSwitchValidator };
