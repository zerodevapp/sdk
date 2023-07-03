import { ECDSAValidator } from "./ecdsa-validator";
import type { ValidatorMap } from "./types";


export const Validators: ValidatorMap = {
    "ECDSA": ECDSAValidator.init,
}