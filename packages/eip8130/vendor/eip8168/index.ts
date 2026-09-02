// Vendored subset of `viem/eip8168` (wevm/viem#5004 at 7992598). Drop once viem ships it.
export {
    type ResignRequest,
    type SendSponsoredCallsParameters,
    type SendSponsoredCallsReturnType,
    sendSponsoredCalls
} from "./actions/sendSponsoredCalls.js"
export {
    type CreatePayerClientParameters,
    createPayerClient,
    type PayerClient,
    type PayerRpcSchema,
    toChainPayerClient
} from "./client.js"
export {
    type PayerErrorCode,
    payerErrorCode,
    payerRejectedCode,
    sponsorshipDeclineCode
} from "./constants.js"
export type {
    GetTermsParameters,
    GetTermsReturnType,
    PayerGasEstimate,
    PayerRejectedData,
    PayerSendTransactionReturnType,
    PayerSignTransactionReturnType,
    PaymentOption,
    SponsoredOfferSelectable,
    TokenPaymentOffer
} from "./types.js"
export {
    buildSponsoredCalls,
    encodeTokenTransfer,
    selectPaymentOption
} from "./utils/buildSponsoredCalls.js"
export { parsePayerError } from "./utils/parsePayerError.js"
