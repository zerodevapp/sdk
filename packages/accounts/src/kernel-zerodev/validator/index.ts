import { ECDSAValidator } from "./ecdsa-validator.js";
import { OnOffValidator } from "./on-off-validator.js";
import type { ValidatorMap } from "./types.js";

export const Validators: ValidatorMap = {
  ECDSA: ECDSAValidator,
  OnOff: OnOffValidator,
};

export { ECDSAValidator };
