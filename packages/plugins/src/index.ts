import {
    ZeroDevSessionKeyPlugin,
    ZeroDevPluginSafe__factory,
    FunctionSignaturePolicy,
    ZeroDevSessionKeyPlugin__factory,
    FunctionSignaturePolicy__factory,
    FunctionSignaturePolicyFactory,
    FunctionSignaturePolicyFactory__factory,
} from '@zerodevapp/contracts';

import { TransactionRequest, TransactionResponse } from '@ethersproject/providers'

import { ZeroDevSigner } from '@zerodevapp/sdk';
import { Signer, Wallet, utils, BigNumber, providers } from 'ethers';
import { Deferrable, hexConcat, hexZeroPad } from 'ethers/lib/utils';
import { UserOperationStruct } from '@zerodevapp/contracts'
import { getModuleInfo } from '@zerodevapp/sdk/src/types';


const DEFAULT_SESSION_KEY_PLUGIN = '0xC8791E01De15Db08f2A9E7A964AA9C1069E72A5c'; // TODO need set this after deploying
const DEFAULT_POLICY_FACTORY = '0x1E3Eef3Ce30B2106481D77C387944E8D78368c2c'; // TODO need to set this after deploying

interface SessionPolicy {
    to : string;
    sig : string;
}

export class PolicySessionKeyPlugin extends ZeroDevSigner {
    sessionKeyPlugin: ZeroDevSessionKeyPlugin;
    sessionKey : Signer;
    validUntil: number;
    policyFactory : FunctionSignaturePolicyFactory;
    policy?: FunctionSignaturePolicy;
    policies: SessionPolicy[];

    constructor(
        from : ZeroDevSigner,
        validUntil: number,
        policies : SessionPolicy[],
        sessionKeyPlugin? : ZeroDevSessionKeyPlugin,
        policyFactory? : FunctionSignaturePolicyFactory
    ) {
        super(
            from.config,
            from.originalSigner,
            from.zdProvider,
            from.httpRpcClient,
            from.smartAccountAPI
        );
        this.sessionKeyPlugin = sessionKeyPlugin ? sessionKeyPlugin : 
            ZeroDevSessionKeyPlugin__factory.connect(DEFAULT_SESSION_KEY_PLUGIN, this.provider!);
        this.sessionKey = Wallet.createRandom().connect(this.provider!);
        this.validUntil = validUntil;
        this.policies = policies;
        this.policyFactory = policyFactory ? policyFactory : FunctionSignaturePolicyFactory__factory.connect(DEFAULT_POLICY_FACTORY, this.provider!)
    }

    extendSessionKey(validUntil: number) {
        this.validUntil = validUntil;
    }

    refreshSessionKey() {
        this.sessionKey = Wallet.createRandom().connect(this.provider!);
    }

    async getPolicy() : Promise<FunctionSignaturePolicy> {
        if (!this.policy) {
            const addr = await this.policyFactory.getPolicy(this.policies);
            return FunctionSignaturePolicy__factory.connect(addr, this.provider!);
        }
        return this.policy;
    }

      // This one is called by Contract. It signs the request and passes in to Provider to be sent.
    async sendTransaction(transaction: Deferrable<TransactionRequest>): Promise<TransactionResponse> {
        // `populateTransaction` internally calls `estimateGas`.
        // Some providers revert if you try to call estimateGas without the wallet first having some ETH,
        // which is going to be the case here if we use paymasters.  Therefore we set the gas price to
        // 0 to ensure that estimateGas works even if the wallet has no ETH.
        if (transaction.maxFeePerGas || transaction.maxPriorityFeePerGas) {
            transaction.maxFeePerGas = 0
            transaction.maxPriorityFeePerGas = 0
        } else {
            transaction.gasPrice = 0
        }
        const tx: TransactionRequest = await this.populateTransaction(transaction)
        await this.verifyAllNecessaryFields(tx)
        let userOperation: UserOperationStruct
        userOperation = await this.smartAccountAPI.createUnsignedUserOp({
            target: tx.to ?? '',
            data: tx.data?.toString() ?? '',
            value: tx.value,
            gasLimit: tx.gasLimit,
            maxFeePerGas: tx.maxFeePerGas,
            maxPriorityFeePerGas: tx.maxPriorityFeePerGas,
        })
        console.log('-- sign userOp start --')
        userOperation.signature = await this.signUserOperation(userOperation)
        console.log('-- sign success --')
        const transactionResponse = await this.zdProvider.constructUserOpTransactionResponse(userOperation)
        
        // Invoke the transaction hook
        this.config.hooks?.transactionStarted?.({
            hash: transactionResponse.hash,
            from: tx.from!,
            to: tx.to!,
            value: tx.value || 0,
            sponsored: userOperation.paymasterAndData !== '0x',
            module: getModuleInfo(tx),
        })

        try {
            await this.httpRpcClient.sendUserOpToBundler(userOperation)
        } catch (error: any) {
            // console.error('sendUserOpToBundler failed', error)
            throw this.unwrapError(error)
        }
        // TODO: handle errors - transaction that is "rejected" by bundler is _not likely_ to ever resolve its "wait()"
        return transactionResponse
    }


