import { ECDSAValidator } from "./ecdsa-validator.js";
import { ERC165SessionKeyValidator } from "./erc165-session-key-validator.js";
import { KillSwitchValidator } from "./kill-switch-validator.js";
import type { ValidatorMap } from "./types.js";

export const Validators: ValidatorMap = {
  ECDSA: ECDSAValidator,
  KILL_SWITCH: KillSwitchValidator,
  ERC165_SESSION_KEY: ERC165SessionKeyValidator,
};

export { ECDSAValidator, KillSwitchValidator, ERC165SessionKeyValidator };
