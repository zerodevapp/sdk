const ErrTransactionFailedGasChecks = Error('Transaction failed gas checks');
const InvalidOperation = Error('Invalid operation');
const IncorrectCallDataForTokenPaymaster = Error('Incorrect callData for token paymaster');
const AccountNotConnected = Error("Account not connected");

export {
    ErrTransactionFailedGasChecks,
    InvalidOperation,
    IncorrectCallDataForTokenPaymaster,
    AccountNotConnected
}