    async signUserOperation(userOp: UserOperationStruct): Promise<string> { // this should return userOp.signature
        userOp.signature = await this.approvePlugin(
            hexConcat(
                [
                    hexZeroPad(await this.sessionKey.getAddress(), 20),
                    hexZeroPad(await this.getPolicy().then(p => p.address), 20)
                ]
            )
        )
        return await this.signUserOpWithSessionKey(userOp);
    }

    async currentSessionNonce(): Promise<number> {
        return await this.getSessionNonce(await this.sessionKey.getAddress());
    }

    async getSessionNonce(address : string) : Promise<number> {
        let number = await ZeroDevPluginSafe__factory.connect(this.address!, this.provider!).callStatic
        .queryPlugin(this.sessionKeyPlugin.address, this.sessionKeyPlugin.interface.encodeFunctionData('sessionNonce', [address]))
        .catch(e => {
            if (e.errorName !== 'QueryResult') {
                throw e;
            }
            return e.errorArgs.result;
        })
        if(typeof number !== 'string') { // this happens when contract is not deployed yet
            return 0;
        }
        return BigNumber.from(number).toNumber();
    }

    async approvePlugin(
        data: string
    ): Promise<string> {
        const sender = await this.getAddress();
        const domain = {
            name: 'ZeroDevPluginSafe',
            version: '1.0.0',
            verifyingContract: sender,
            chainId: (await this.provider!.getNetwork()).chainId
        }

        const value = {
            sender : sender,
            validUntil: this.validUntil,
            validAfter: 0,
            plugin: this.sessionKeyPlugin.address,
            data: data
        }

        const userSig = await (this.originalSigner as providers.JsonRpcSigner)._signTypedData(
            domain,
            {
            ValidateUserOpPlugin: [
                { name: 'sender', type: 'address' },
                { name: 'validUntil', type: 'uint48' },
                { name: 'validAfter', type: 'uint48' },
                { name: 'plugin', type: 'address' },
                { name: 'data', type: 'bytes' }
            ]
            },
            value
        )
        const signature = hexConcat([
            hexZeroPad(this.sessionKeyPlugin.address, 20),
            hexZeroPad(utils.hexlify(value.validUntil), 6),
            hexZeroPad(utils.hexlify(value.validAfter), 6),
            userSig
        ])
        return signature;
    }

    async signUserOpWithSessionKey(
        userOp: UserOperationStruct,
    ): Promise<string> {
        const policy = await this.getPolicy()
        console.log(policy.address)
        const opHash = await this.smartAccountAPI.getUserOpHash(userOp)
        const chainId = await this.provider!.getNetwork().then(net => net.chainId)
        const sessionDomain = {
            name: 'ZeroDevSessionKeyPlugin',
            version: '1.0.0',
            verifyingContract: await userOp.sender,
            chainId: chainId
        }

        const nonce = await this.currentSessionNonce()
        console.log('nonce sucess : ', nonce)
        console.log('sender : ', await userOp.sender)
        const sessionKeySig = await (this.sessionKey as providers.JsonRpcSigner)._signTypedData(
            sessionDomain,
            {
                Session: [
                    { name: 'userOpHash', type: 'bytes32' },
                    { name: 'nonce', type: 'uint256' }
                ]
            },
            {
                userOpHash: opHash,
                nonce: nonce
            }
        )
  
        return hexConcat([
            await userOp.signature,
            utils.defaultAbiCoder.encode(['bytes', 'bytes'], [
                hexConcat([hexZeroPad(await this.sessionKey.getAddress(), 20), hexZeroPad(policy.address, 20)]),
                sessionKeySig
            ])
        ]);
    }
}


  