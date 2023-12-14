import { ECDSAValidator } from "./ecdsa-validator.js";
import { ERC165SessionKeyValidator } from "./erc165-session-key-validator.js";
import { KillSwitchValidator } from "./kill-switch-validator.js";
import { RecoveryValidator } from "./recovery-validator.js";
import { SessionKeyValidator } from "./session-key-validator.js";
import { P256Validator } from "./p256-validator.js";
import type { ValidatorMap } from "./types.js";

export const Validators: ValidatorMap = {
  ECDSA: ECDSAValidator,
  KILL_SWITCH: KillSwitchValidator,
  ERC165_SESSION_KEY: ERC165SessionKeyValidator,
  SESSION_KEY: SessionKeyValidator,
  RECOVERY: RecoveryValidator,
  P256: P256Validator,
};

export {
  ECDSAValidator,
  KillSwitchValidator,
  ERC165SessionKeyValidator,
  SessionKeyValidator,
  RecoveryValidator,
  P256Validator,
};
