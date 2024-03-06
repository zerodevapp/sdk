export const DoubleSigValidatorAbi = [
    {
        abi: [
            { type: "constructor", inputs: [], stateMutability: "nonpayable" },
            {
                type: "function",
                name: "disable",
                inputs: [
                    { name: "data", type: "bytes", internalType: "bytes" }
                ],
                outputs: [],
                stateMutability: "payable"
            },
            {
                type: "function",
                name: "enable",
                inputs: [
                    { name: "_data", type: "bytes", internalType: "bytes" }
                ],
                outputs: [],
                stateMutability: "payable"
            },
            {
                type: "function",
                name: "smartActionProofs",
                inputs: [
                    { name: "", type: "uint256", internalType: "uint256" }
                ],
                outputs: [
                    {
                        name: "model_id",
                        type: "uint128",
                        internalType: "uint128"
                    },
                    {
                        name: "version_id",
                        type: "uint128",
                        internalType: "uint128"
                    },
                    {
                        name: "userAddress",
                        type: "address",
                        internalType: "address"
                    },
                    {
                        name: "proofHash",
                        type: "bytes32",
                        internalType: "bytes32"
                    }
                ],
                stateMutability: "view"
            },
            {
                type: "function",
                name: "validCaller",
                inputs: [
                    {
                        name: "caller",
                        type: "address",
                        internalType: "address"
                    },
                    { name: "data", type: "bytes", internalType: "bytes" }
                ],
                outputs: [{ name: "", type: "bool", internalType: "bool" }],
                stateMutability: "view"
            },
            {
                type: "function",
                name: "validateSignature",
                inputs: [
                    { name: "hash", type: "bytes32", internalType: "bytes32" },
                    { name: "signature", type: "bytes", internalType: "bytes" }
                ],
                outputs: [
                    {
                        name: "",
                        type: "uint256",
                        internalType: "ValidationData"
                    }
                ],
                stateMutability: "view"
            },
            {
                type: "function",
                name: "validateUserOp",
                inputs: [
                    {
                        name: "_userOp",
                        type: "tuple",
                        internalType: "struct UserOperation",
                        components: [
                            {
                                name: "sender",
                                type: "address",
                                internalType: "address"
                            },
                            {
                                name: "nonce",
                                type: "uint256",
                                internalType: "uint256"
                            },
                            {
                                name: "initCode",
                                type: "bytes",
                                internalType: "bytes"
                            },
                            {
                                name: "callData",
                                type: "bytes",
                                internalType: "bytes"
                            },
                            {
                                name: "callGasLimit",
                                type: "uint256",
                                internalType: "uint256"
                            },
                            {
                                name: "verificationGasLimit",
                                type: "uint256",
                                internalType: "uint256"
                            },
                            {
                                name: "preVerificationGas",
                                type: "uint256",
                                internalType: "uint256"
                            },
                            {
                                name: "maxFeePerGas",
                                type: "uint256",
                                internalType: "uint256"
                            },
                            {
                                name: "maxPriorityFeePerGas",
                                type: "uint256",
                                internalType: "uint256"
                            },
                            {
                                name: "paymasterAndData",
                                type: "bytes",
                                internalType: "bytes"
                            },
                            {
                                name: "signature",
                                type: "bytes",
                                internalType: "bytes"
                            }
                        ]
                    },
                    {
                        name: "_userOpHash",
                        type: "bytes32",
                        internalType: "bytes32"
                    },
                    {
                        name: "proofId",
                        type: "uint256",
                        internalType: "uint256"
                    }
                ],
                outputs: [
                    {
                        name: "",
                        type: "uint256",
                        internalType: "ValidationData"
                    }
                ],
                stateMutability: "payable"
            },
            {
                type: "event",
                name: "DebugInfo",
                inputs: [
                    {
                        name: "message",
                        type: "string",
                        indexed: false,
                        internalType: "string"
                    },
                    {
                        name: "recoveredAddress",
                        type: "address",
                        indexed: false,
                        internalType: "address"
                    }
                ],
                anonymous: false
            },
            {
                type: "event",
                name: "SignatureVerification",
                inputs: [
                    {
                        name: "signer1",
                        type: "address",
                        indexed: true,
                        internalType: "address"
                    },
                    {
                        name: "signer2",
                        type: "address",
                        indexed: true,
                        internalType: "address"
                    },
                    {
                        name: "proofHash",
                        type: "bytes32",
                        indexed: false,
                        internalType: "bytes32"
                    },
                    {
                        name: "userOpHash",
                        type: "bytes32",
                        indexed: false,
                        internalType: "bytes32"
                    },
                    {
                        name: "valid",
                        type: "bool",
                        indexed: true,
                        internalType: "bool"
                    }
                ],
                anonymous: false
            },
            {
                type: "event",
                name: "Validation",
                inputs: [
                    {
                        name: "validAfter",
                        type: "uint48",
                        indexed: false,
                        internalType: "uint48"
                    },
                    {
                        name: "validUntil",
                        type: "uint48",
                        indexed: false,
                        internalType: "uint48"
                    }
                ],
                anonymous: false
            },
            { type: "error", name: "ECDSAInvalidSignature", inputs: [] },
            {
                type: "error",
                name: "ECDSAInvalidSignatureLength",
                inputs: [
                    { name: "length", type: "uint256", internalType: "uint256" }
                ]
            },
            {
                type: "error",
                name: "ECDSAInvalidSignatureS",
                inputs: [
                    { name: "s", type: "bytes32", internalType: "bytes32" }
                ]
            },
            { type: "error", name: "NotImplemented", inputs: [] }
        ],
        bytecode: {
            object: "0x6080806040523461002857600080546001600160a01b03191633179055610b20908161002e8239f35b600080fdfe6080604052600436101561001257600080fd5b60003560e01c80630c95955614610077578063333daf92146100725780633a871cdd1461006d578063599ebdfc146100685780638fc925aa1461006357639ea9bd591461005e57600080fd5b610352565b610327565b6102cb565b610280565b610242565b61008036610213565b90606082106101aa57610150826100a361009d6101a89585610395565b906103e7565b9061013b6100c36100bd6100b784886103a3565b90610404565b60801c90565b9461012b61010061009d6100dd6100bd6100b788876103b4565b956100fa6100f46100ee83886103c5565b90610430565b60601c90565b946103d6565b9361011b61010c61049e565b6001600160801b039099168952565b6001600160801b03166020880152565b6001600160a01b03166040860152565b60608401526000526001602052604060002090565b8151602083015160801b6001600160801b0319166001600160801b039190911617815560408201516001820180546001600160a01b0319166001600160a01b0392909216919091179055606090910151600290910155565b005b62461bcd60e51b6080526020608452601560a4527411185d1848199bdc9b585d081a5b98dbdc9c9958dd605a1b60c45260646080fd5b9181601f8401121561020e5782359167ffffffffffffffff831161020e576020838186019501011161020e57565b600080fd5b602060031982011261020e576004359067ffffffffffffffff821161020e5761023e916004016101e0565b9091565b3461020e57604036600319011261020e5760243567ffffffffffffffff811161020e576102739036906004016101e0565b5050602060405160008152f35b60031960603682011261020e576004359067ffffffffffffffff821161020e5761016090823603011261020e576102c360209160443590602435906004016105a3565b604051908152f35b3461020e57602036600319011261020e57600435600052600160205260806040600020805490600260018060a01b0360018301541691015490604051926001600160801b0381168452841c602084015260408301526060820152f35b61033361009d36610213565b6000908152600160205280600260408220828155826001820155015580f35b3461020e57604036600319011261020e576004356001600160a01b0381160361020e5760243567ffffffffffffffff811161020e576102739036906004016101e0565b9060201161020e5790602090565b9060301161020e5760200190601090565b9060401161020e5760300190601090565b9060541161020e5760400190601490565b9060741161020e5760540190602090565b3590602081106103f5575090565b6000199060200360031b1b1690565b6001600160801b0319903581811693926010811061042157505050565b60100360031b82901b16169150565b6bffffffffffffffffffffffff19903581811693926014811061045257505050565b60140360031b82901b16169150565b634e487b7160e01b600052604160045260246000fd5b90601f8019910116810190811067ffffffffffffffff82111761049957604052565b610461565b604051906080820182811067ffffffffffffffff82111761049957604052565b903590601e198136030182121561020e570180359067ffffffffffffffff821161020e5760200191813603831361020e57565b92919267ffffffffffffffff8211610499576040519161051b601f8201601f191660200184610477565b82948184528183011161020e578281602093846000960137010152565b6040808252601c908201527f4166746572207369676e617475726520766572696669636174696f6e0000000060608201526001600160a01b03909116602082015260800190565b906008820180921161058d57565b634e487b7160e01b600052601160045260246000fd5b906106596002926106f4946106fa6106b1604097889788956106e861069788516106bd61066561066061064b7f023fcecc059a40aa6b27c2f6396558e6f934bd178900a6ddd11becc78ba483379c8d868061063883999060408252601d60408301527f4265666f7265207369676e617475726520766572696669636174696f6e00000060608301526000602060808401930152565b0390a16000526001602052604060002090565b9d878f9861014001906104be565b36916104f1565b6108cf565b9c949197929a909901549e51998a936020850191604193918352602083015260ff60f81b9060f81b1660408201520190565b03966106ab601f1998898101835282610477565b8c61095b565b809e5191829182610538565b0390a18c519586936020850191604193918352602083015260ff60f81b9060f81b1660408201520190565b03908101835282610477565b8361095b565b908651806107088482610538565b0390a1600054610728906001600160a01b03165b6001600160a01b031690565b6001600160a01b0395861690811495869283610885575b8851948552602085019690965290941693901515918491907f244ea28cc536cc982b21ce1f7891366d8f20beb25dca98e89dc32fa33a2c66c290604090a482610864575b50501561082a576108279065ffffffffffff42167f5b8b145452a26de4d37e4b467d8416d985f6ef907a0411cc7a1bb26e104499576108026107d56107ca6107ca4261057f565b65ffffffffffff1690565b936107e26107ca4261057f565b905165ffffffffffff808616825290911660208201529081906040820190565b0390a160d01b6001600160d01b03191660a09190911b65ffffffffffff60a01b161790565b90565b5160008152600160208201527f5b8b145452a26de4d37e4b467d8416d985f6ef907a0411cc7a1bb26e1044995790604090a1600160a01b90565b6001015490915061087d906001600160a01b031661071c565b143880610783565b60018601549093507f244ea28cc536cc982b21ce1f7891366d8f20beb25dca98e89dc32fa33a2c66c291906108c2906001600160a01b031661071c565b818516149390915061073f565b90608282510361090a57602082015191604081015191606082015160001a9160618101519160a1608183015192015160001a93959493929190565b60405162461bcd60e51b815260206004820152602360248201527f5369676e617475726573206c656e677468206d7573742062652031333020627960448201526274657360e81b6064820152608490fd5b6108279161096891610971565b909291926109cd565b81519190604183036109a25761099b92506020820151906060604084015193015160001a90610a5a565b9192909190565b505060009160029190565b600411156109b757565b634e487b7160e01b600052602160045260246000fd5b6109d6816109ad565b806109df575050565b6109e8816109ad565b60018103610a025760405163f645eedf60e01b8152600490fd5b610a0b816109ad565b60028103610a2c5760405163fce698f760e01b815260048101839052602490fd5b80610a386003926109ad565b14610a405750565b6040516335e2f38360e21b81526004810191909152602490fd5b91907f7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a08411610ade57926020929160ff608095604051948552168484015260408301526060820152600092839182805260015afa15610ad25780516001600160a01b03811615610ac957918190565b50809160019190565b604051903d90823e3d90fd5b5050506000916003919056fea2646970667358221220ad6a270ff448a03aaefec776d2205fd6194e9bd57ac62f6a40b41d3f82648be264736f6c63430008170033",
            sourceMap:
                "358:4395:24:-:0;;;;;;;934:24;358:4395;;-1:-1:-1;;;;;;358:4395:24;948:10;358:4395;;;;;;;;;;;;;",
            linkReferences: {}
        },
        deployedBytecode: {
            object: "0x6080604052600436101561001257600080fd5b60003560e01c80630c95955614610077578063333daf92146100725780633a871cdd1461006d578063599ebdfc146100685780638fc925aa1461006357639ea9bd591461005e57600080fd5b610352565b610327565b6102cb565b610280565b610242565b61008036610213565b90606082106101aa57610150826100a361009d6101a89585610395565b906103e7565b9061013b6100c36100bd6100b784886103a3565b90610404565b60801c90565b9461012b61010061009d6100dd6100bd6100b788876103b4565b956100fa6100f46100ee83886103c5565b90610430565b60601c90565b946103d6565b9361011b61010c61049e565b6001600160801b039099168952565b6001600160801b03166020880152565b6001600160a01b03166040860152565b60608401526000526001602052604060002090565b8151602083015160801b6001600160801b0319166001600160801b039190911617815560408201516001820180546001600160a01b0319166001600160a01b0392909216919091179055606090910151600290910155565b005b62461bcd60e51b6080526020608452601560a4527411185d1848199bdc9b585d081a5b98dbdc9c9958dd605a1b60c45260646080fd5b9181601f8401121561020e5782359167ffffffffffffffff831161020e576020838186019501011161020e57565b600080fd5b602060031982011261020e576004359067ffffffffffffffff821161020e5761023e916004016101e0565b9091565b3461020e57604036600319011261020e5760243567ffffffffffffffff811161020e576102739036906004016101e0565b5050602060405160008152f35b60031960603682011261020e576004359067ffffffffffffffff821161020e5761016090823603011261020e576102c360209160443590602435906004016105a3565b604051908152f35b3461020e57602036600319011261020e57600435600052600160205260806040600020805490600260018060a01b0360018301541691015490604051926001600160801b0381168452841c602084015260408301526060820152f35b61033361009d36610213565b6000908152600160205280600260408220828155826001820155015580f35b3461020e57604036600319011261020e576004356001600160a01b0381160361020e5760243567ffffffffffffffff811161020e576102739036906004016101e0565b9060201161020e5790602090565b9060301161020e5760200190601090565b9060401161020e5760300190601090565b9060541161020e5760400190601490565b9060741161020e5760540190602090565b3590602081106103f5575090565b6000199060200360031b1b1690565b6001600160801b0319903581811693926010811061042157505050565b60100360031b82901b16169150565b6bffffffffffffffffffffffff19903581811693926014811061045257505050565b60140360031b82901b16169150565b634e487b7160e01b600052604160045260246000fd5b90601f8019910116810190811067ffffffffffffffff82111761049957604052565b610461565b604051906080820182811067ffffffffffffffff82111761049957604052565b903590601e198136030182121561020e570180359067ffffffffffffffff821161020e5760200191813603831361020e57565b92919267ffffffffffffffff8211610499576040519161051b601f8201601f191660200184610477565b82948184528183011161020e578281602093846000960137010152565b6040808252601c908201527f4166746572207369676e617475726520766572696669636174696f6e0000000060608201526001600160a01b03909116602082015260800190565b906008820180921161058d57565b634e487b7160e01b600052601160045260246000fd5b906106596002926106f4946106fa6106b1604097889788956106e861069788516106bd61066561066061064b7f023fcecc059a40aa6b27c2f6396558e6f934bd178900a6ddd11becc78ba483379c8d868061063883999060408252601d60408301527f4265666f7265207369676e617475726520766572696669636174696f6e00000060608301526000602060808401930152565b0390a16000526001602052604060002090565b9d878f9861014001906104be565b36916104f1565b6108cf565b9c949197929a909901549e51998a936020850191604193918352602083015260ff60f81b9060f81b1660408201520190565b03966106ab601f1998898101835282610477565b8c61095b565b809e5191829182610538565b0390a18c519586936020850191604193918352602083015260ff60f81b9060f81b1660408201520190565b03908101835282610477565b8361095b565b908651806107088482610538565b0390a1600054610728906001600160a01b03165b6001600160a01b031690565b6001600160a01b0395861690811495869283610885575b8851948552602085019690965290941693901515918491907f244ea28cc536cc982b21ce1f7891366d8f20beb25dca98e89dc32fa33a2c66c290604090a482610864575b50501561082a576108279065ffffffffffff42167f5b8b145452a26de4d37e4b467d8416d985f6ef907a0411cc7a1bb26e104499576108026107d56107ca6107ca4261057f565b65ffffffffffff1690565b936107e26107ca4261057f565b905165ffffffffffff808616825290911660208201529081906040820190565b0390a160d01b6001600160d01b03191660a09190911b65ffffffffffff60a01b161790565b90565b5160008152600160208201527f5b8b145452a26de4d37e4b467d8416d985f6ef907a0411cc7a1bb26e1044995790604090a1600160a01b90565b6001015490915061087d906001600160a01b031661071c565b143880610783565b60018601549093507f244ea28cc536cc982b21ce1f7891366d8f20beb25dca98e89dc32fa33a2c66c291906108c2906001600160a01b031661071c565b818516149390915061073f565b90608282510361090a57602082015191604081015191606082015160001a9160618101519160a1608183015192015160001a93959493929190565b60405162461bcd60e51b815260206004820152602360248201527f5369676e617475726573206c656e677468206d7573742062652031333020627960448201526274657360e81b6064820152608490fd5b6108279161096891610971565b909291926109cd565b81519190604183036109a25761099b92506020820151906060604084015193015160001a90610a5a565b9192909190565b505060009160029190565b600411156109b757565b634e487b7160e01b600052602160045260246000fd5b6109d6816109ad565b806109df575050565b6109e8816109ad565b60018103610a025760405163f645eedf60e01b8152600490fd5b610a0b816109ad565b60028103610a2c5760405163fce698f760e01b815260048101839052602490fd5b80610a386003926109ad565b14610a405750565b6040516335e2f38360e21b81526004810191909152602490fd5b91907f7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a08411610ade57926020929160ff608095604051948552168484015260408301526060820152600092839182805260015afa15610ad25780516001600160a01b03811615610ac957918190565b50809160019190565b604051903d90823e3d90fd5b5050506000916003919056fea2646970667358221220ad6a270ff448a03aaefec776d2205fd6194e9bd57ac62f6a40b41d3f82648be264736f6c63430008170033",
            sourceMap:
                "358:4395:24:-:0;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;:::i;:::-;;:::i;:::-;;:::i;:::-;;:::i;:::-;;:::i;:::-;;;;:::i;:::-;1422:18;1438:2;1422:18;;358:4395;;1770:26;1511:10;1503:19;1511:10;358:4395;1511:10;;;:::i;:::-;1503:19;;:::i;:::-;1569:12;1799:164;1553:30;1561:21;1569:12;;;;:::i;:::-;1561:21;;:::i;:::-;358:4395;;;;1553:30;1630:12;1799:164;1737:22;1745:13;1614:30;1622:21;1630:12;;;;:::i;1614:30::-;1693:12;1677:30;1685:21;1693:12;;;;:::i;:::-;1685:21;;:::i;:::-;358:4395;;;;1677:30;1745:13;;:::i;1737:22::-;358:4395;1799:164;358:4395;;:::i;:::-;-1:-1:-1;;;;;358:4395:24;;;;;;1799:164;-1:-1:-1;;;;;358:4395:24;1518:2;1799:164;;358:4395;;1799:164;-1:-1:-1;;;;;358:4395:24;;1799:164;;358:4395;;1799:164;1438:2;1799:164;;358:4395;;;1770:17;358:4395;;;;;;;1770:26;358:4395;;;;;;;;-1:-1:-1;;;;;;358:4395:24;-1:-1:-1;;;;;358:4395:24;;;;;;;;;;;-1:-1:-1;358:4395:24;;;;-1:-1:-1;;;;;;358:4395:24;-1:-1:-1;;;;;358:4395:24;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;-1:-1:-1;;;358:4395:24;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;:::o;:::-;;;;;;-1:-1:-1;;358:4395:24;;;;;;;;;;;;;;;;;;:::i;:::-;;;:::o;:::-;;;;;;-1:-1:-1;;358:4395:24;;;;;;;;;;;;;;;;;;:::i;:::-;;;;;;-1:-1:-1;358:4395:24;;;;-1:-1:-1;;358:4395:24;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;:::i;:::-;;;;;;;;;;;;;-1:-1:-1;;358:4395:24;;;;;;-1:-1:-1;358:4395:24;846:57;358:4395;;;;-1:-1:-1;358:4395:24;;;;846:57;358:4395;;;;;846:57;;;358:4395;;846:57;;358:4395;;;;;-1:-1:-1;;;;;358:4395:24;;;;;;;;;;;;;;;;;;;;1140:13;358:4395;;;:::i;1140:13::-;1230:31;358:4395;;;1237:17;358:4395;;;;;;;;;;;1237:17;358:4395;;;;;;;;;;;;;-1:-1:-1;;358:4395:24;;;;;;-1:-1:-1;;;;;358:4395:24;;;;;;;;;;;;;;;;;;;:::i;:::-;;1518:2;358:4395;;;;1518:2;358:4395;:::o;:::-;;1578:2;358:4395;;;1518:2;358:4395;;;;:::o;:::-;;;;;;1578:2;358:4395;;;;:::o;:::-;;1702:2;358:4395;;;;;;;;:::o;:::-;;1754:3;358:4395;;;1702:2;358:4395;;;;:::o;:::-;;;;;;;;;;:::o;:::-;;;;;;;;;;;:::o;:::-;-1:-1:-1;;;;;;358:4395:24;;;;;;;;;;;;;;;:::o;:::-;;;;;;;;;;;-1:-1:-1;358:4395:24:o;:::-;-1:-1:-1;;358:4395:24;;;;;;;;;;;;;;;:::o;:::-;;;;;;;;;;;-1:-1:-1;358:4395:24:o;:::-;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;:::o;:::-;;:::i;:::-;;;;;;;;;;;;;;;;;;:::o;:::-;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;:::o;:::-;;;;;;;;;;;;;;;;-1:-1:-1;;358:4395:24;;;;;:::i;:::-;;;;;;;;;;;;;;;;;-1:-1:-1;358:4395:24;;;;;;:::o;:::-;;;;;;;;;;;;;;;-1:-1:-1;;;;;358:4395:24;;;;;;;;;;:::o;:::-;;3578:1;358:4395;;;;;;;:::o;:::-;;;;;;;;;;;;2063:1664;;2553:17;2600:15;2063:1664;2770:28;2063:1664;2746:53;2600;358:4395;;;;;;2770:28;2624;358:4395;;2668:50;2536:35;358:4395;2346:26;2253:54;;;;;;;;358:4395;;;;;;;;;;;;;;;;;;;;;;;2253:54;;;;358:4395;;1770:17;358:4395;;;;;;;2346:26;2553:17;;;;;;;;:::i;:::-;358:4395;;;:::i;:::-;2536:35;:::i;:::-;2600:15;;;;;;;;;358:4395;;;2624:28;;;;;;358:4395;;;;;;;;;;;;;;;;;;;;;;;;2624:28;;358:4395;2624:28;358:4395;;2624:28;;;;;;;;:::i;:::-;2600:53;;:::i;:::-;358:4395;;;2668:50;;;;;:::i;:::-;;;;358:4395;;2770:28;;;2624;2770;;358:4395;;;;;;;;;;;;;;;;;;;;;;;;2770:28;;;;;;;;;:::i;:::-;2746:53;;:::i;:::-;358:4395;;;2814:50;;;;;:::i;:::-;;;;2304:1;358:4395;3010:22;;-1:-1:-1;;;;;358:4395:24;;-1:-1:-1;;;;;358:4395:24;;;3010:22;-1:-1:-1;;;;;358:4395:24;;;3010:22;;;;;;;:54;;2063:1664;358:4395;;;;;;;;;;;;;;;;;;;;;;;2879:195;;358:4395;;2879:195;3098:58;;;2063:1664;3171:6;;;3167:261;;3678:42;3485:15;358:4395;3485:15;358:4395;3596:64;;3537:44;3553:27;3560:19;3485:15;3560:19;:::i;:::-;358:4395;;;;3537:44;3485:15;3632:27;3639:19;3485:15;3639:19;:::i;3632:27::-;358:4395;;;;;;;;;;;;;;;;;;;;;;;3596:64;;;;358:4395;;-1:-1:-1;;;;;;358:4395:24;;;;;;-1:-1:-1;;;358:4395:24;292:93:26;;146:248;3678:42:24;2063:1664;:::o;3167:261::-;358:4395;2304:1;358:4395;;2346:17;358:4395;;;;3324:16;;358:4395;;3324:16;-1:-1:-1;;;358:4395:24;3354:63::o;3098:58::-;2346:17;3138;358:4395;3138:17;;-1:-1:-1;3127:28:24;;-1:-1:-1;;;;;358:4395:24;;;3127:28;;3098:58;;;;3010:54;2346:17;3047;;358:4395;3047:17;;-1:-1:-1;2879:195:24;;3047:17;3036:28;;-1:-1:-1;;;;;358:4395:24;;;3036:28;358:4395;;;3036:28;3010:54;;;;;;3733:747;;3942:3;358:4395;;3921:24;358:4395;;4033:164;;;;;;;;;;;;;;;;4266:166;;;;;;;;;;;;;;4033:164;4266:166;4442:31;;;;;;3733:747;:::o;358:4395::-;;;-1:-1:-1;;;358:4395:24;;;;;;;;;;;;;;;;;-1:-1:-1;;;358:4395:24;;;;;;;3702:255:23;3915:8;3702:255;3859:27;3702:255;3859:27;:::i;:::-;3915:8;;;;;:::i;2129:766::-;358:4395:24;;;2129:766:23;2276:2;2256:22;;2276:2;;2739:25;2539:180;;;;;;;;;;;;;;;-1:-1:-1;2539:180:23;2739:25;;:::i;:::-;2732:32;;;;;:::o;2252:637::-;2795:83;;2811:1;2795:83;2815:35;2795:83;;:::o;358:4395:24:-;;-1:-1:-1;358:4395:24;;;:::o;:::-;;;;;;;;;;;;7196:532:23;358:4395:24;;;:::i;:::-;7282:29:23;;;7327:7;;:::o;7278:444::-;358:4395:24;;;:::i;:::-;7387:29:23;7378:38;;7387:29;;358:4395:24;;-1:-1:-1;;;7439:23:23;;;;;7374:348;358:4395:24;;;:::i;:::-;7492:35:23;7483:44;;7492:35;;358:4395:24;;-1:-1:-1;;;7550:46:23;;;;;358:4395:24;;;;;7550:46:23;7479:243;358:4395:24;;7626:30:23;358:4395:24;;:::i;:::-;7617:39:23;7613:109;;7479:243;7196:532::o;7613:109::-;358:4395:24;;-1:-1:-1;;;7679:32:23;;;;;358:4395:24;;;;;;7550:46:23;5140:1530;;;6199:66;6186:79;;6182:164;;358:4395:24;;;;;;;;;;;;;;;;;;;;;;;;;-1:-1:-1;6457:24:23;;;;;;;;;;;;;;-1:-1:-1;;;;;358:4395:24;;6495:20:23;6491:113;;6614:49;;5140:1530;:::o;6491:113::-;6531:62;;;6457:24;6531:62;;:::o;6457:24::-;358:4395:24;;;;;;;;;;6182:164:23;6281:54;;;6297:1;6281:54;6301:30;6281:54;;:::o",
            linkReferences: {}
        },
        methodIdentifiers: {
            "disable(bytes)": "8fc925aa",
            "enable(bytes)": "0c959556",
            "smartActionProofs(uint256)": "599ebdfc",
            "validCaller(address,bytes)": "9ea9bd59",
            "validateSignature(bytes32,bytes)": "333daf92",
            "validateUserOp((address,uint256,bytes,bytes,uint256,uint256,uint256,uint256,uint256,bytes,bytes),bytes32,uint256)":
                "3a871cdd"
        },
        rawMetadata:
            '{"compiler":{"version":"0.8.23+commit.f704f362"},"language":"Solidity","output":{"abi":[{"inputs":[],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[],"name":"ECDSAInvalidSignature","type":"error"},{"inputs":[{"internalType":"uint256","name":"length","type":"uint256"}],"name":"ECDSAInvalidSignatureLength","type":"error"},{"inputs":[{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"ECDSAInvalidSignatureS","type":"error"},{"inputs":[],"name":"NotImplemented","type":"error"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"string","name":"message","type":"string"},{"indexed":false,"internalType":"address","name":"recoveredAddress","type":"address"}],"name":"DebugInfo","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"signer1","type":"address"},{"indexed":true,"internalType":"address","name":"signer2","type":"address"},{"indexed":false,"internalType":"bytes32","name":"proofHash","type":"bytes32"},{"indexed":false,"internalType":"bytes32","name":"userOpHash","type":"bytes32"},{"indexed":true,"internalType":"bool","name":"valid","type":"bool"}],"name":"SignatureVerification","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint48","name":"validAfter","type":"uint48"},{"indexed":false,"internalType":"uint48","name":"validUntil","type":"uint48"}],"name":"Validation","type":"event"},{"inputs":[{"internalType":"bytes","name":"data","type":"bytes"}],"name":"disable","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"bytes","name":"_data","type":"bytes"}],"name":"enable","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"smartActionProofs","outputs":[{"internalType":"uint128","name":"model_id","type":"uint128"},{"internalType":"uint128","name":"version_id","type":"uint128"},{"internalType":"address","name":"userAddress","type":"address"},{"internalType":"bytes32","name":"proofHash","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"caller","type":"address"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"validCaller","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"hash","type":"bytes32"},{"internalType":"bytes","name":"signature","type":"bytes"}],"name":"validateSignature","outputs":[{"internalType":"ValidationData","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"components":[{"internalType":"address","name":"sender","type":"address"},{"internalType":"uint256","name":"nonce","type":"uint256"},{"internalType":"bytes","name":"initCode","type":"bytes"},{"internalType":"bytes","name":"callData","type":"bytes"},{"internalType":"uint256","name":"callGasLimit","type":"uint256"},{"internalType":"uint256","name":"verificationGasLimit","type":"uint256"},{"internalType":"uint256","name":"preVerificationGas","type":"uint256"},{"internalType":"uint256","name":"maxFeePerGas","type":"uint256"},{"internalType":"uint256","name":"maxPriorityFeePerGas","type":"uint256"},{"internalType":"bytes","name":"paymasterAndData","type":"bytes"},{"internalType":"bytes","name":"signature","type":"bytes"}],"internalType":"struct UserOperation","name":"_userOp","type":"tuple"},{"internalType":"bytes32","name":"_userOpHash","type":"bytes32"},{"internalType":"uint256","name":"proofId","type":"uint256"}],"name":"validateUserOp","outputs":[{"internalType":"ValidationData","name":"","type":"uint256"}],"stateMutability":"payable","type":"function"}],"devdoc":{"errors":{"ECDSAInvalidSignature()":[{"details":"The signature derives the `address(0)`."}],"ECDSAInvalidSignatureLength(uint256)":[{"details":"The signature has an invalid length."}],"ECDSAInvalidSignatureS(bytes32)":[{"details":"The signature has an S value that is in the upper half order."}]},"kind":"dev","methods":{},"version":1},"userdoc":{"kind":"user","methods":{},"version":1}},"settings":{"compilationTarget":{"src/contracts/ProofSigValidator.sol":"ProofSigValidator"},"evmVersion":"paris","libraries":{},"metadata":{"bytecodeHash":"ipfs"},"optimizer":{"enabled":true,"runs":200},"remappings":[":@openzeppelin/contracts/=lib/openzeppelin-contracts/contracts/",":account-abstraction/=lib/account-abstraction/contracts/",":ds-test/=lib/forge-std/lib/ds-test/src/",":erc4626-tests/=lib/openzeppelin-contracts/lib/erc4626-tests/",":forge-std/=lib/forge-std/src/",":openzeppelin-contracts/=lib/openzeppelin-contracts/"],"viaIR":true},"sources":{"lib/openzeppelin-contracts/contracts/utils/cryptography/ECDSA.sol":{"keccak256":"0xa548dd62e9e17616ae80a1e7ac7b1447ae377efc27fb9f7b4f4fbf5c0b0a1dfb","license":"MIT","urls":["bzz-raw://d27e9ae3e67eb229444cd43d49db5be57c586155fd1d363b3b1f9bb1b7bb0087","dweb:/ipfs/QmT2GFnpXsTWBs8bkeVJtQ4VNX7f3igxwB77JBCr4mDXb3"]},"src/contracts/ProofSigValidator.sol":{"keccak256":"0x0a6f93d5e3dc52d5f5cd676fda770a5b2be0a8d3c5bb3cd8e508db11042ea9b5","license":"UNLICENSED","urls":["bzz-raw://41b709b3c8a98c668ebde8f6b86654b8fd6d591af03cdaf6513d26f19d74e851","dweb:/ipfs/QmQeBMiVgFdiZNSMUyWXEJUNV8viAwRrqEDMqCYHZqiJMB"]},"src/contracts/interfaces/IKernelValidator.sol":{"keccak256":"0xd61b69b816866fb1da57305bd078ae8c09189cf45b13dffcbb4e75c4bfaa483a","license":"MIT","urls":["bzz-raw://9795ab2e123f55b1adf4f021fd0c7f24e2cbe456a607b95b0c459b771277ea34","dweb:/ipfs/Qmf61aqHvBUTQyaxjqkV6DepUXGxK5Mkj4YCnkFyZAPU1j"]},"src/contracts/resources/Types.sol":{"keccak256":"0xe4a58c22295c9d836fea089b427564ba0cf80cb77f46dfaa6e73755af8571adb","license":"MIT","urls":["bzz-raw://10946a60a635098211133d9156633a1df9de1cc04c925564eb9d84dbd5c3aabb","dweb:/ipfs/QmcieJU67ASHHhd6HftiNVGVBAW2eag62Ajj7xQaX4NPXe"]},"src/contracts/resources/UserOperation.sol":{"keccak256":"0x0fb640b9559eecd1de49827b877041cc28e82bea6b3e01c6867cea3968feb28d","license":"GPL-3.0","urls":["bzz-raw://76cee1876b1bc16896f21e18209581ea1286cda06fa0d12d4b865aa80c9ec293","dweb:/ipfs/QmQghuxXpBH9FNXXKPCyqMbrBipoBmskVXCb2dP6PtD7qt"]}},"version":1}',
        metadata: {
            compiler: { version: "0.8.23+commit.f704f362" },
            language: "Solidity",
            output: {
                abi: [
                    {
                        inputs: [],
                        stateMutability: "nonpayable",
                        type: "constructor"
                    },
                    {
                        inputs: [],
                        type: "error",
                        name: "ECDSAInvalidSignature"
                    },
                    {
                        inputs: [
                            {
                                internalType: "uint256",
                                name: "length",
                                type: "uint256"
                            }
                        ],
                        type: "error",
                        name: "ECDSAInvalidSignatureLength"
                    },
                    {
                        inputs: [
                            {
                                internalType: "bytes32",
                                name: "s",
                                type: "bytes32"
                            }
                        ],
                        type: "error",
                        name: "ECDSAInvalidSignatureS"
                    },
                    { inputs: [], type: "error", name: "NotImplemented" },
                    {
                        inputs: [
                            {
                                internalType: "string",
                                name: "message",
                                type: "string",
                                indexed: false
                            },
                            {
                                internalType: "address",
                                name: "recoveredAddress",
                                type: "address",
                                indexed: false
                            }
                        ],
                        type: "event",
                        name: "DebugInfo",
                        anonymous: false
                    },
                    {
                        inputs: [
                            {
                                internalType: "address",
                                name: "signer1",
                                type: "address",
                                indexed: true
                            },
                            {
                                internalType: "address",
                                name: "signer2",
                                type: "address",
                                indexed: true
                            },
                            {
                                internalType: "bytes32",
                                name: "proofHash",
                                type: "bytes32",
                                indexed: false
                            },
                            {
                                internalType: "bytes32",
                                name: "userOpHash",
                                type: "bytes32",
                                indexed: false
                            },
                            {
                                internalType: "bool",
                                name: "valid",
                                type: "bool",
                                indexed: true
                            }
                        ],
                        type: "event",
                        name: "SignatureVerification",
                        anonymous: false
                    },
                    {
                        inputs: [
                            {
                                internalType: "uint48",
                                name: "validAfter",
                                type: "uint48",
                                indexed: false
                            },
                            {
                                internalType: "uint48",
                                name: "validUntil",
                                type: "uint48",
                                indexed: false
                            }
                        ],
                        type: "event",
                        name: "Validation",
                        anonymous: false
                    },
                    {
                        inputs: [
                            {
                                internalType: "bytes",
                                name: "data",
                                type: "bytes"
                            }
                        ],
                        stateMutability: "payable",
                        type: "function",
                        name: "disable"
                    },
                    {
                        inputs: [
                            {
                                internalType: "bytes",
                                name: "_data",
                                type: "bytes"
                            }
                        ],
                        stateMutability: "payable",
                        type: "function",
                        name: "enable"
                    },
                    {
                        inputs: [
                            {
                                internalType: "uint256",
                                name: "",
                                type: "uint256"
                            }
                        ],
                        stateMutability: "view",
                        type: "function",
                        name: "smartActionProofs",
                        outputs: [
                            {
                                internalType: "uint128",
                                name: "model_id",
                                type: "uint128"
                            },
                            {
                                internalType: "uint128",
                                name: "version_id",
                                type: "uint128"
                            },
                            {
                                internalType: "address",
                                name: "userAddress",
                                type: "address"
                            },
                            {
                                internalType: "bytes32",
                                name: "proofHash",
                                type: "bytes32"
                            }
                        ]
                    },
                    {
                        inputs: [
                            {
                                internalType: "address",
                                name: "caller",
                                type: "address"
                            },
                            {
                                internalType: "bytes",
                                name: "data",
                                type: "bytes"
                            }
                        ],
                        stateMutability: "view",
                        type: "function",
                        name: "validCaller",
                        outputs: [
                            { internalType: "bool", name: "", type: "bool" }
                        ]
                    },
                    {
                        inputs: [
                            {
                                internalType: "bytes32",
                                name: "hash",
                                type: "bytes32"
                            },
                            {
                                internalType: "bytes",
                                name: "signature",
                                type: "bytes"
                            }
                        ],
                        stateMutability: "view",
                        type: "function",
                        name: "validateSignature",
                        outputs: [
                            {
                                internalType: "ValidationData",
                                name: "",
                                type: "uint256"
                            }
                        ]
                    },
                    {
                        inputs: [
                            {
                                internalType: "struct UserOperation",
                                name: "_userOp",
                                type: "tuple",
                                components: [
                                    {
                                        internalType: "address",
                                        name: "sender",
                                        type: "address"
                                    },
                                    {
                                        internalType: "uint256",
                                        name: "nonce",
                                        type: "uint256"
                                    },
                                    {
                                        internalType: "bytes",
                                        name: "initCode",
                                        type: "bytes"
                                    },
                                    {
                                        internalType: "bytes",
                                        name: "callData",
                                        type: "bytes"
                                    },
                                    {
                                        internalType: "uint256",
                                        name: "callGasLimit",
                                        type: "uint256"
                                    },
                                    {
                                        internalType: "uint256",
                                        name: "verificationGasLimit",
                                        type: "uint256"
                                    },
                                    {
                                        internalType: "uint256",
                                        name: "preVerificationGas",
                                        type: "uint256"
                                    },
                                    {
                                        internalType: "uint256",
                                        name: "maxFeePerGas",
                                        type: "uint256"
                                    },
                                    {
                                        internalType: "uint256",
                                        name: "maxPriorityFeePerGas",
                                        type: "uint256"
                                    },
                                    {
                                        internalType: "bytes",
                                        name: "paymasterAndData",
                                        type: "bytes"
                                    },
                                    {
                                        internalType: "bytes",
                                        name: "signature",
                                        type: "bytes"
                                    }
                                ]
                            },
                            {
                                internalType: "bytes32",
                                name: "_userOpHash",
                                type: "bytes32"
                            },
                            {
                                internalType: "uint256",
                                name: "proofId",
                                type: "uint256"
                            }
                        ],
                        stateMutability: "payable",
                        type: "function",
                        name: "validateUserOp",
                        outputs: [
                            {
                                internalType: "ValidationData",
                                name: "",
                                type: "uint256"
                            }
                        ]
                    }
                ],
                devdoc: { kind: "dev", methods: {}, version: 1 },
                userdoc: { kind: "user", methods: {}, version: 1 }
            },
            settings: {
                remappings: [
                    "@openzeppelin/contracts/=lib/openzeppelin-contracts/contracts/",
                    "account-abstraction/=lib/account-abstraction/contracts/",
                    "ds-test/=lib/forge-std/lib/ds-test/src/",
                    "erc4626-tests/=lib/openzeppelin-contracts/lib/erc4626-tests/",
                    "forge-std/=lib/forge-std/src/",
                    "openzeppelin-contracts/=lib/openzeppelin-contracts/"
                ],
                optimizer: { enabled: true, runs: 200 },
                metadata: { bytecodeHash: "ipfs" },
                compilationTarget: {
                    "src/contracts/ProofSigValidator.sol": "ProofSigValidator"
                },
                evmVersion: "paris",
                libraries: {},
                viaIR: true
            },
            sources: {
                "lib/openzeppelin-contracts/contracts/utils/cryptography/ECDSA.sol":
                    {
                        keccak256:
                            "0xa548dd62e9e17616ae80a1e7ac7b1447ae377efc27fb9f7b4f4fbf5c0b0a1dfb",
                        urls: [
                            "bzz-raw://d27e9ae3e67eb229444cd43d49db5be57c586155fd1d363b3b1f9bb1b7bb0087",
                            "dweb:/ipfs/QmT2GFnpXsTWBs8bkeVJtQ4VNX7f3igxwB77JBCr4mDXb3"
                        ],
                        license: "MIT"
                    },
                "src/contracts/ProofSigValidator.sol": {
                    keccak256:
                        "0x0a6f93d5e3dc52d5f5cd676fda770a5b2be0a8d3c5bb3cd8e508db11042ea9b5",
                    urls: [
                        "bzz-raw://41b709b3c8a98c668ebde8f6b86654b8fd6d591af03cdaf6513d26f19d74e851",
                        "dweb:/ipfs/QmQeBMiVgFdiZNSMUyWXEJUNV8viAwRrqEDMqCYHZqiJMB"
                    ],
                    license: "UNLICENSED"
                },
                "src/contracts/interfaces/IKernelValidator.sol": {
                    keccak256:
                        "0xd61b69b816866fb1da57305bd078ae8c09189cf45b13dffcbb4e75c4bfaa483a",
                    urls: [
                        "bzz-raw://9795ab2e123f55b1adf4f021fd0c7f24e2cbe456a607b95b0c459b771277ea34",
                        "dweb:/ipfs/Qmf61aqHvBUTQyaxjqkV6DepUXGxK5Mkj4YCnkFyZAPU1j"
                    ],
                    license: "MIT"
                },
                "src/contracts/resources/Types.sol": {
                    keccak256:
                        "0xe4a58c22295c9d836fea089b427564ba0cf80cb77f46dfaa6e73755af8571adb",
                    urls: [
                        "bzz-raw://10946a60a635098211133d9156633a1df9de1cc04c925564eb9d84dbd5c3aabb",
                        "dweb:/ipfs/QmcieJU67ASHHhd6HftiNVGVBAW2eag62Ajj7xQaX4NPXe"
                    ],
                    license: "MIT"
                },
                "src/contracts/resources/UserOperation.sol": {
                    keccak256:
                        "0x0fb640b9559eecd1de49827b877041cc28e82bea6b3e01c6867cea3968feb28d",
                    urls: [
                        "bzz-raw://76cee1876b1bc16896f21e18209581ea1286cda06fa0d12d4b865aa80c9ec293",
                        "dweb:/ipfs/QmQghuxXpBH9FNXXKPCyqMbrBipoBmskVXCb2dP6PtD7qt"
                    ],
                    license: "GPL-3.0"
                }
            },
            version: 1
        },
        ast: {
            absolutePath: "src/contracts/ProofSigValidator.sol",
            id: 46053,
            exportedSymbols: {
                ECDSA: [45636],
                IKernelValidator: [46102],
                ProofSigValidator: [46052],
                ProofStorage: [45653],
                UserOperation: [46188],
                ValidAfter: [46106],
                ValidUntil: [46108],
                ValidationData: [46110],
                packValidationData: [46146],
                parseValidationData: [46162]
            },
            nodeType: "SourceUnit",
            src: "40:4714:24",
            nodes: [
                {
                    id: 45638,
                    nodeType: "PragmaDirective",
                    src: "40:31:24",
                    nodes: [],
                    literals: ["solidity", ">=", "0.8", ".2", "<", "0.9", ".0"]
                },
                {
                    id: 45639,
                    nodeType: "ImportDirective",
                    src: "73:43:24",
                    nodes: [],
                    absolutePath:
                        "src/contracts/interfaces/IKernelValidator.sol",
                    file: "./interfaces/IKernelValidator.sol",
                    nameLocation: "-1:-1:-1",
                    scope: 46053,
                    sourceUnit: 46103,
                    symbolAliases: [],
                    unitAlias: ""
                },
                {
                    id: 45640,
                    nodeType: "ImportDirective",
                    src: "117:62:24",
                    nodes: [],
                    absolutePath:
                        "lib/openzeppelin-contracts/contracts/utils/cryptography/ECDSA.sol",
                    file: "@openzeppelin/contracts/utils/cryptography/ECDSA.sol",
                    nameLocation: "-1:-1:-1",
                    scope: 46053,
                    sourceUnit: 45637,
                    symbolAliases: [],
                    unitAlias: ""
                },
                {
                    id: 45641,
                    nodeType: "ImportDirective",
                    src: "180:31:24",
                    nodes: [],
                    absolutePath: "src/contracts/resources/Types.sol",
                    file: "./resources/Types.sol",
                    nameLocation: "-1:-1:-1",
                    scope: 46053,
                    sourceUnit: 46163,
                    symbolAliases: [],
                    unitAlias: ""
                },
                {
                    id: 45644,
                    nodeType: "UsingForDirective",
                    src: "213:24:24",
                    nodes: [],
                    global: false,
                    libraryName: {
                        id: 45642,
                        name: "ECDSA",
                        nameLocations: ["219:5:24"],
                        nodeType: "IdentifierPath",
                        referencedDeclaration: 45636,
                        src: "219:5:24"
                    },
                    typeName: {
                        id: 45643,
                        name: "bytes32",
                        nodeType: "ElementaryTypeName",
                        src: "229:7:24",
                        typeDescriptions: {
                            typeIdentifier: "t_bytes32",
                            typeString: "bytes32"
                        }
                    }
                },
                {
                    id: 45653,
                    nodeType: "StructDefinition",
                    src: "239:117:24",
                    nodes: [],
                    canonicalName: "ProofStorage",
                    members: [
                        {
                            constant: false,
                            id: 45646,
                            mutability: "mutable",
                            name: "model_id",
                            nameLocation: "273:8:24",
                            nodeType: "VariableDeclaration",
                            scope: 45653,
                            src: "265:16:24",
                            stateVariable: false,
                            storageLocation: "default",
                            typeDescriptions: {
                                typeIdentifier: "t_uint128",
                                typeString: "uint128"
                            },
                            typeName: {
                                id: 45645,
                                name: "uint128",
                                nodeType: "ElementaryTypeName",
                                src: "265:7:24",
                                typeDescriptions: {
                                    typeIdentifier: "t_uint128",
                                    typeString: "uint128"
                                }
                            },
                            visibility: "internal"
                        },
                        {
                            constant: false,
                            id: 45648,
                            mutability: "mutable",
                            name: "version_id",
                            nameLocation: "295:10:24",
                            nodeType: "VariableDeclaration",
                            scope: 45653,
                            src: "287:18:24",
                            stateVariable: false,
                            storageLocation: "default",
                            typeDescriptions: {
                                typeIdentifier: "t_uint128",
                                typeString: "uint128"
                            },
                            typeName: {
                                id: 45647,
                                name: "uint128",
                                nodeType: "ElementaryTypeName",
                                src: "287:7:24",
                                typeDescriptions: {
                                    typeIdentifier: "t_uint128",
                                    typeString: "uint128"
                                }
                            },
                            visibility: "internal"
                        },
                        {
                            constant: false,
                            id: 45650,
                            mutability: "mutable",
                            name: "userAddress",
                            nameLocation: "319:11:24",
                            nodeType: "VariableDeclaration",
                            scope: 45653,
                            src: "311:19:24",
                            stateVariable: false,
                            storageLocation: "default",
                            typeDescriptions: {
                                typeIdentifier: "t_address",
                                typeString: "address"
                            },
                            typeName: {
                                id: 45649,
                                name: "address",
                                nodeType: "ElementaryTypeName",
                                src: "311:7:24",
                                stateMutability: "nonpayable",
                                typeDescriptions: {
                                    typeIdentifier: "t_address",
                                    typeString: "address"
                                }
                            },
                            visibility: "internal"
                        },
                        {
                            constant: false,
                            id: 45652,
                            mutability: "mutable",
                            name: "proofHash",
                            nameLocation: "344:9:24",
                            nodeType: "VariableDeclaration",
                            scope: 45653,
                            src: "336:17:24",
                            stateVariable: false,
                            storageLocation: "default",
                            typeDescriptions: {
                                typeIdentifier: "t_bytes32",
                                typeString: "bytes32"
                            },
                            typeName: {
                                id: 45651,
                                name: "bytes32",
                                nodeType: "ElementaryTypeName",
                                src: "336:7:24",
                                typeDescriptions: {
                                    typeIdentifier: "t_bytes32",
                                    typeString: "bytes32"
                                }
                            },
                            visibility: "internal"
                        }
                    ],
                    name: "ProofStorage",
                    nameLocation: "246:12:24",
                    scope: 46053,
                    visibility: "public"
                },
                {
                    id: 46052,
                    nodeType: "ContractDefinition",
                    src: "358:4395:24",
                    nodes: [
                        {
                            id: 45661,
                            nodeType: "EventDefinition",
                            src: "411:55:24",
                            nodes: [],
                            anonymous: false,
                            eventSelector:
                                "5b8b145452a26de4d37e4b467d8416d985f6ef907a0411cc7a1bb26e10449957",
                            name: "Validation",
                            nameLocation: "417:10:24",
                            parameters: {
                                id: 45660,
                                nodeType: "ParameterList",
                                parameters: [
                                    {
                                        constant: false,
                                        id: 45657,
                                        indexed: false,
                                        mutability: "mutable",
                                        name: "validAfter",
                                        nameLocation: "435:10:24",
                                        nodeType: "VariableDeclaration",
                                        scope: 45661,
                                        src: "428:17:24",
                                        stateVariable: false,
                                        storageLocation: "default",
                                        typeDescriptions: {
                                            typeIdentifier: "t_uint48",
                                            typeString: "uint48"
                                        },
                                        typeName: {
                                            id: 45656,
                                            name: "uint48",
                                            nodeType: "ElementaryTypeName",
                                            src: "428:6:24",
                                            typeDescriptions: {
                                                typeIdentifier: "t_uint48",
                                                typeString: "uint48"
                                            }
                                        },
                                        visibility: "internal"
                                    },
                                    {
                                        constant: false,
                                        id: 45659,
                                        indexed: false,
                                        mutability: "mutable",
                                        name: "validUntil",
                                        nameLocation: "454:10:24",
                                        nodeType: "VariableDeclaration",
                                        scope: 45661,
                                        src: "447:17:24",
                                        stateVariable: false,
                                        storageLocation: "default",
                                        typeDescriptions: {
                                            typeIdentifier: "t_uint48",
                                            typeString: "uint48"
                                        },
                                        typeName: {
                                            id: 45658,
                                            name: "uint48",
                                            nodeType: "ElementaryTypeName",
                                            src: "447:6:24",
                                            typeDescriptions: {
                                                typeIdentifier: "t_uint48",
                                                typeString: "uint48"
                                            }
                                        },
                                        visibility: "internal"
                                    }
                                ],
                                src: "427:38:24"
                            }
                        },
                        {
                            id: 45673,
                            nodeType: "EventDefinition",
                            src: "471:183:24",
                            nodes: [],
                            anonymous: false,
                            eventSelector:
                                "244ea28cc536cc982b21ce1f7891366d8f20beb25dca98e89dc32fa33a2c66c2",
                            name: "SignatureVerification",
                            nameLocation: "477:21:24",
                            parameters: {
                                id: 45672,
                                nodeType: "ParameterList",
                                parameters: [
                                    {
                                        constant: false,
                                        id: 45663,
                                        indexed: true,
                                        mutability: "mutable",
                                        name: "signer1",
                                        nameLocation: "524:7:24",
                                        nodeType: "VariableDeclaration",
                                        scope: 45673,
                                        src: "508:23:24",
                                        stateVariable: false,
                                        storageLocation: "default",
                                        typeDescriptions: {
                                            typeIdentifier: "t_address",
                                            typeString: "address"
                                        },
                                        typeName: {
                                            id: 45662,
                                            name: "address",
                                            nodeType: "ElementaryTypeName",
                                            src: "508:7:24",
                                            stateMutability: "nonpayable",
                                            typeDescriptions: {
                                                typeIdentifier: "t_address",
                                                typeString: "address"
                                            }
                                        },
                                        visibility: "internal"
                                    },
                                    {
                                        constant: false,
                                        id: 45665,
                                        indexed: true,
                                        mutability: "mutable",
                                        name: "signer2",
                                        nameLocation: "557:7:24",
                                        nodeType: "VariableDeclaration",
                                        scope: 45673,
                                        src: "541:23:24",
                                        stateVariable: false,
                                        storageLocation: "default",
                                        typeDescriptions: {
                                            typeIdentifier: "t_address",
                                            typeString: "address"
                                        },
                                        typeName: {
                                            id: 45664,
                                            name: "address",
                                            nodeType: "ElementaryTypeName",
                                            src: "541:7:24",
                                            stateMutability: "nonpayable",
                                            typeDescriptions: {
                                                typeIdentifier: "t_address",
                                                typeString: "address"
                                            }
                                        },
                                        visibility: "internal"
                                    },
                                    {
                                        constant: false,
                                        id: 45667,
                                        indexed: false,
                                        mutability: "mutable",
                                        name: "proofHash",
                                        nameLocation: "582:9:24",
                                        nodeType: "VariableDeclaration",
                                        scope: 45673,
                                        src: "574:17:24",
                                        stateVariable: false,
                                        storageLocation: "default",
                                        typeDescriptions: {
                                            typeIdentifier: "t_bytes32",
                                            typeString: "bytes32"
                                        },
                                        typeName: {
                                            id: 45666,
                                            name: "bytes32",
                                            nodeType: "ElementaryTypeName",
                                            src: "574:7:24",
                                            typeDescriptions: {
                                                typeIdentifier: "t_bytes32",
                                                typeString: "bytes32"
                                            }
                                        },
                                        visibility: "internal"
                                    },
                                    {
                                        constant: false,
                                        id: 45669,
                                        indexed: false,
                                        mutability: "mutable",
                                        name: "userOpHash",
                                        nameLocation: "609:10:24",
                                        nodeType: "VariableDeclaration",
                                        scope: 45673,
                                        src: "601:18:24",
                                        stateVariable: false,
                                        storageLocation: "default",
                                        typeDescriptions: {
                                            typeIdentifier: "t_bytes32",
                                            typeString: "bytes32"
                                        },
                                        typeName: {
                                            id: 45668,
                                            name: "bytes32",
                                            nodeType: "ElementaryTypeName",
                                            src: "601:7:24",
                                            typeDescriptions: {
                                                typeIdentifier: "t_bytes32",
                                                typeString: "bytes32"
                                            }
                                        },
                                        visibility: "internal"
                                    },
                                    {
                                        constant: false,
                                        id: 45671,
                                        indexed: true,
                                        mutability: "mutable",
                                        name: "valid",
                                        nameLocation: "642:5:24",
                                        nodeType: "VariableDeclaration",
                                        scope: 45673,
                                        src: "629:18:24",
                                        stateVariable: false,
                                        storageLocation: "default",
                                        typeDescriptions: {
                                            typeIdentifier: "t_bool",
                                            typeString: "bool"
                                        },
                                        typeName: {
                                            id: 45670,
                                            name: "bool",
                                            nodeType: "ElementaryTypeName",
                                            src: "629:4:24",
                                            typeDescriptions: {
                                                typeIdentifier: "t_bool",
                                                typeString: "bool"
                                            }
                                        },
                                        visibility: "internal"
                                    }
                                ],
                                src: "498:155:24"
                            }
                        },
                        {
                            id: 45679,
                            nodeType: "EventDefinition",
                            src: "659:58:24",
                            nodes: [],
                            anonymous: false,
                            eventSelector:
                                "023fcecc059a40aa6b27c2f6396558e6f934bd178900a6ddd11becc78ba48337",
                            name: "DebugInfo",
                            nameLocation: "665:9:24",
                            parameters: {
                                id: 45678,
                                nodeType: "ParameterList",
                                parameters: [
                                    {
                                        constant: false,
                                        id: 45675,
                                        indexed: false,
                                        mutability: "mutable",
                                        name: "message",
                                        nameLocation: "682:7:24",
                                        nodeType: "VariableDeclaration",
                                        scope: 45679,
                                        src: "675:14:24",
                                        stateVariable: false,
                                        storageLocation: "default",
                                        typeDescriptions: {
                                            typeIdentifier:
                                                "t_string_memory_ptr",
                                            typeString: "string"
                                        },
                                        typeName: {
                                            id: 45674,
                                            name: "string",
                                            nodeType: "ElementaryTypeName",
                                            src: "675:6:24",
                                            typeDescriptions: {
                                                typeIdentifier:
                                                    "t_string_storage_ptr",
                                                typeString: "string"
                                            }
                                        },
                                        visibility: "internal"
                                    },
                                    {
                                        constant: false,
                                        id: 45677,
                                        indexed: false,
                                        mutability: "mutable",
                                        name: "recoveredAddress",
                                        nameLocation: "699:16:24",
                                        nodeType: "VariableDeclaration",
                                        scope: 45679,
                                        src: "691:24:24",
                                        stateVariable: false,
                                        storageLocation: "default",
                                        typeDescriptions: {
                                            typeIdentifier: "t_address",
                                            typeString: "address"
                                        },
                                        typeName: {
                                            id: 45676,
                                            name: "address",
                                            nodeType: "ElementaryTypeName",
                                            src: "691:7:24",
                                            stateMutability: "nonpayable",
                                            typeDescriptions: {
                                                typeIdentifier: "t_address",
                                                typeString: "address"
                                            }
                                        },
                                        visibility: "internal"
                                    }
                                ],
                                src: "674:42:24"
                            }
                        },
                        {
                            id: 45681,
                            nodeType: "VariableDeclaration",
                            src: "723:19:24",
                            nodes: [],
                            constant: false,
                            mutability: "mutable",
                            name: "GizaAddress",
                            nameLocation: "731:11:24",
                            scope: 46052,
                            stateVariable: true,
                            storageLocation: "default",
                            typeDescriptions: {
                                typeIdentifier: "t_address",
                                typeString: "address"
                            },
                            typeName: {
                                id: 45680,
                                name: "address",
                                nodeType: "ElementaryTypeName",
                                src: "723:7:24",
                                stateMutability: "nonpayable",
                                typeDescriptions: {
                                    typeIdentifier: "t_address",
                                    typeString: "address"
                                }
                            },
                            visibility: "internal"
                        },
                        {
                            id: 45686,
                            nodeType: "VariableDeclaration",
                            src: "846:57:24",
                            nodes: [],
                            constant: false,
                            functionSelector: "599ebdfc",
                            mutability: "mutable",
                            name: "smartActionProofs",
                            nameLocation: "886:17:24",
                            scope: 46052,
                            stateVariable: true,
                            storageLocation: "default",
                            typeDescriptions: {
                                typeIdentifier:
                                    "t_mapping$_t_uint256_$_t_struct$_ProofStorage_$45653_storage_$",
                                typeString:
                                    "mapping(uint256 => struct ProofStorage)"
                            },
                            typeName: {
                                id: 45685,
                                keyName: "",
                                keyNameLocation: "-1:-1:-1",
                                keyType: {
                                    id: 45682,
                                    name: "uint256",
                                    nodeType: "ElementaryTypeName",
                                    src: "854:7:24",
                                    typeDescriptions: {
                                        typeIdentifier: "t_uint256",
                                        typeString: "uint256"
                                    }
                                },
                                nodeType: "Mapping",
                                src: "846:32:24",
                                typeDescriptions: {
                                    typeIdentifier:
                                        "t_mapping$_t_uint256_$_t_struct$_ProofStorage_$45653_storage_$",
                                    typeString:
                                        "mapping(uint256 => struct ProofStorage)"
                                },
                                valueName: "",
                                valueNameLocation: "-1:-1:-1",
                                valueType: {
                                    id: 45684,
                                    nodeType: "UserDefinedTypeName",
                                    pathNode: {
                                        id: 45683,
                                        name: "ProofStorage",
                                        nameLocations: ["865:12:24"],
                                        nodeType: "IdentifierPath",
                                        referencedDeclaration: 45653,
                                        src: "865:12:24"
                                    },
                                    referencedDeclaration: 45653,
                                    src: "865:12:24",
                                    typeDescriptions: {
                                        typeIdentifier:
                                            "t_struct$_ProofStorage_$45653_storage_ptr",
                                        typeString: "struct ProofStorage"
                                    }
                                }
                            },
                            visibility: "public"
                        },
                        {
                            id: 45695,
                            nodeType: "FunctionDefinition",
                            src: "910:55:24",
                            nodes: [],
                            body: {
                                id: 45694,
                                nodeType: "Block",
                                src: "924:41:24",
                                nodes: [],
                                statements: [
                                    {
                                        expression: {
                                            id: 45692,
                                            isConstant: false,
                                            isLValue: false,
                                            isPure: false,
                                            lValueRequested: false,
                                            leftHandSide: {
                                                id: 45689,
                                                name: "GizaAddress",
                                                nodeType: "Identifier",
                                                overloadedDeclarations: [],
                                                referencedDeclaration: 45681,
                                                src: "934:11:24",
                                                typeDescriptions: {
                                                    typeIdentifier: "t_address",
                                                    typeString: "address"
                                                }
                                            },
                                            nodeType: "Assignment",
                                            operator: "=",
                                            rightHandSide: {
                                                expression: {
                                                    id: 45690,
                                                    name: "msg",
                                                    nodeType: "Identifier",
                                                    overloadedDeclarations: [],
                                                    referencedDeclaration: -15,
                                                    src: "948:3:24",
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_magic_message",
                                                        typeString: "msg"
                                                    }
                                                },
                                                id: 45691,
                                                isConstant: false,
                                                isLValue: false,
                                                isPure: false,
                                                lValueRequested: false,
                                                memberLocation: "952:6:24",
                                                memberName: "sender",
                                                nodeType: "MemberAccess",
                                                src: "948:10:24",
                                                typeDescriptions: {
                                                    typeIdentifier: "t_address",
                                                    typeString: "address"
                                                }
                                            },
                                            src: "934:24:24",
                                            typeDescriptions: {
                                                typeIdentifier: "t_address",
                                                typeString: "address"
                                            }
                                        },
                                        id: 45693,
                                        nodeType: "ExpressionStatement",
                                        src: "934:24:24"
                                    }
                                ]
                            },
                            implemented: true,
                            kind: "constructor",
                            modifiers: [],
                            name: "",
                            nameLocation: "-1:-1:-1",
                            parameters: {
                                id: 45687,
                                nodeType: "ParameterList",
                                parameters: [],
                                src: "921:2:24"
                            },
                            returnParameters: {
                                id: 45688,
                                nodeType: "ParameterList",
                                parameters: [],
                                src: "924:0:24"
                            },
                            scope: 46052,
                            stateMutability: "nonpayable",
                            virtual: false,
                            visibility: "public"
                        },
                        {
                            id: 45717,
                            nodeType: "FunctionDefinition",
                            src: "1042:226:24",
                            nodes: [],
                            body: {
                                id: 45716,
                                nodeType: "Block",
                                src: "1106:162:24",
                                nodes: [],
                                statements: [
                                    {
                                        assignments: [45702],
                                        declarations: [
                                            {
                                                constant: false,
                                                id: 45702,
                                                mutability: "mutable",
                                                name: "index",
                                                nameLocation: "1124:5:24",
                                                nodeType: "VariableDeclaration",
                                                scope: 45716,
                                                src: "1116:13:24",
                                                stateVariable: false,
                                                storageLocation: "default",
                                                typeDescriptions: {
                                                    typeIdentifier: "t_uint256",
                                                    typeString: "uint256"
                                                },
                                                typeName: {
                                                    id: 45701,
                                                    name: "uint256",
                                                    nodeType:
                                                        "ElementaryTypeName",
                                                    src: "1116:7:24",
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_uint256",
                                                        typeString: "uint256"
                                                    }
                                                },
                                                visibility: "internal"
                                            }
                                        ],
                                        id: 45710,
                                        initialValue: {
                                            arguments: [
                                                {
                                                    arguments: [
                                                        {
                                                            id: 45707,
                                                            name: "data",
                                                            nodeType:
                                                                "Identifier",
                                                            overloadedDeclarations:
                                                                [],
                                                            referencedDeclaration: 45697,
                                                            src: "1148:4:24",
                                                            typeDescriptions: {
                                                                typeIdentifier:
                                                                    "t_bytes_calldata_ptr",
                                                                typeString:
                                                                    "bytes calldata"
                                                            }
                                                        }
                                                    ],
                                                    expression: {
                                                        argumentTypes: [
                                                            {
                                                                typeIdentifier:
                                                                    "t_bytes_calldata_ptr",
                                                                typeString:
                                                                    "bytes calldata"
                                                            }
                                                        ],
                                                        id: 45706,
                                                        isConstant: false,
                                                        isLValue: false,
                                                        isPure: true,
                                                        lValueRequested: false,
                                                        nodeType:
                                                            "ElementaryTypeNameExpression",
                                                        src: "1140:7:24",
                                                        typeDescriptions: {
                                                            typeIdentifier:
                                                                "t_type$_t_bytes32_$",
                                                            typeString:
                                                                "type(bytes32)"
                                                        },
                                                        typeName: {
                                                            id: 45705,
                                                            name: "bytes32",
                                                            nodeType:
                                                                "ElementaryTypeName",
                                                            src: "1140:7:24",
                                                            typeDescriptions: {}
                                                        }
                                                    },
                                                    id: 45708,
                                                    isConstant: false,
                                                    isLValue: false,
                                                    isPure: false,
                                                    kind: "typeConversion",
                                                    lValueRequested: false,
                                                    nameLocations: [],
                                                    names: [],
                                                    nodeType: "FunctionCall",
                                                    src: "1140:13:24",
                                                    tryCall: false,
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_bytes32",
                                                        typeString: "bytes32"
                                                    }
                                                }
                                            ],
                                            expression: {
                                                argumentTypes: [
                                                    {
                                                        typeIdentifier:
                                                            "t_bytes32",
                                                        typeString: "bytes32"
                                                    }
                                                ],
                                                id: 45704,
                                                isConstant: false,
                                                isLValue: false,
                                                isPure: true,
                                                lValueRequested: false,
                                                nodeType:
                                                    "ElementaryTypeNameExpression",
                                                src: "1132:7:24",
                                                typeDescriptions: {
                                                    typeIdentifier:
                                                        "t_type$_t_uint256_$",
                                                    typeString: "type(uint256)"
                                                },
                                                typeName: {
                                                    id: 45703,
                                                    name: "uint256",
                                                    nodeType:
                                                        "ElementaryTypeName",
                                                    src: "1132:7:24",
                                                    typeDescriptions: {}
                                                }
                                            },
                                            id: 45709,
                                            isConstant: false,
                                            isLValue: false,
                                            isPure: false,
                                            kind: "typeConversion",
                                            lValueRequested: false,
                                            nameLocations: [],
                                            names: [],
                                            nodeType: "FunctionCall",
                                            src: "1132:22:24",
                                            tryCall: false,
                                            typeDescriptions: {
                                                typeIdentifier: "t_uint256",
                                                typeString: "uint256"
                                            }
                                        },
                                        nodeType:
                                            "VariableDeclarationStatement",
                                        src: "1116:38:24"
                                    },
                                    {
                                        expression: {
                                            id: 45714,
                                            isConstant: false,
                                            isLValue: false,
                                            isPure: false,
                                            lValueRequested: false,
                                            nodeType: "UnaryOperation",
                                            operator: "delete",
                                            prefix: true,
                                            src: "1230:31:24",
                                            subExpression: {
                                                baseExpression: {
                                                    id: 45711,
                                                    name: "smartActionProofs",
                                                    nodeType: "Identifier",
                                                    overloadedDeclarations: [],
                                                    referencedDeclaration: 45686,
                                                    src: "1237:17:24",
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_mapping$_t_uint256_$_t_struct$_ProofStorage_$45653_storage_$",
                                                        typeString:
                                                            "mapping(uint256 => struct ProofStorage storage ref)"
                                                    }
                                                },
                                                id: 45713,
                                                indexExpression: {
                                                    id: 45712,
                                                    name: "index",
                                                    nodeType: "Identifier",
                                                    overloadedDeclarations: [],
                                                    referencedDeclaration: 45702,
                                                    src: "1255:5:24",
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_uint256",
                                                        typeString: "uint256"
                                                    }
                                                },
                                                isConstant: false,
                                                isLValue: true,
                                                isPure: false,
                                                lValueRequested: true,
                                                nodeType: "IndexAccess",
                                                src: "1237:24:24",
                                                typeDescriptions: {
                                                    typeIdentifier:
                                                        "t_struct$_ProofStorage_$45653_storage",
                                                    typeString:
                                                        "struct ProofStorage storage ref"
                                                }
                                            },
                                            typeDescriptions: {
                                                typeIdentifier: "t_tuple$__$",
                                                typeString: "tuple()"
                                            }
                                        },
                                        id: 45715,
                                        nodeType: "ExpressionStatement",
                                        src: "1230:31:24"
                                    }
                                ]
                            },
                            baseFunctions: [46069],
                            functionSelector: "8fc925aa",
                            implemented: true,
                            kind: "function",
                            modifiers: [],
                            name: "disable",
                            nameLocation: "1051:7:24",
                            overrides: {
                                id: 45699,
                                nodeType: "OverrideSpecifier",
                                overrides: [],
                                src: "1097:8:24"
                            },
                            parameters: {
                                id: 45698,
                                nodeType: "ParameterList",
                                parameters: [
                                    {
                                        constant: false,
                                        id: 45697,
                                        mutability: "mutable",
                                        name: "data",
                                        nameLocation: "1074:4:24",
                                        nodeType: "VariableDeclaration",
                                        scope: 45717,
                                        src: "1059:19:24",
                                        stateVariable: false,
                                        storageLocation: "calldata",
                                        typeDescriptions: {
                                            typeIdentifier:
                                                "t_bytes_calldata_ptr",
                                            typeString: "bytes"
                                        },
                                        typeName: {
                                            id: 45696,
                                            name: "bytes",
                                            nodeType: "ElementaryTypeName",
                                            src: "1059:5:24",
                                            typeDescriptions: {
                                                typeIdentifier:
                                                    "t_bytes_storage_ptr",
                                                typeString: "bytes"
                                            }
                                        },
                                        visibility: "internal"
                                    }
                                ],
                                src: "1058:21:24"
                            },
                            returnParameters: {
                                id: 45700,
                                nodeType: "ParameterList",
                                parameters: [],
                                src: "1106:0:24"
                            },
                            scope: 46052,
                            stateMutability: "payable",
                            virtual: false,
                            visibility: "external"
                        },
                        {
                            id: 45804,
                            nodeType: "FunctionDefinition",
                            src: "1340:630:24",
                            nodes: [],
                            body: {
                                id: 45803,
                                nodeType: "Block",
                                src: "1404:566:24",
                                nodes: [],
                                statements: [
                                    {
                                        expression: {
                                            arguments: [
                                                {
                                                    commonType: {
                                                        typeIdentifier:
                                                            "t_uint256",
                                                        typeString: "uint256"
                                                    },
                                                    id: 45727,
                                                    isConstant: false,
                                                    isLValue: false,
                                                    isPure: false,
                                                    lValueRequested: false,
                                                    leftExpression: {
                                                        expression: {
                                                            id: 45724,
                                                            name: "_data",
                                                            nodeType:
                                                                "Identifier",
                                                            overloadedDeclarations:
                                                                [],
                                                            referencedDeclaration: 45719,
                                                            src: "1422:5:24",
                                                            typeDescriptions: {
                                                                typeIdentifier:
                                                                    "t_bytes_calldata_ptr",
                                                                typeString:
                                                                    "bytes calldata"
                                                            }
                                                        },
                                                        id: 45725,
                                                        isConstant: false,
                                                        isLValue: false,
                                                        isPure: false,
                                                        lValueRequested: false,
                                                        memberLocation:
                                                            "1428:6:24",
                                                        memberName: "length",
                                                        nodeType:
                                                            "MemberAccess",
                                                        src: "1422:12:24",
                                                        typeDescriptions: {
                                                            typeIdentifier:
                                                                "t_uint256",
                                                            typeString:
                                                                "uint256"
                                                        }
                                                    },
                                                    nodeType: "BinaryOperation",
                                                    operator: ">=",
                                                    rightExpression: {
                                                        hexValue: "3936",
                                                        id: 45726,
                                                        isConstant: false,
                                                        isLValue: false,
                                                        isPure: true,
                                                        kind: "number",
                                                        lValueRequested: false,
                                                        nodeType: "Literal",
                                                        src: "1438:2:24",
                                                        typeDescriptions: {
                                                            typeIdentifier:
                                                                "t_rational_96_by_1",
                                                            typeString:
                                                                "int_const 96"
                                                        },
                                                        value: "96"
                                                    },
                                                    src: "1422:18:24",
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_bool",
                                                        typeString: "bool"
                                                    }
                                                },
                                                {
                                                    hexValue:
                                                        "4461746120666f726d617420696e636f7272656374",
                                                    id: 45728,
                                                    isConstant: false,
                                                    isLValue: false,
                                                    isPure: true,
                                                    kind: "string",
                                                    lValueRequested: false,
                                                    nodeType: "Literal",
                                                    src: "1442:23:24",
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_stringliteral_5cf925407d52df8ef47cbafe5cb54c92baefa5320c8a82ec47d4ab07e5f8518a",
                                                        typeString:
                                                            'literal_string "Data format incorrect"'
                                                    },
                                                    value: "Data format incorrect"
                                                }
                                            ],
                                            expression: {
                                                argumentTypes: [
                                                    {
                                                        typeIdentifier:
                                                            "t_bool",
                                                        typeString: "bool"
                                                    },
                                                    {
                                                        typeIdentifier:
                                                            "t_stringliteral_5cf925407d52df8ef47cbafe5cb54c92baefa5320c8a82ec47d4ab07e5f8518a",
                                                        typeString:
                                                            'literal_string "Data format incorrect"'
                                                    }
                                                ],
                                                id: 45723,
                                                name: "require",
                                                nodeType: "Identifier",
                                                overloadedDeclarations: [
                                                    -18, -18
                                                ],
                                                referencedDeclaration: -18,
                                                src: "1414:7:24",
                                                typeDescriptions: {
                                                    typeIdentifier:
                                                        "t_function_require_pure$_t_bool_$_t_string_memory_ptr_$returns$__$",
                                                    typeString:
                                                        "function (bool,string memory) pure"
                                                }
                                            },
                                            id: 45729,
                                            isConstant: false,
                                            isLValue: false,
                                            isPure: false,
                                            kind: "functionCall",
                                            lValueRequested: false,
                                            nameLocations: [],
                                            names: [],
                                            nodeType: "FunctionCall",
                                            src: "1414:52:24",
                                            tryCall: false,
                                            typeDescriptions: {
                                                typeIdentifier: "t_tuple$__$",
                                                typeString: "tuple()"
                                            }
                                        },
                                        id: 45730,
                                        nodeType: "ExpressionStatement",
                                        src: "1414:52:24"
                                    },
                                    {
                                        assignments: [45732],
                                        declarations: [
                                            {
                                                constant: false,
                                                id: 45732,
                                                mutability: "mutable",
                                                name: "proofId",
                                                nameLocation: "1485:7:24",
                                                nodeType: "VariableDeclaration",
                                                scope: 45803,
                                                src: "1477:15:24",
                                                stateVariable: false,
                                                storageLocation: "default",
                                                typeDescriptions: {
                                                    typeIdentifier: "t_uint256",
                                                    typeString: "uint256"
                                                },
                                                typeName: {
                                                    id: 45731,
                                                    name: "uint256",
                                                    nodeType:
                                                        "ElementaryTypeName",
                                                    src: "1477:7:24",
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_uint256",
                                                        typeString: "uint256"
                                                    }
                                                },
                                                visibility: "internal"
                                            }
                                        ],
                                        id: 45742,
                                        initialValue: {
                                            arguments: [
                                                {
                                                    arguments: [
                                                        {
                                                            baseExpression: {
                                                                id: 45737,
                                                                name: "_data",
                                                                nodeType:
                                                                    "Identifier",
                                                                overloadedDeclarations:
                                                                    [],
                                                                referencedDeclaration: 45719,
                                                                src: "1511:5:24",
                                                                typeDescriptions:
                                                                    {
                                                                        typeIdentifier:
                                                                            "t_bytes_calldata_ptr",
                                                                        typeString:
                                                                            "bytes calldata"
                                                                    }
                                                            },
                                                            endExpression: {
                                                                hexValue:
                                                                    "3332",
                                                                id: 45738,
                                                                isConstant: false,
                                                                isLValue: false,
                                                                isPure: true,
                                                                kind: "number",
                                                                lValueRequested: false,
                                                                nodeType:
                                                                    "Literal",
                                                                src: "1518:2:24",
                                                                typeDescriptions:
                                                                    {
                                                                        typeIdentifier:
                                                                            "t_rational_32_by_1",
                                                                        typeString:
                                                                            "int_const 32"
                                                                    },
                                                                value: "32"
                                                            },
                                                            id: 45739,
                                                            isConstant: false,
                                                            isLValue: false,
                                                            isPure: false,
                                                            lValueRequested: false,
                                                            nodeType:
                                                                "IndexRangeAccess",
                                                            src: "1511:10:24",
                                                            typeDescriptions: {
                                                                typeIdentifier:
                                                                    "t_bytes_calldata_ptr_slice",
                                                                typeString:
                                                                    "bytes calldata slice"
                                                            }
                                                        }
                                                    ],
                                                    expression: {
                                                        argumentTypes: [
                                                            {
                                                                typeIdentifier:
                                                                    "t_bytes_calldata_ptr_slice",
                                                                typeString:
                                                                    "bytes calldata slice"
                                                            }
                                                        ],
                                                        id: 45736,
                                                        isConstant: false,
                                                        isLValue: false,
                                                        isPure: true,
                                                        lValueRequested: false,
                                                        nodeType:
                                                            "ElementaryTypeNameExpression",
                                                        src: "1503:7:24",
                                                        typeDescriptions: {
                                                            typeIdentifier:
                                                                "t_type$_t_bytes32_$",
                                                            typeString:
                                                                "type(bytes32)"
                                                        },
                                                        typeName: {
                                                            id: 45735,
                                                            name: "bytes32",
                                                            nodeType:
                                                                "ElementaryTypeName",
                                                            src: "1503:7:24",
                                                            typeDescriptions: {}
                                                        }
                                                    },
                                                    id: 45740,
                                                    isConstant: false,
                                                    isLValue: false,
                                                    isPure: false,
                                                    kind: "typeConversion",
                                                    lValueRequested: false,
                                                    nameLocations: [],
                                                    names: [],
                                                    nodeType: "FunctionCall",
                                                    src: "1503:19:24",
                                                    tryCall: false,
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_bytes32",
                                                        typeString: "bytes32"
                                                    }
                                                }
                                            ],
                                            expression: {
                                                argumentTypes: [
                                                    {
                                                        typeIdentifier:
                                                            "t_bytes32",
                                                        typeString: "bytes32"
                                                    }
                                                ],
                                                id: 45734,
                                                isConstant: false,
                                                isLValue: false,
                                                isPure: true,
                                                lValueRequested: false,
                                                nodeType:
                                                    "ElementaryTypeNameExpression",
                                                src: "1495:7:24",
                                                typeDescriptions: {
                                                    typeIdentifier:
                                                        "t_type$_t_uint256_$",
                                                    typeString: "type(uint256)"
                                                },
                                                typeName: {
                                                    id: 45733,
                                                    name: "uint256",
                                                    nodeType:
                                                        "ElementaryTypeName",
                                                    src: "1495:7:24",
                                                    typeDescriptions: {}
                                                }
                                            },
                                            id: 45741,
                                            isConstant: false,
                                            isLValue: false,
                                            isPure: false,
                                            kind: "typeConversion",
                                            lValueRequested: false,
                                            nameLocations: [],
                                            names: [],
                                            nodeType: "FunctionCall",
                                            src: "1495:28:24",
                                            tryCall: false,
                                            typeDescriptions: {
                                                typeIdentifier: "t_uint256",
                                                typeString: "uint256"
                                            }
                                        },
                                        nodeType:
                                            "VariableDeclarationStatement",
                                        src: "1477:46:24"
                                    },
                                    {
                                        assignments: [45744],
                                        declarations: [
                                            {
                                                constant: false,
                                                id: 45744,
                                                mutability: "mutable",
                                                name: "model_id",
                                                nameLocation: "1542:8:24",
                                                nodeType: "VariableDeclaration",
                                                scope: 45803,
                                                src: "1534:16:24",
                                                stateVariable: false,
                                                storageLocation: "default",
                                                typeDescriptions: {
                                                    typeIdentifier: "t_uint128",
                                                    typeString: "uint128"
                                                },
                                                typeName: {
                                                    id: 45743,
                                                    name: "uint128",
                                                    nodeType:
                                                        "ElementaryTypeName",
                                                    src: "1534:7:24",
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_uint128",
                                                        typeString: "uint128"
                                                    }
                                                },
                                                visibility: "internal"
                                            }
                                        ],
                                        id: 45755,
                                        initialValue: {
                                            arguments: [
                                                {
                                                    arguments: [
                                                        {
                                                            baseExpression: {
                                                                id: 45749,
                                                                name: "_data",
                                                                nodeType:
                                                                    "Identifier",
                                                                overloadedDeclarations:
                                                                    [],
                                                                referencedDeclaration: 45719,
                                                                src: "1569:5:24",
                                                                typeDescriptions:
                                                                    {
                                                                        typeIdentifier:
                                                                            "t_bytes_calldata_ptr",
                                                                        typeString:
                                                                            "bytes calldata"
                                                                    }
                                                            },
                                                            endExpression: {
                                                                hexValue:
                                                                    "3438",
                                                                id: 45751,
                                                                isConstant: false,
                                                                isLValue: false,
                                                                isPure: true,
                                                                kind: "number",
                                                                lValueRequested: false,
                                                                nodeType:
                                                                    "Literal",
                                                                src: "1578:2:24",
                                                                typeDescriptions:
                                                                    {
                                                                        typeIdentifier:
                                                                            "t_rational_48_by_1",
                                                                        typeString:
                                                                            "int_const 48"
                                                                    },
                                                                value: "48"
                                                            },
                                                            id: 45752,
                                                            isConstant: false,
                                                            isLValue: false,
                                                            isPure: false,
                                                            lValueRequested: false,
                                                            nodeType:
                                                                "IndexRangeAccess",
                                                            src: "1569:12:24",
                                                            startExpression: {
                                                                hexValue:
                                                                    "3332",
                                                                id: 45750,
                                                                isConstant: false,
                                                                isLValue: false,
                                                                isPure: true,
                                                                kind: "number",
                                                                lValueRequested: false,
                                                                nodeType:
                                                                    "Literal",
                                                                src: "1575:2:24",
                                                                typeDescriptions:
                                                                    {
                                                                        typeIdentifier:
                                                                            "t_rational_32_by_1",
                                                                        typeString:
                                                                            "int_const 32"
                                                                    },
                                                                value: "32"
                                                            },
                                                            typeDescriptions: {
                                                                typeIdentifier:
                                                                    "t_bytes_calldata_ptr_slice",
                                                                typeString:
                                                                    "bytes calldata slice"
                                                            }
                                                        }
                                                    ],
                                                    expression: {
                                                        argumentTypes: [
                                                            {
                                                                typeIdentifier:
                                                                    "t_bytes_calldata_ptr_slice",
                                                                typeString:
                                                                    "bytes calldata slice"
                                                            }
                                                        ],
                                                        id: 45748,
                                                        isConstant: false,
                                                        isLValue: false,
                                                        isPure: true,
                                                        lValueRequested: false,
                                                        nodeType:
                                                            "ElementaryTypeNameExpression",
                                                        src: "1561:7:24",
                                                        typeDescriptions: {
                                                            typeIdentifier:
                                                                "t_type$_t_bytes16_$",
                                                            typeString:
                                                                "type(bytes16)"
                                                        },
                                                        typeName: {
                                                            id: 45747,
                                                            name: "bytes16",
                                                            nodeType:
                                                                "ElementaryTypeName",
                                                            src: "1561:7:24",
                                                            typeDescriptions: {}
                                                        }
                                                    },
                                                    id: 45753,
                                                    isConstant: false,
                                                    isLValue: false,
                                                    isPure: false,
                                                    kind: "typeConversion",
                                                    lValueRequested: false,
                                                    nameLocations: [],
                                                    names: [],
                                                    nodeType: "FunctionCall",
                                                    src: "1561:21:24",
                                                    tryCall: false,
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_bytes16",
                                                        typeString: "bytes16"
                                                    }
                                                }
                                            ],
                                            expression: {
                                                argumentTypes: [
                                                    {
                                                        typeIdentifier:
                                                            "t_bytes16",
                                                        typeString: "bytes16"
                                                    }
                                                ],
                                                id: 45746,
                                                isConstant: false,
                                                isLValue: false,
                                                isPure: true,
                                                lValueRequested: false,
                                                nodeType:
                                                    "ElementaryTypeNameExpression",
                                                src: "1553:7:24",
                                                typeDescriptions: {
                                                    typeIdentifier:
                                                        "t_type$_t_uint128_$",
                                                    typeString: "type(uint128)"
                                                },
                                                typeName: {
                                                    id: 45745,
                                                    name: "uint128",
                                                    nodeType:
                                                        "ElementaryTypeName",
                                                    src: "1553:7:24",
                                                    typeDescriptions: {}
                                                }
                                            },
                                            id: 45754,
                                            isConstant: false,
                                            isLValue: false,
                                            isPure: false,
                                            kind: "typeConversion",
                                            lValueRequested: false,
                                            nameLocations: [],
                                            names: [],
                                            nodeType: "FunctionCall",
                                            src: "1553:30:24",
                                            tryCall: false,
                                            typeDescriptions: {
                                                typeIdentifier: "t_uint128",
                                                typeString: "uint128"
                                            }
                                        },
                                        nodeType:
                                            "VariableDeclarationStatement",
                                        src: "1534:49:24"
                                    },
                                    {
                                        assignments: [45757],
                                        declarations: [
                                            {
                                                constant: false,
                                                id: 45757,
                                                mutability: "mutable",
                                                name: "version_id",
                                                nameLocation: "1601:10:24",
                                                nodeType: "VariableDeclaration",
                                                scope: 45803,
                                                src: "1593:18:24",
                                                stateVariable: false,
                                                storageLocation: "default",
                                                typeDescriptions: {
                                                    typeIdentifier: "t_uint128",
                                                    typeString: "uint128"
                                                },
                                                typeName: {
                                                    id: 45756,
                                                    name: "uint128",
                                                    nodeType:
                                                        "ElementaryTypeName",
                                                    src: "1593:7:24",
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_uint128",
                                                        typeString: "uint128"
                                                    }
                                                },
                                                visibility: "internal"
                                            }
                                        ],
                                        id: 45768,
                                        initialValue: {
                                            arguments: [
                                                {
                                                    arguments: [
                                                        {
                                                            baseExpression: {
                                                                id: 45762,
                                                                name: "_data",
                                                                nodeType:
                                                                    "Identifier",
                                                                overloadedDeclarations:
                                                                    [],
                                                                referencedDeclaration: 45719,
                                                                src: "1630:5:24",
                                                                typeDescriptions:
                                                                    {
                                                                        typeIdentifier:
                                                                            "t_bytes_calldata_ptr",
                                                                        typeString:
                                                                            "bytes calldata"
                                                                    }
                                                            },
                                                            endExpression: {
                                                                hexValue:
                                                                    "3634",
                                                                id: 45764,
                                                                isConstant: false,
                                                                isLValue: false,
                                                                isPure: true,
                                                                kind: "number",
                                                                lValueRequested: false,
                                                                nodeType:
                                                                    "Literal",
                                                                src: "1639:2:24",
                                                                typeDescriptions:
                                                                    {
                                                                        typeIdentifier:
                                                                            "t_rational_64_by_1",
                                                                        typeString:
                                                                            "int_const 64"
                                                                    },
                                                                value: "64"
                                                            },
                                                            id: 45765,
                                                            isConstant: false,
                                                            isLValue: false,
                                                            isPure: false,
                                                            lValueRequested: false,
                                                            nodeType:
                                                                "IndexRangeAccess",
                                                            src: "1630:12:24",
                                                            startExpression: {
                                                                hexValue:
                                                                    "3438",
                                                                id: 45763,
                                                                isConstant: false,
                                                                isLValue: false,
                                                                isPure: true,
                                                                kind: "number",
                                                                lValueRequested: false,
                                                                nodeType:
                                                                    "Literal",
                                                                src: "1636:2:24",
                                                                typeDescriptions:
                                                                    {
                                                                        typeIdentifier:
                                                                            "t_rational_48_by_1",
                                                                        typeString:
                                                                            "int_const 48"
                                                                    },
                                                                value: "48"
                                                            },
                                                            typeDescriptions: {
                                                                typeIdentifier:
                                                                    "t_bytes_calldata_ptr_slice",
                                                                typeString:
                                                                    "bytes calldata slice"
                                                            }
                                                        }
                                                    ],
                                                    expression: {
                                                        argumentTypes: [
                                                            {
                                                                typeIdentifier:
                                                                    "t_bytes_calldata_ptr_slice",
                                                                typeString:
                                                                    "bytes calldata slice"
                                                            }
                                                        ],
                                                        id: 45761,
                                                        isConstant: false,
                                                        isLValue: false,
                                                        isPure: true,
                                                        lValueRequested: false,
                                                        nodeType:
                                                            "ElementaryTypeNameExpression",
                                                        src: "1622:7:24",
                                                        typeDescriptions: {
                                                            typeIdentifier:
                                                                "t_type$_t_bytes16_$",
                                                            typeString:
                                                                "type(bytes16)"
                                                        },
                                                        typeName: {
                                                            id: 45760,
                                                            name: "bytes16",
                                                            nodeType:
                                                                "ElementaryTypeName",
                                                            src: "1622:7:24",
                                                            typeDescriptions: {}
                                                        }
                                                    },
                                                    id: 45766,
                                                    isConstant: false,
                                                    isLValue: false,
                                                    isPure: false,
                                                    kind: "typeConversion",
                                                    lValueRequested: false,
                                                    nameLocations: [],
                                                    names: [],
                                                    nodeType: "FunctionCall",
                                                    src: "1622:21:24",
                                                    tryCall: false,
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_bytes16",
                                                        typeString: "bytes16"
                                                    }
                                                }
                                            ],
                                            expression: {
                                                argumentTypes: [
                                                    {
                                                        typeIdentifier:
                                                            "t_bytes16",
                                                        typeString: "bytes16"
                                                    }
                                                ],
                                                id: 45759,
                                                isConstant: false,
                                                isLValue: false,
                                                isPure: true,
                                                lValueRequested: false,
                                                nodeType:
                                                    "ElementaryTypeNameExpression",
                                                src: "1614:7:24",
                                                typeDescriptions: {
                                                    typeIdentifier:
                                                        "t_type$_t_uint128_$",
                                                    typeString: "type(uint128)"
                                                },
                                                typeName: {
                                                    id: 45758,
                                                    name: "uint128",
                                                    nodeType:
                                                        "ElementaryTypeName",
                                                    src: "1614:7:24",
                                                    typeDescriptions: {}
                                                }
                                            },
                                            id: 45767,
                                            isConstant: false,
                                            isLValue: false,
                                            isPure: false,
                                            kind: "typeConversion",
                                            lValueRequested: false,
                                            nameLocations: [],
                                            names: [],
                                            nodeType: "FunctionCall",
                                            src: "1614:30:24",
                                            tryCall: false,
                                            typeDescriptions: {
                                                typeIdentifier: "t_uint128",
                                                typeString: "uint128"
                                            }
                                        },
                                        nodeType:
                                            "VariableDeclarationStatement",
                                        src: "1593:51:24"
                                    },
                                    {
                                        assignments: [45770],
                                        declarations: [
                                            {
                                                constant: false,
                                                id: 45770,
                                                mutability: "mutable",
                                                name: "userAddress",
                                                nameLocation: "1663:11:24",
                                                nodeType: "VariableDeclaration",
                                                scope: 45803,
                                                src: "1655:19:24",
                                                stateVariable: false,
                                                storageLocation: "default",
                                                typeDescriptions: {
                                                    typeIdentifier: "t_address",
                                                    typeString: "address"
                                                },
                                                typeName: {
                                                    id: 45769,
                                                    name: "address",
                                                    nodeType:
                                                        "ElementaryTypeName",
                                                    src: "1655:7:24",
                                                    stateMutability:
                                                        "nonpayable",
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_address",
                                                        typeString: "address"
                                                    }
                                                },
                                                visibility: "internal"
                                            }
                                        ],
                                        id: 45781,
                                        initialValue: {
                                            arguments: [
                                                {
                                                    arguments: [
                                                        {
                                                            baseExpression: {
                                                                id: 45775,
                                                                name: "_data",
                                                                nodeType:
                                                                    "Identifier",
                                                                overloadedDeclarations:
                                                                    [],
                                                                referencedDeclaration: 45719,
                                                                src: "1693:5:24",
                                                                typeDescriptions:
                                                                    {
                                                                        typeIdentifier:
                                                                            "t_bytes_calldata_ptr",
                                                                        typeString:
                                                                            "bytes calldata"
                                                                    }
                                                            },
                                                            endExpression: {
                                                                hexValue:
                                                                    "3834",
                                                                id: 45777,
                                                                isConstant: false,
                                                                isLValue: false,
                                                                isPure: true,
                                                                kind: "number",
                                                                lValueRequested: false,
                                                                nodeType:
                                                                    "Literal",
                                                                src: "1702:2:24",
                                                                typeDescriptions:
                                                                    {
                                                                        typeIdentifier:
                                                                            "t_rational_84_by_1",
                                                                        typeString:
                                                                            "int_const 84"
                                                                    },
                                                                value: "84"
                                                            },
                                                            id: 45778,
                                                            isConstant: false,
                                                            isLValue: false,
                                                            isPure: false,
                                                            lValueRequested: false,
                                                            nodeType:
                                                                "IndexRangeAccess",
                                                            src: "1693:12:24",
                                                            startExpression: {
                                                                hexValue:
                                                                    "3634",
                                                                id: 45776,
                                                                isConstant: false,
                                                                isLValue: false,
                                                                isPure: true,
                                                                kind: "number",
                                                                lValueRequested: false,
                                                                nodeType:
                                                                    "Literal",
                                                                src: "1699:2:24",
                                                                typeDescriptions:
                                                                    {
                                                                        typeIdentifier:
                                                                            "t_rational_64_by_1",
                                                                        typeString:
                                                                            "int_const 64"
                                                                    },
                                                                value: "64"
                                                            },
                                                            typeDescriptions: {
                                                                typeIdentifier:
                                                                    "t_bytes_calldata_ptr_slice",
                                                                typeString:
                                                                    "bytes calldata slice"
                                                            }
                                                        }
                                                    ],
                                                    expression: {
                                                        argumentTypes: [
                                                            {
                                                                typeIdentifier:
                                                                    "t_bytes_calldata_ptr_slice",
                                                                typeString:
                                                                    "bytes calldata slice"
                                                            }
                                                        ],
                                                        id: 45774,
                                                        isConstant: false,
                                                        isLValue: false,
                                                        isPure: true,
                                                        lValueRequested: false,
                                                        nodeType:
                                                            "ElementaryTypeNameExpression",
                                                        src: "1685:7:24",
                                                        typeDescriptions: {
                                                            typeIdentifier:
                                                                "t_type$_t_bytes20_$",
                                                            typeString:
                                                                "type(bytes20)"
                                                        },
                                                        typeName: {
                                                            id: 45773,
                                                            name: "bytes20",
                                                            nodeType:
                                                                "ElementaryTypeName",
                                                            src: "1685:7:24",
                                                            typeDescriptions: {}
                                                        }
                                                    },
                                                    id: 45779,
                                                    isConstant: false,
                                                    isLValue: false,
                                                    isPure: false,
                                                    kind: "typeConversion",
                                                    lValueRequested: false,
                                                    nameLocations: [],
                                                    names: [],
                                                    nodeType: "FunctionCall",
                                                    src: "1685:21:24",
                                                    tryCall: false,
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_bytes20",
                                                        typeString: "bytes20"
                                                    }
                                                }
                                            ],
                                            expression: {
                                                argumentTypes: [
                                                    {
                                                        typeIdentifier:
                                                            "t_bytes20",
                                                        typeString: "bytes20"
                                                    }
                                                ],
                                                id: 45772,
                                                isConstant: false,
                                                isLValue: false,
                                                isPure: true,
                                                lValueRequested: false,
                                                nodeType:
                                                    "ElementaryTypeNameExpression",
                                                src: "1677:7:24",
                                                typeDescriptions: {
                                                    typeIdentifier:
                                                        "t_type$_t_address_$",
                                                    typeString: "type(address)"
                                                },
                                                typeName: {
                                                    id: 45771,
                                                    name: "address",
                                                    nodeType:
                                                        "ElementaryTypeName",
                                                    src: "1677:7:24",
                                                    typeDescriptions: {}
                                                }
                                            },
                                            id: 45780,
                                            isConstant: false,
                                            isLValue: false,
                                            isPure: false,
                                            kind: "typeConversion",
                                            lValueRequested: false,
                                            nameLocations: [],
                                            names: [],
                                            nodeType: "FunctionCall",
                                            src: "1677:30:24",
                                            tryCall: false,
                                            typeDescriptions: {
                                                typeIdentifier: "t_address",
                                                typeString: "address"
                                            }
                                        },
                                        nodeType:
                                            "VariableDeclarationStatement",
                                        src: "1655:52:24"
                                    },
                                    {
                                        assignments: [45783],
                                        declarations: [
                                            {
                                                constant: false,
                                                id: 45783,
                                                mutability: "mutable",
                                                name: "proofHash",
                                                nameLocation: "1725:9:24",
                                                nodeType: "VariableDeclaration",
                                                scope: 45803,
                                                src: "1717:17:24",
                                                stateVariable: false,
                                                storageLocation: "default",
                                                typeDescriptions: {
                                                    typeIdentifier: "t_bytes32",
                                                    typeString: "bytes32"
                                                },
                                                typeName: {
                                                    id: 45782,
                                                    name: "bytes32",
                                                    nodeType:
                                                        "ElementaryTypeName",
                                                    src: "1717:7:24",
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_bytes32",
                                                        typeString: "bytes32"
                                                    }
                                                },
                                                visibility: "internal"
                                            }
                                        ],
                                        id: 45791,
                                        initialValue: {
                                            arguments: [
                                                {
                                                    baseExpression: {
                                                        id: 45786,
                                                        name: "_data",
                                                        nodeType: "Identifier",
                                                        overloadedDeclarations:
                                                            [],
                                                        referencedDeclaration: 45719,
                                                        src: "1745:5:24",
                                                        typeDescriptions: {
                                                            typeIdentifier:
                                                                "t_bytes_calldata_ptr",
                                                            typeString:
                                                                "bytes calldata"
                                                        }
                                                    },
                                                    endExpression: {
                                                        hexValue: "313136",
                                                        id: 45788,
                                                        isConstant: false,
                                                        isLValue: false,
                                                        isPure: true,
                                                        kind: "number",
                                                        lValueRequested: false,
                                                        nodeType: "Literal",
                                                        src: "1754:3:24",
                                                        typeDescriptions: {
                                                            typeIdentifier:
                                                                "t_rational_116_by_1",
                                                            typeString:
                                                                "int_const 116"
                                                        },
                                                        value: "116"
                                                    },
                                                    id: 45789,
                                                    isConstant: false,
                                                    isLValue: false,
                                                    isPure: false,
                                                    lValueRequested: false,
                                                    nodeType:
                                                        "IndexRangeAccess",
                                                    src: "1745:13:24",
                                                    startExpression: {
                                                        hexValue: "3834",
                                                        id: 45787,
                                                        isConstant: false,
                                                        isLValue: false,
                                                        isPure: true,
                                                        kind: "number",
                                                        lValueRequested: false,
                                                        nodeType: "Literal",
                                                        src: "1751:2:24",
                                                        typeDescriptions: {
                                                            typeIdentifier:
                                                                "t_rational_84_by_1",
                                                            typeString:
                                                                "int_const 84"
                                                        },
                                                        value: "84"
                                                    },
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_bytes_calldata_ptr_slice",
                                                        typeString:
                                                            "bytes calldata slice"
                                                    }
                                                }
                                            ],
                                            expression: {
                                                argumentTypes: [
                                                    {
                                                        typeIdentifier:
                                                            "t_bytes_calldata_ptr_slice",
                                                        typeString:
                                                            "bytes calldata slice"
                                                    }
                                                ],
                                                id: 45785,
                                                isConstant: false,
                                                isLValue: false,
                                                isPure: true,
                                                lValueRequested: false,
                                                nodeType:
                                                    "ElementaryTypeNameExpression",
                                                src: "1737:7:24",
                                                typeDescriptions: {
                                                    typeIdentifier:
                                                        "t_type$_t_bytes32_$",
                                                    typeString: "type(bytes32)"
                                                },
                                                typeName: {
                                                    id: 45784,
                                                    name: "bytes32",
                                                    nodeType:
                                                        "ElementaryTypeName",
                                                    src: "1737:7:24",
                                                    typeDescriptions: {}
                                                }
                                            },
                                            id: 45790,
                                            isConstant: false,
                                            isLValue: false,
                                            isPure: false,
                                            kind: "typeConversion",
                                            lValueRequested: false,
                                            nameLocations: [],
                                            names: [],
                                            nodeType: "FunctionCall",
                                            src: "1737:22:24",
                                            tryCall: false,
                                            typeDescriptions: {
                                                typeIdentifier: "t_bytes32",
                                                typeString: "bytes32"
                                            }
                                        },
                                        nodeType:
                                            "VariableDeclarationStatement",
                                        src: "1717:42:24"
                                    },
                                    {
                                        expression: {
                                            id: 45801,
                                            isConstant: false,
                                            isLValue: false,
                                            isPure: false,
                                            lValueRequested: false,
                                            leftHandSide: {
                                                baseExpression: {
                                                    id: 45792,
                                                    name: "smartActionProofs",
                                                    nodeType: "Identifier",
                                                    overloadedDeclarations: [],
                                                    referencedDeclaration: 45686,
                                                    src: "1770:17:24",
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_mapping$_t_uint256_$_t_struct$_ProofStorage_$45653_storage_$",
                                                        typeString:
                                                            "mapping(uint256 => struct ProofStorage storage ref)"
                                                    }
                                                },
                                                id: 45794,
                                                indexExpression: {
                                                    id: 45793,
                                                    name: "proofId",
                                                    nodeType: "Identifier",
                                                    overloadedDeclarations: [],
                                                    referencedDeclaration: 45732,
                                                    src: "1788:7:24",
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_uint256",
                                                        typeString: "uint256"
                                                    }
                                                },
                                                isConstant: false,
                                                isLValue: true,
                                                isPure: false,
                                                lValueRequested: true,
                                                nodeType: "IndexAccess",
                                                src: "1770:26:24",
                                                typeDescriptions: {
                                                    typeIdentifier:
                                                        "t_struct$_ProofStorage_$45653_storage",
                                                    typeString:
                                                        "struct ProofStorage storage ref"
                                                }
                                            },
                                            nodeType: "Assignment",
                                            operator: "=",
                                            rightHandSide: {
                                                arguments: [
                                                    {
                                                        id: 45796,
                                                        name: "model_id",
                                                        nodeType: "Identifier",
                                                        overloadedDeclarations:
                                                            [],
                                                        referencedDeclaration: 45744,
                                                        src: "1836:8:24",
                                                        typeDescriptions: {
                                                            typeIdentifier:
                                                                "t_uint128",
                                                            typeString:
                                                                "uint128"
                                                        }
                                                    },
                                                    {
                                                        id: 45797,
                                                        name: "version_id",
                                                        nodeType: "Identifier",
                                                        overloadedDeclarations:
                                                            [],
                                                        referencedDeclaration: 45757,
                                                        src: "1870:10:24",
                                                        typeDescriptions: {
                                                            typeIdentifier:
                                                                "t_uint128",
                                                            typeString:
                                                                "uint128"
                                                        }
                                                    },
                                                    {
                                                        id: 45798,
                                                        name: "userAddress",
                                                        nodeType: "Identifier",
                                                        overloadedDeclarations:
                                                            [],
                                                        referencedDeclaration: 45770,
                                                        src: "1907:11:24",
                                                        typeDescriptions: {
                                                            typeIdentifier:
                                                                "t_address",
                                                            typeString:
                                                                "address"
                                                        }
                                                    },
                                                    {
                                                        id: 45799,
                                                        name: "proofHash",
                                                        nodeType: "Identifier",
                                                        overloadedDeclarations:
                                                            [],
                                                        referencedDeclaration: 45783,
                                                        src: "1943:9:24",
                                                        typeDescriptions: {
                                                            typeIdentifier:
                                                                "t_bytes32",
                                                            typeString:
                                                                "bytes32"
                                                        }
                                                    }
                                                ],
                                                expression: {
                                                    argumentTypes: [
                                                        {
                                                            typeIdentifier:
                                                                "t_uint128",
                                                            typeString:
                                                                "uint128"
                                                        },
                                                        {
                                                            typeIdentifier:
                                                                "t_uint128",
                                                            typeString:
                                                                "uint128"
                                                        },
                                                        {
                                                            typeIdentifier:
                                                                "t_address",
                                                            typeString:
                                                                "address"
                                                        },
                                                        {
                                                            typeIdentifier:
                                                                "t_bytes32",
                                                            typeString:
                                                                "bytes32"
                                                        }
                                                    ],
                                                    id: 45795,
                                                    name: "ProofStorage",
                                                    nodeType: "Identifier",
                                                    overloadedDeclarations: [],
                                                    referencedDeclaration: 45653,
                                                    src: "1799:12:24",
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_type$_t_struct$_ProofStorage_$45653_storage_ptr_$",
                                                        typeString:
                                                            "type(struct ProofStorage storage pointer)"
                                                    }
                                                },
                                                id: 45800,
                                                isConstant: false,
                                                isLValue: false,
                                                isPure: false,
                                                kind: "structConstructorCall",
                                                lValueRequested: false,
                                                nameLocations: [
                                                    "1826:8:24",
                                                    "1858:10:24",
                                                    "1894:11:24",
                                                    "1932:9:24"
                                                ],
                                                names: [
                                                    "model_id",
                                                    "version_id",
                                                    "userAddress",
                                                    "proofHash"
                                                ],
                                                nodeType: "FunctionCall",
                                                src: "1799:164:24",
                                                tryCall: false,
                                                typeDescriptions: {
                                                    typeIdentifier:
                                                        "t_struct$_ProofStorage_$45653_memory_ptr",
                                                    typeString:
                                                        "struct ProofStorage memory"
                                                }
                                            },
                                            src: "1770:193:24",
                                            typeDescriptions: {
                                                typeIdentifier:
                                                    "t_struct$_ProofStorage_$45653_storage",
                                                typeString:
                                                    "struct ProofStorage storage ref"
                                            }
                                        },
                                        id: 45802,
                                        nodeType: "ExpressionStatement",
                                        src: "1770:193:24"
                                    }
                                ]
                            },
                            baseFunctions: [46064],
                            functionSelector: "0c959556",
                            implemented: true,
                            kind: "function",
                            modifiers: [],
                            name: "enable",
                            nameLocation: "1349:6:24",
                            overrides: {
                                id: 45721,
                                nodeType: "OverrideSpecifier",
                                overrides: [],
                                src: "1395:8:24"
                            },
                            parameters: {
                                id: 45720,
                                nodeType: "ParameterList",
                                parameters: [
                                    {
                                        constant: false,
                                        id: 45719,
                                        mutability: "mutable",
                                        name: "_data",
                                        nameLocation: "1371:5:24",
                                        nodeType: "VariableDeclaration",
                                        scope: 45804,
                                        src: "1356:20:24",
                                        stateVariable: false,
                                        storageLocation: "calldata",
                                        typeDescriptions: {
                                            typeIdentifier:
                                                "t_bytes_calldata_ptr",
                                            typeString: "bytes"
                                        },
                                        typeName: {
                                            id: 45718,
                                            name: "bytes",
                                            nodeType: "ElementaryTypeName",
                                            src: "1356:5:24",
                                            typeDescriptions: {
                                                typeIdentifier:
                                                    "t_bytes_storage_ptr",
                                                typeString: "bytes"
                                            }
                                        },
                                        visibility: "internal"
                                    }
                                ],
                                src: "1355:22:24"
                            },
                            returnParameters: {
                                id: 45722,
                                nodeType: "ParameterList",
                                parameters: [],
                                src: "1404:0:24"
                            },
                            scope: 46052,
                            stateMutability: "payable",
                            virtual: false,
                            visibility: "external"
                        },
                        {
                            id: 45992,
                            nodeType: "FunctionDefinition",
                            src: "2063:1664:24",
                            nodes: [],
                            body: {
                                id: 45991,
                                nodeType: "Block",
                                src: "2238:1489:24",
                                nodes: [],
                                statements: [
                                    {
                                        eventCall: {
                                            arguments: [
                                                {
                                                    hexValue:
                                                        "4265666f7265207369676e617475726520766572696669636174696f6e",
                                                    id: 45819,
                                                    isConstant: false,
                                                    isLValue: false,
                                                    isPure: true,
                                                    kind: "string",
                                                    lValueRequested: false,
                                                    nodeType: "Literal",
                                                    src: "2263:31:24",
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_stringliteral_fd4f653788b8b2de637a0038bc4997874f1faffc7fe64a995e7474fe31df390a",
                                                        typeString:
                                                            'literal_string "Before signature verification"'
                                                    },
                                                    value: "Before signature verification"
                                                },
                                                {
                                                    arguments: [
                                                        {
                                                            hexValue: "30",
                                                            id: 45822,
                                                            isConstant: false,
                                                            isLValue: false,
                                                            isPure: true,
                                                            kind: "number",
                                                            lValueRequested: false,
                                                            nodeType: "Literal",
                                                            src: "2304:1:24",
                                                            typeDescriptions: {
                                                                typeIdentifier:
                                                                    "t_rational_0_by_1",
                                                                typeString:
                                                                    "int_const 0"
                                                            },
                                                            value: "0"
                                                        }
                                                    ],
                                                    expression: {
                                                        argumentTypes: [
                                                            {
                                                                typeIdentifier:
                                                                    "t_rational_0_by_1",
                                                                typeString:
                                                                    "int_const 0"
                                                            }
                                                        ],
                                                        id: 45821,
                                                        isConstant: false,
                                                        isLValue: false,
                                                        isPure: true,
                                                        lValueRequested: false,
                                                        nodeType:
                                                            "ElementaryTypeNameExpression",
                                                        src: "2296:7:24",
                                                        typeDescriptions: {
                                                            typeIdentifier:
                                                                "t_type$_t_address_$",
                                                            typeString:
                                                                "type(address)"
                                                        },
                                                        typeName: {
                                                            id: 45820,
                                                            name: "address",
                                                            nodeType:
                                                                "ElementaryTypeName",
                                                            src: "2296:7:24",
                                                            typeDescriptions: {}
                                                        }
                                                    },
                                                    id: 45823,
                                                    isConstant: false,
                                                    isLValue: false,
                                                    isPure: true,
                                                    kind: "typeConversion",
                                                    lValueRequested: false,
                                                    nameLocations: [],
                                                    names: [],
                                                    nodeType: "FunctionCall",
                                                    src: "2296:10:24",
                                                    tryCall: false,
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_address",
                                                        typeString: "address"
                                                    }
                                                }
                                            ],
                                            expression: {
                                                argumentTypes: [
                                                    {
                                                        typeIdentifier:
                                                            "t_stringliteral_fd4f653788b8b2de637a0038bc4997874f1faffc7fe64a995e7474fe31df390a",
                                                        typeString:
                                                            'literal_string "Before signature verification"'
                                                    },
                                                    {
                                                        typeIdentifier:
                                                            "t_address",
                                                        typeString: "address"
                                                    }
                                                ],
                                                id: 45818,
                                                name: "DebugInfo",
                                                nodeType: "Identifier",
                                                overloadedDeclarations: [],
                                                referencedDeclaration: 45679,
                                                src: "2253:9:24",
                                                typeDescriptions: {
                                                    typeIdentifier:
                                                        "t_function_event_nonpayable$_t_string_memory_ptr_$_t_address_$returns$__$",
                                                    typeString:
                                                        "function (string memory,address)"
                                                }
                                            },
                                            id: 45824,
                                            isConstant: false,
                                            isLValue: false,
                                            isPure: false,
                                            kind: "functionCall",
                                            lValueRequested: false,
                                            nameLocations: [],
                                            names: [],
                                            nodeType: "FunctionCall",
                                            src: "2253:54:24",
                                            tryCall: false,
                                            typeDescriptions: {
                                                typeIdentifier: "t_tuple$__$",
                                                typeString: "tuple()"
                                            }
                                        },
                                        id: 45825,
                                        nodeType: "EmitStatement",
                                        src: "2248:59:24"
                                    },
                                    {
                                        assignments: [45828],
                                        declarations: [
                                            {
                                                constant: false,
                                                id: 45828,
                                                mutability: "mutable",
                                                name: "proof",
                                                nameLocation: "2338:5:24",
                                                nodeType: "VariableDeclaration",
                                                scope: 45991,
                                                src: "2317:26:24",
                                                stateVariable: false,
                                                storageLocation: "storage",
                                                typeDescriptions: {
                                                    typeIdentifier:
                                                        "t_struct$_ProofStorage_$45653_storage_ptr",
                                                    typeString:
                                                        "struct ProofStorage"
                                                },
                                                typeName: {
                                                    id: 45827,
                                                    nodeType:
                                                        "UserDefinedTypeName",
                                                    pathNode: {
                                                        id: 45826,
                                                        name: "ProofStorage",
                                                        nameLocations: [
                                                            "2317:12:24"
                                                        ],
                                                        nodeType:
                                                            "IdentifierPath",
                                                        referencedDeclaration: 45653,
                                                        src: "2317:12:24"
                                                    },
                                                    referencedDeclaration: 45653,
                                                    src: "2317:12:24",
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_struct$_ProofStorage_$45653_storage_ptr",
                                                        typeString:
                                                            "struct ProofStorage"
                                                    }
                                                },
                                                visibility: "internal"
                                            }
                                        ],
                                        id: 45832,
                                        initialValue: {
                                            baseExpression: {
                                                id: 45829,
                                                name: "smartActionProofs",
                                                nodeType: "Identifier",
                                                overloadedDeclarations: [],
                                                referencedDeclaration: 45686,
                                                src: "2346:17:24",
                                                typeDescriptions: {
                                                    typeIdentifier:
                                                        "t_mapping$_t_uint256_$_t_struct$_ProofStorage_$45653_storage_$",
                                                    typeString:
                                                        "mapping(uint256 => struct ProofStorage storage ref)"
                                                }
                                            },
                                            id: 45831,
                                            indexExpression: {
                                                id: 45830,
                                                name: "proofId",
                                                nodeType: "Identifier",
                                                overloadedDeclarations: [],
                                                referencedDeclaration: 45811,
                                                src: "2364:7:24",
                                                typeDescriptions: {
                                                    typeIdentifier: "t_uint256",
                                                    typeString: "uint256"
                                                }
                                            },
                                            isConstant: false,
                                            isLValue: true,
                                            isPure: false,
                                            lValueRequested: false,
                                            nodeType: "IndexAccess",
                                            src: "2346:26:24",
                                            typeDescriptions: {
                                                typeIdentifier:
                                                    "t_struct$_ProofStorage_$45653_storage",
                                                typeString:
                                                    "struct ProofStorage storage ref"
                                            }
                                        },
                                        nodeType:
                                            "VariableDeclarationStatement",
                                        src: "2317:55:24"
                                    },
                                    {
                                        assignments: [
                                            45834, 45836, 45838, 45840, 45842,
                                            45844
                                        ],
                                        declarations: [
                                            {
                                                constant: false,
                                                id: 45834,
                                                mutability: "mutable",
                                                name: "v1",
                                                nameLocation: "2403:2:24",
                                                nodeType: "VariableDeclaration",
                                                scope: 45991,
                                                src: "2397:8:24",
                                                stateVariable: false,
                                                storageLocation: "default",
                                                typeDescriptions: {
                                                    typeIdentifier: "t_uint8",
                                                    typeString: "uint8"
                                                },
                                                typeName: {
                                                    id: 45833,
                                                    name: "uint8",
                                                    nodeType:
                                                        "ElementaryTypeName",
                                                    src: "2397:5:24",
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_uint8",
                                                        typeString: "uint8"
                                                    }
                                                },
                                                visibility: "internal"
                                            },
                                            {
                                                constant: false,
                                                id: 45836,
                                                mutability: "mutable",
                                                name: "r1",
                                                nameLocation: "2427:2:24",
                                                nodeType: "VariableDeclaration",
                                                scope: 45991,
                                                src: "2419:10:24",
                                                stateVariable: false,
                                                storageLocation: "default",
                                                typeDescriptions: {
                                                    typeIdentifier: "t_bytes32",
                                                    typeString: "bytes32"
                                                },
                                                typeName: {
                                                    id: 45835,
                                                    name: "bytes32",
                                                    nodeType:
                                                        "ElementaryTypeName",
                                                    src: "2419:7:24",
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_bytes32",
                                                        typeString: "bytes32"
                                                    }
                                                },
                                                visibility: "internal"
                                            },
                                            {
                                                constant: false,
                                                id: 45838,
                                                mutability: "mutable",
                                                name: "s1",
                                                nameLocation: "2451:2:24",
                                                nodeType: "VariableDeclaration",
                                                scope: 45991,
                                                src: "2443:10:24",
                                                stateVariable: false,
                                                storageLocation: "default",
                                                typeDescriptions: {
                                                    typeIdentifier: "t_bytes32",
                                                    typeString: "bytes32"
                                                },
                                                typeName: {
                                                    id: 45837,
                                                    name: "bytes32",
                                                    nodeType:
                                                        "ElementaryTypeName",
                                                    src: "2443:7:24",
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_bytes32",
                                                        typeString: "bytes32"
                                                    }
                                                },
                                                visibility: "internal"
                                            },
                                            {
                                                constant: false,
                                                id: 45840,
                                                mutability: "mutable",
                                                name: "v2",
                                                nameLocation: "2473:2:24",
                                                nodeType: "VariableDeclaration",
                                                scope: 45991,
                                                src: "2467:8:24",
                                                stateVariable: false,
                                                storageLocation: "default",
                                                typeDescriptions: {
                                                    typeIdentifier: "t_uint8",
                                                    typeString: "uint8"
                                                },
                                                typeName: {
                                                    id: 45839,
                                                    name: "uint8",
                                                    nodeType:
                                                        "ElementaryTypeName",
                                                    src: "2467:5:24",
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_uint8",
                                                        typeString: "uint8"
                                                    }
                                                },
                                                visibility: "internal"
                                            },
                                            {
                                                constant: false,
                                                id: 45842,
                                                mutability: "mutable",
                                                name: "r2",
                                                nameLocation: "2497:2:24",
                                                nodeType: "VariableDeclaration",
                                                scope: 45991,
                                                src: "2489:10:24",
                                                stateVariable: false,
                                                storageLocation: "default",
                                                typeDescriptions: {
                                                    typeIdentifier: "t_bytes32",
                                                    typeString: "bytes32"
                                                },
                                                typeName: {
                                                    id: 45841,
                                                    name: "bytes32",
                                                    nodeType:
                                                        "ElementaryTypeName",
                                                    src: "2489:7:24",
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_bytes32",
                                                        typeString: "bytes32"
                                                    }
                                                },
                                                visibility: "internal"
                                            },
                                            {
                                                constant: false,
                                                id: 45844,
                                                mutability: "mutable",
                                                name: "s2",
                                                nameLocation: "2521:2:24",
                                                nodeType: "VariableDeclaration",
                                                scope: 45991,
                                                src: "2513:10:24",
                                                stateVariable: false,
                                                storageLocation: "default",
                                                typeDescriptions: {
                                                    typeIdentifier: "t_bytes32",
                                                    typeString: "bytes32"
                                                },
                                                typeName: {
                                                    id: 45843,
                                                    name: "bytes32",
                                                    nodeType:
                                                        "ElementaryTypeName",
                                                    src: "2513:7:24",
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_bytes32",
                                                        typeString: "bytes32"
                                                    }
                                                },
                                                visibility: "internal"
                                            }
                                        ],
                                        id: 45849,
                                        initialValue: {
                                            arguments: [
                                                {
                                                    expression: {
                                                        id: 45846,
                                                        name: "_userOp",
                                                        nodeType: "Identifier",
                                                        overloadedDeclarations:
                                                            [],
                                                        referencedDeclaration: 45807,
                                                        src: "2553:7:24",
                                                        typeDescriptions: {
                                                            typeIdentifier:
                                                                "t_struct$_UserOperation_$46188_calldata_ptr",
                                                            typeString:
                                                                "struct UserOperation calldata"
                                                        }
                                                    },
                                                    id: 45847,
                                                    isConstant: false,
                                                    isLValue: false,
                                                    isPure: false,
                                                    lValueRequested: false,
                                                    memberLocation: "2561:9:24",
                                                    memberName: "signature",
                                                    nodeType: "MemberAccess",
                                                    referencedDeclaration: 46187,
                                                    src: "2553:17:24",
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_bytes_calldata_ptr",
                                                        typeString:
                                                            "bytes calldata"
                                                    }
                                                }
                                            ],
                                            expression: {
                                                argumentTypes: [
                                                    {
                                                        typeIdentifier:
                                                            "t_bytes_calldata_ptr",
                                                        typeString:
                                                            "bytes calldata"
                                                    }
                                                ],
                                                id: 45845,
                                                name: "_splitSignatures",
                                                nodeType: "Identifier",
                                                overloadedDeclarations: [],
                                                referencedDeclaration: 46028,
                                                src: "2536:16:24",
                                                typeDescriptions: {
                                                    typeIdentifier:
                                                        "t_function_internal_pure$_t_bytes_memory_ptr_$returns$_t_uint8_$_t_bytes32_$_t_bytes32_$_t_uint8_$_t_bytes32_$_t_bytes32_$",
                                                    typeString:
                                                        "function (bytes memory) pure returns (uint8,bytes32,bytes32,uint8,bytes32,bytes32)"
                                                }
                                            },
                                            id: 45848,
                                            isConstant: false,
                                            isLValue: false,
                                            isPure: false,
                                            kind: "functionCall",
                                            lValueRequested: false,
                                            nameLocations: [],
                                            names: [],
                                            nodeType: "FunctionCall",
                                            src: "2536:35:24",
                                            tryCall: false,
                                            typeDescriptions: {
                                                typeIdentifier:
                                                    "t_tuple$_t_uint8_$_t_bytes32_$_t_bytes32_$_t_uint8_$_t_bytes32_$_t_bytes32_$",
                                                typeString:
                                                    "tuple(uint8,bytes32,bytes32,uint8,bytes32,bytes32)"
                                            }
                                        },
                                        nodeType:
                                            "VariableDeclarationStatement",
                                        src: "2383:188:24"
                                    },
                                    {
                                        assignments: [45851],
                                        declarations: [
                                            {
                                                constant: false,
                                                id: 45851,
                                                mutability: "mutable",
                                                name: "signer1",
                                                nameLocation: "2590:7:24",
                                                nodeType: "VariableDeclaration",
                                                scope: 45991,
                                                src: "2582:15:24",
                                                stateVariable: false,
                                                storageLocation: "default",
                                                typeDescriptions: {
                                                    typeIdentifier: "t_address",
                                                    typeString: "address"
                                                },
                                                typeName: {
                                                    id: 45850,
                                                    name: "address",
                                                    nodeType:
                                                        "ElementaryTypeName",
                                                    src: "2582:7:24",
                                                    stateMutability:
                                                        "nonpayable",
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_address",
                                                        typeString: "address"
                                                    }
                                                },
                                                visibility: "internal"
                                            }
                                        ],
                                        id: 45862,
                                        initialValue: {
                                            arguments: [
                                                {
                                                    arguments: [
                                                        {
                                                            id: 45857,
                                                            name: "r1",
                                                            nodeType:
                                                                "Identifier",
                                                            overloadedDeclarations:
                                                                [],
                                                            referencedDeclaration: 45836,
                                                            src: "2641:2:24",
                                                            typeDescriptions: {
                                                                typeIdentifier:
                                                                    "t_bytes32",
                                                                typeString:
                                                                    "bytes32"
                                                            }
                                                        },
                                                        {
                                                            id: 45858,
                                                            name: "s1",
                                                            nodeType:
                                                                "Identifier",
                                                            overloadedDeclarations:
                                                                [],
                                                            referencedDeclaration: 45838,
                                                            src: "2645:2:24",
                                                            typeDescriptions: {
                                                                typeIdentifier:
                                                                    "t_bytes32",
                                                                typeString:
                                                                    "bytes32"
                                                            }
                                                        },
                                                        {
                                                            id: 45859,
                                                            name: "v1",
                                                            nodeType:
                                                                "Identifier",
                                                            overloadedDeclarations:
                                                                [],
                                                            referencedDeclaration: 45834,
                                                            src: "2649:2:24",
                                                            typeDescriptions: {
                                                                typeIdentifier:
                                                                    "t_uint8",
                                                                typeString:
                                                                    "uint8"
                                                            }
                                                        }
                                                    ],
                                                    expression: {
                                                        argumentTypes: [
                                                            {
                                                                typeIdentifier:
                                                                    "t_bytes32",
                                                                typeString:
                                                                    "bytes32"
                                                            },
                                                            {
                                                                typeIdentifier:
                                                                    "t_bytes32",
                                                                typeString:
                                                                    "bytes32"
                                                            },
                                                            {
                                                                typeIdentifier:
                                                                    "t_uint8",
                                                                typeString:
                                                                    "uint8"
                                                            }
                                                        ],
                                                        expression: {
                                                            id: 45855,
                                                            name: "abi",
                                                            nodeType:
                                                                "Identifier",
                                                            overloadedDeclarations:
                                                                [],
                                                            referencedDeclaration:
                                                                -1,
                                                            src: "2624:3:24",
                                                            typeDescriptions: {
                                                                typeIdentifier:
                                                                    "t_magic_abi",
                                                                typeString:
                                                                    "abi"
                                                            }
                                                        },
                                                        id: 45856,
                                                        isConstant: false,
                                                        isLValue: false,
                                                        isPure: true,
                                                        lValueRequested: false,
                                                        memberLocation:
                                                            "2628:12:24",
                                                        memberName:
                                                            "encodePacked",
                                                        nodeType:
                                                            "MemberAccess",
                                                        src: "2624:16:24",
                                                        typeDescriptions: {
                                                            typeIdentifier:
                                                                "t_function_abiencodepacked_pure$__$returns$_t_bytes_memory_ptr_$",
                                                            typeString:
                                                                "function () pure returns (bytes memory)"
                                                        }
                                                    },
                                                    id: 45860,
                                                    isConstant: false,
                                                    isLValue: false,
                                                    isPure: false,
                                                    kind: "functionCall",
                                                    lValueRequested: false,
                                                    nameLocations: [],
                                                    names: [],
                                                    nodeType: "FunctionCall",
                                                    src: "2624:28:24",
                                                    tryCall: false,
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_bytes_memory_ptr",
                                                        typeString:
                                                            "bytes memory"
                                                    }
                                                }
                                            ],
                                            expression: {
                                                argumentTypes: [
                                                    {
                                                        typeIdentifier:
                                                            "t_bytes_memory_ptr",
                                                        typeString:
                                                            "bytes memory"
                                                    }
                                                ],
                                                expression: {
                                                    expression: {
                                                        id: 45852,
                                                        name: "proof",
                                                        nodeType: "Identifier",
                                                        overloadedDeclarations:
                                                            [],
                                                        referencedDeclaration: 45828,
                                                        src: "2600:5:24",
                                                        typeDescriptions: {
                                                            typeIdentifier:
                                                                "t_struct$_ProofStorage_$45653_storage_ptr",
                                                            typeString:
                                                                "struct ProofStorage storage pointer"
                                                        }
                                                    },
                                                    id: 45853,
                                                    isConstant: false,
                                                    isLValue: true,
                                                    isPure: false,
                                                    lValueRequested: false,
                                                    memberLocation: "2606:9:24",
                                                    memberName: "proofHash",
                                                    nodeType: "MemberAccess",
                                                    referencedDeclaration: 45652,
                                                    src: "2600:15:24",
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_bytes32",
                                                        typeString: "bytes32"
                                                    }
                                                },
                                                id: 45854,
                                                isConstant: false,
                                                isLValue: false,
                                                isPure: false,
                                                lValueRequested: false,
                                                memberLocation: "2616:7:24",
                                                memberName: "recover",
                                                nodeType: "MemberAccess",
                                                referencedDeclaration: 45392,
                                                src: "2600:23:24",
                                                typeDescriptions: {
                                                    typeIdentifier:
                                                        "t_function_internal_pure$_t_bytes32_$_t_bytes_memory_ptr_$returns$_t_address_$attached_to$_t_bytes32_$",
                                                    typeString:
                                                        "function (bytes32,bytes memory) pure returns (address)"
                                                }
                                            },
                                            id: 45861,
                                            isConstant: false,
                                            isLValue: false,
                                            isPure: false,
                                            kind: "functionCall",
                                            lValueRequested: false,
                                            nameLocations: [],
                                            names: [],
                                            nodeType: "FunctionCall",
                                            src: "2600:53:24",
                                            tryCall: false,
                                            typeDescriptions: {
                                                typeIdentifier: "t_address",
                                                typeString: "address"
                                            }
                                        },
                                        nodeType:
                                            "VariableDeclarationStatement",
                                        src: "2582:71:24"
                                    },
                                    {
                                        eventCall: {
                                            arguments: [
                                                {
                                                    hexValue:
                                                        "4166746572207369676e617475726520766572696669636174696f6e",
                                                    id: 45864,
                                                    isConstant: false,
                                                    isLValue: false,
                                                    isPure: true,
                                                    kind: "string",
                                                    lValueRequested: false,
                                                    nodeType: "Literal",
                                                    src: "2678:30:24",
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_stringliteral_8166b0996527ef04a3beec4b148cb4ab7366c2f9a2bcd49785417d1eb51148cc",
                                                        typeString:
                                                            'literal_string "After signature verification"'
                                                    },
                                                    value: "After signature verification"
                                                },
                                                {
                                                    id: 45865,
                                                    name: "signer1",
                                                    nodeType: "Identifier",
                                                    overloadedDeclarations: [],
                                                    referencedDeclaration: 45851,
                                                    src: "2710:7:24",
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_address",
                                                        typeString: "address"
                                                    }
                                                }
                                            ],
                                            expression: {
                                                argumentTypes: [
                                                    {
                                                        typeIdentifier:
                                                            "t_stringliteral_8166b0996527ef04a3beec4b148cb4ab7366c2f9a2bcd49785417d1eb51148cc",
                                                        typeString:
                                                            'literal_string "After signature verification"'
                                                    },
                                                    {
                                                        typeIdentifier:
                                                            "t_address",
                                                        typeString: "address"
                                                    }
                                                ],
                                                id: 45863,
                                                name: "DebugInfo",
                                                nodeType: "Identifier",
                                                overloadedDeclarations: [],
                                                referencedDeclaration: 45679,
                                                src: "2668:9:24",
                                                typeDescriptions: {
                                                    typeIdentifier:
                                                        "t_function_event_nonpayable$_t_string_memory_ptr_$_t_address_$returns$__$",
                                                    typeString:
                                                        "function (string memory,address)"
                                                }
                                            },
                                            id: 45866,
                                            isConstant: false,
                                            isLValue: false,
                                            isPure: false,
                                            kind: "functionCall",
                                            lValueRequested: false,
                                            nameLocations: [],
                                            names: [],
                                            nodeType: "FunctionCall",
                                            src: "2668:50:24",
                                            tryCall: false,
                                            typeDescriptions: {
                                                typeIdentifier: "t_tuple$__$",
                                                typeString: "tuple()"
                                            }
                                        },
                                        id: 45867,
                                        nodeType: "EmitStatement",
                                        src: "2663:55:24"
                                    },
                                    {
                                        assignments: [45869],
                                        declarations: [
                                            {
                                                constant: false,
                                                id: 45869,
                                                mutability: "mutable",
                                                name: "signer2",
                                                nameLocation: "2736:7:24",
                                                nodeType: "VariableDeclaration",
                                                scope: 45991,
                                                src: "2728:15:24",
                                                stateVariable: false,
                                                storageLocation: "default",
                                                typeDescriptions: {
                                                    typeIdentifier: "t_address",
                                                    typeString: "address"
                                                },
                                                typeName: {
                                                    id: 45868,
                                                    name: "address",
                                                    nodeType:
                                                        "ElementaryTypeName",
                                                    src: "2728:7:24",
                                                    stateMutability:
                                                        "nonpayable",
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_address",
                                                        typeString: "address"
                                                    }
                                                },
                                                visibility: "internal"
                                            }
                                        ],
                                        id: 45880,
                                        initialValue: {
                                            arguments: [
                                                {
                                                    arguments: [
                                                        {
                                                            id: 45875,
                                                            name: "r2",
                                                            nodeType:
                                                                "Identifier",
                                                            overloadedDeclarations:
                                                                [],
                                                            referencedDeclaration: 45842,
                                                            src: "2787:2:24",
                                                            typeDescriptions: {
                                                                typeIdentifier:
                                                                    "t_bytes32",
                                                                typeString:
                                                                    "bytes32"
                                                            }
                                                        },
                                                        {
                                                            id: 45876,
                                                            name: "s2",
                                                            nodeType:
                                                                "Identifier",
                                                            overloadedDeclarations:
                                                                [],
                                                            referencedDeclaration: 45844,
                                                            src: "2791:2:24",
                                                            typeDescriptions: {
                                                                typeIdentifier:
                                                                    "t_bytes32",
                                                                typeString:
                                                                    "bytes32"
                                                            }
                                                        },
                                                        {
                                                            id: 45877,
                                                            name: "v2",
                                                            nodeType:
                                                                "Identifier",
                                                            overloadedDeclarations:
                                                                [],
                                                            referencedDeclaration: 45840,
                                                            src: "2795:2:24",
                                                            typeDescriptions: {
                                                                typeIdentifier:
                                                                    "t_uint8",
                                                                typeString:
                                                                    "uint8"
                                                            }
                                                        }
                                                    ],
                                                    expression: {
                                                        argumentTypes: [
                                                            {
                                                                typeIdentifier:
                                                                    "t_bytes32",
                                                                typeString:
                                                                    "bytes32"
                                                            },
                                                            {
                                                                typeIdentifier:
                                                                    "t_bytes32",
                                                                typeString:
                                                                    "bytes32"
                                                            },
                                                            {
                                                                typeIdentifier:
                                                                    "t_uint8",
                                                                typeString:
                                                                    "uint8"
                                                            }
                                                        ],
                                                        expression: {
                                                            id: 45873,
                                                            name: "abi",
                                                            nodeType:
                                                                "Identifier",
                                                            overloadedDeclarations:
                                                                [],
                                                            referencedDeclaration:
                                                                -1,
                                                            src: "2770:3:24",
                                                            typeDescriptions: {
                                                                typeIdentifier:
                                                                    "t_magic_abi",
                                                                typeString:
                                                                    "abi"
                                                            }
                                                        },
                                                        id: 45874,
                                                        isConstant: false,
                                                        isLValue: false,
                                                        isPure: true,
                                                        lValueRequested: false,
                                                        memberLocation:
                                                            "2774:12:24",
                                                        memberName:
                                                            "encodePacked",
                                                        nodeType:
                                                            "MemberAccess",
                                                        src: "2770:16:24",
                                                        typeDescriptions: {
                                                            typeIdentifier:
                                                                "t_function_abiencodepacked_pure$__$returns$_t_bytes_memory_ptr_$",
                                                            typeString:
                                                                "function () pure returns (bytes memory)"
                                                        }
                                                    },
                                                    id: 45878,
                                                    isConstant: false,
                                                    isLValue: false,
                                                    isPure: false,
                                                    kind: "functionCall",
                                                    lValueRequested: false,
                                                    nameLocations: [],
                                                    names: [],
                                                    nodeType: "FunctionCall",
                                                    src: "2770:28:24",
                                                    tryCall: false,
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_bytes_memory_ptr",
                                                        typeString:
                                                            "bytes memory"
                                                    }
                                                }
                                            ],
                                            expression: {
                                                argumentTypes: [
                                                    {
                                                        typeIdentifier:
                                                            "t_bytes_memory_ptr",
                                                        typeString:
                                                            "bytes memory"
                                                    }
                                                ],
                                                expression: {
                                                    expression: {
                                                        id: 45870,
                                                        name: "proof",
                                                        nodeType: "Identifier",
                                                        overloadedDeclarations:
                                                            [],
                                                        referencedDeclaration: 45828,
                                                        src: "2746:5:24",
                                                        typeDescriptions: {
                                                            typeIdentifier:
                                                                "t_struct$_ProofStorage_$45653_storage_ptr",
                                                            typeString:
                                                                "struct ProofStorage storage pointer"
                                                        }
                                                    },
                                                    id: 45871,
                                                    isConstant: false,
                                                    isLValue: true,
                                                    isPure: false,
                                                    lValueRequested: false,
                                                    memberLocation: "2752:9:24",
                                                    memberName: "proofHash",
                                                    nodeType: "MemberAccess",
                                                    referencedDeclaration: 45652,
                                                    src: "2746:15:24",
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_bytes32",
                                                        typeString: "bytes32"
                                                    }
                                                },
                                                id: 45872,
                                                isConstant: false,
                                                isLValue: false,
                                                isPure: false,
                                                lValueRequested: false,
                                                memberLocation: "2762:7:24",
                                                memberName: "recover",
                                                nodeType: "MemberAccess",
                                                referencedDeclaration: 45392,
                                                src: "2746:23:24",
                                                typeDescriptions: {
                                                    typeIdentifier:
                                                        "t_function_internal_pure$_t_bytes32_$_t_bytes_memory_ptr_$returns$_t_address_$attached_to$_t_bytes32_$",
                                                    typeString:
                                                        "function (bytes32,bytes memory) pure returns (address)"
                                                }
                                            },
                                            id: 45879,
                                            isConstant: false,
                                            isLValue: false,
                                            isPure: false,
                                            kind: "functionCall",
                                            lValueRequested: false,
                                            nameLocations: [],
                                            names: [],
                                            nodeType: "FunctionCall",
                                            src: "2746:53:24",
                                            tryCall: false,
                                            typeDescriptions: {
                                                typeIdentifier: "t_address",
                                                typeString: "address"
                                            }
                                        },
                                        nodeType:
                                            "VariableDeclarationStatement",
                                        src: "2728:71:24"
                                    },
                                    {
                                        eventCall: {
                                            arguments: [
                                                {
                                                    hexValue:
                                                        "4166746572207369676e617475726520766572696669636174696f6e",
                                                    id: 45882,
                                                    isConstant: false,
                                                    isLValue: false,
                                                    isPure: true,
                                                    kind: "string",
                                                    lValueRequested: false,
                                                    nodeType: "Literal",
                                                    src: "2824:30:24",
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_stringliteral_8166b0996527ef04a3beec4b148cb4ab7366c2f9a2bcd49785417d1eb51148cc",
                                                        typeString:
                                                            'literal_string "After signature verification"'
                                                    },
                                                    value: "After signature verification"
                                                },
                                                {
                                                    id: 45883,
                                                    name: "signer2",
                                                    nodeType: "Identifier",
                                                    overloadedDeclarations: [],
                                                    referencedDeclaration: 45869,
                                                    src: "2856:7:24",
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_address",
                                                        typeString: "address"
                                                    }
                                                }
                                            ],
                                            expression: {
                                                argumentTypes: [
                                                    {
                                                        typeIdentifier:
                                                            "t_stringliteral_8166b0996527ef04a3beec4b148cb4ab7366c2f9a2bcd49785417d1eb51148cc",
                                                        typeString:
                                                            'literal_string "After signature verification"'
                                                    },
                                                    {
                                                        typeIdentifier:
                                                            "t_address",
                                                        typeString: "address"
                                                    }
                                                ],
                                                id: 45881,
                                                name: "DebugInfo",
                                                nodeType: "Identifier",
                                                overloadedDeclarations: [],
                                                referencedDeclaration: 45679,
                                                src: "2814:9:24",
                                                typeDescriptions: {
                                                    typeIdentifier:
                                                        "t_function_event_nonpayable$_t_string_memory_ptr_$_t_address_$returns$__$",
                                                    typeString:
                                                        "function (string memory,address)"
                                                }
                                            },
                                            id: 45884,
                                            isConstant: false,
                                            isLValue: false,
                                            isPure: false,
                                            kind: "functionCall",
                                            lValueRequested: false,
                                            nameLocations: [],
                                            names: [],
                                            nodeType: "FunctionCall",
                                            src: "2814:50:24",
                                            tryCall: false,
                                            typeDescriptions: {
                                                typeIdentifier: "t_tuple$__$",
                                                typeString: "tuple()"
                                            }
                                        },
                                        id: 45885,
                                        nodeType: "EmitStatement",
                                        src: "2809:55:24"
                                    },
                                    {
                                        eventCall: {
                                            arguments: [
                                                {
                                                    id: 45887,
                                                    name: "signer1",
                                                    nodeType: "Identifier",
                                                    overloadedDeclarations: [],
                                                    referencedDeclaration: 45851,
                                                    src: "2914:7:24",
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_address",
                                                        typeString: "address"
                                                    }
                                                },
                                                {
                                                    id: 45888,
                                                    name: "signer2",
                                                    nodeType: "Identifier",
                                                    overloadedDeclarations: [],
                                                    referencedDeclaration: 45869,
                                                    src: "2935:7:24",
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_address",
                                                        typeString: "address"
                                                    }
                                                },
                                                {
                                                    expression: {
                                                        id: 45889,
                                                        name: "proof",
                                                        nodeType: "Identifier",
                                                        overloadedDeclarations:
                                                            [],
                                                        referencedDeclaration: 45828,
                                                        src: "2956:5:24",
                                                        typeDescriptions: {
                                                            typeIdentifier:
                                                                "t_struct$_ProofStorage_$45653_storage_ptr",
                                                            typeString:
                                                                "struct ProofStorage storage pointer"
                                                        }
                                                    },
                                                    id: 45890,
                                                    isConstant: false,
                                                    isLValue: true,
                                                    isPure: false,
                                                    lValueRequested: false,
                                                    memberLocation: "2962:9:24",
                                                    memberName: "proofHash",
                                                    nodeType: "MemberAccess",
                                                    referencedDeclaration: 45652,
                                                    src: "2956:15:24",
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_bytes32",
                                                        typeString: "bytes32"
                                                    }
                                                },
                                                {
                                                    id: 45891,
                                                    name: "_userOpHash",
                                                    nodeType: "Identifier",
                                                    overloadedDeclarations: [],
                                                    referencedDeclaration: 45809,
                                                    src: "2985:11:24",
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_bytes32",
                                                        typeString: "bytes32"
                                                    }
                                                },
                                                {
                                                    commonType: {
                                                        typeIdentifier:
                                                            "t_bool",
                                                        typeString: "bool"
                                                    },
                                                    id: 45899,
                                                    isConstant: false,
                                                    isLValue: false,
                                                    isPure: false,
                                                    lValueRequested: false,
                                                    leftExpression: {
                                                        commonType: {
                                                            typeIdentifier:
                                                                "t_address",
                                                            typeString:
                                                                "address"
                                                        },
                                                        id: 45894,
                                                        isConstant: false,
                                                        isLValue: false,
                                                        isPure: false,
                                                        lValueRequested: false,
                                                        leftExpression: {
                                                            id: 45892,
                                                            name: "signer1",
                                                            nodeType:
                                                                "Identifier",
                                                            overloadedDeclarations:
                                                                [],
                                                            referencedDeclaration: 45851,
                                                            src: "3010:7:24",
                                                            typeDescriptions: {
                                                                typeIdentifier:
                                                                    "t_address",
                                                                typeString:
                                                                    "address"
                                                            }
                                                        },
                                                        nodeType:
                                                            "BinaryOperation",
                                                        operator: "==",
                                                        rightExpression: {
                                                            id: 45893,
                                                            name: "GizaAddress",
                                                            nodeType:
                                                                "Identifier",
                                                            overloadedDeclarations:
                                                                [],
                                                            referencedDeclaration: 45681,
                                                            src: "3021:11:24",
                                                            typeDescriptions: {
                                                                typeIdentifier:
                                                                    "t_address",
                                                                typeString:
                                                                    "address"
                                                            }
                                                        },
                                                        src: "3010:22:24",
                                                        typeDescriptions: {
                                                            typeIdentifier:
                                                                "t_bool",
                                                            typeString: "bool"
                                                        }
                                                    },
                                                    nodeType: "BinaryOperation",
                                                    operator: "&&",
                                                    rightExpression: {
                                                        commonType: {
                                                            typeIdentifier:
                                                                "t_address",
                                                            typeString:
                                                                "address"
                                                        },
                                                        id: 45898,
                                                        isConstant: false,
                                                        isLValue: false,
                                                        isPure: false,
                                                        lValueRequested: false,
                                                        leftExpression: {
                                                            id: 45895,
                                                            name: "signer2",
                                                            nodeType:
                                                                "Identifier",
                                                            overloadedDeclarations:
                                                                [],
                                                            referencedDeclaration: 45869,
                                                            src: "3036:7:24",
                                                            typeDescriptions: {
                                                                typeIdentifier:
                                                                    "t_address",
                                                                typeString:
                                                                    "address"
                                                            }
                                                        },
                                                        nodeType:
                                                            "BinaryOperation",
                                                        operator: "==",
                                                        rightExpression: {
                                                            expression: {
                                                                id: 45896,
                                                                name: "proof",
                                                                nodeType:
                                                                    "Identifier",
                                                                overloadedDeclarations:
                                                                    [],
                                                                referencedDeclaration: 45828,
                                                                src: "3047:5:24",
                                                                typeDescriptions:
                                                                    {
                                                                        typeIdentifier:
                                                                            "t_struct$_ProofStorage_$45653_storage_ptr",
                                                                        typeString:
                                                                            "struct ProofStorage storage pointer"
                                                                    }
                                                            },
                                                            id: 45897,
                                                            isConstant: false,
                                                            isLValue: true,
                                                            isPure: false,
                                                            lValueRequested: false,
                                                            memberLocation:
                                                                "3053:11:24",
                                                            memberName:
                                                                "userAddress",
                                                            nodeType:
                                                                "MemberAccess",
                                                            referencedDeclaration: 45650,
                                                            src: "3047:17:24",
                                                            typeDescriptions: {
                                                                typeIdentifier:
                                                                    "t_address",
                                                                typeString:
                                                                    "address"
                                                            }
                                                        },
                                                        src: "3036:28:24",
                                                        typeDescriptions: {
                                                            typeIdentifier:
                                                                "t_bool",
                                                            typeString: "bool"
                                                        }
                                                    },
                                                    src: "3010:54:24",
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_bool",
                                                        typeString: "bool"
                                                    }
                                                }
                                            ],
                                            expression: {
                                                argumentTypes: [
                                                    {
                                                        typeIdentifier:
                                                            "t_address",
                                                        typeString: "address"
                                                    },
                                                    {
                                                        typeIdentifier:
                                                            "t_address",
                                                        typeString: "address"
                                                    },
                                                    {
                                                        typeIdentifier:
                                                            "t_bytes32",
                                                        typeString: "bytes32"
                                                    },
                                                    {
                                                        typeIdentifier:
                                                            "t_bytes32",
                                                        typeString: "bytes32"
                                                    },
                                                    {
                                                        typeIdentifier:
                                                            "t_bool",
                                                        typeString: "bool"
                                                    }
                                                ],
                                                id: 45886,
                                                name: "SignatureVerification",
                                                nodeType: "Identifier",
                                                overloadedDeclarations: [],
                                                referencedDeclaration: 45673,
                                                src: "2879:21:24",
                                                typeDescriptions: {
                                                    typeIdentifier:
                                                        "t_function_event_nonpayable$_t_address_$_t_address_$_t_bytes32_$_t_bytes32_$_t_bool_$returns$__$",
                                                    typeString:
                                                        "function (address,address,bytes32,bytes32,bool)"
                                                }
                                            },
                                            id: 45900,
                                            isConstant: false,
                                            isLValue: false,
                                            isPure: false,
                                            kind: "functionCall",
                                            lValueRequested: false,
                                            nameLocations: [],
                                            names: [],
                                            nodeType: "FunctionCall",
                                            src: "2879:195:24",
                                            tryCall: false,
                                            typeDescriptions: {
                                                typeIdentifier: "t_tuple$__$",
                                                typeString: "tuple()"
                                            }
                                        },
                                        id: 45901,
                                        nodeType: "EmitStatement",
                                        src: "2874:200:24"
                                    },
                                    {
                                        assignments: [45903],
                                        declarations: [
                                            {
                                                constant: false,
                                                id: 45903,
                                                mutability: "mutable",
                                                name: "valid",
                                                nameLocation: "3090:5:24",
                                                nodeType: "VariableDeclaration",
                                                scope: 45991,
                                                src: "3085:10:24",
                                                stateVariable: false,
                                                storageLocation: "default",
                                                typeDescriptions: {
                                                    typeIdentifier: "t_bool",
                                                    typeString: "bool"
                                                },
                                                typeName: {
                                                    id: 45902,
                                                    name: "bool",
                                                    nodeType:
                                                        "ElementaryTypeName",
                                                    src: "3085:4:24",
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_bool",
                                                        typeString: "bool"
                                                    }
                                                },
                                                visibility: "internal"
                                            }
                                        ],
                                        id: 45914,
                                        initialValue: {
                                            commonType: {
                                                typeIdentifier: "t_bool",
                                                typeString: "bool"
                                            },
                                            id: 45913,
                                            isConstant: false,
                                            isLValue: false,
                                            isPure: false,
                                            lValueRequested: false,
                                            leftExpression: {
                                                components: [
                                                    {
                                                        commonType: {
                                                            typeIdentifier:
                                                                "t_address",
                                                            typeString:
                                                                "address"
                                                        },
                                                        id: 45906,
                                                        isConstant: false,
                                                        isLValue: false,
                                                        isPure: false,
                                                        lValueRequested: false,
                                                        leftExpression: {
                                                            id: 45904,
                                                            name: "signer1",
                                                            nodeType:
                                                                "Identifier",
                                                            overloadedDeclarations:
                                                                [],
                                                            referencedDeclaration: 45851,
                                                            src: "3099:7:24",
                                                            typeDescriptions: {
                                                                typeIdentifier:
                                                                    "t_address",
                                                                typeString:
                                                                    "address"
                                                            }
                                                        },
                                                        nodeType:
                                                            "BinaryOperation",
                                                        operator: "==",
                                                        rightExpression: {
                                                            id: 45905,
                                                            name: "GizaAddress",
                                                            nodeType:
                                                                "Identifier",
                                                            overloadedDeclarations:
                                                                [],
                                                            referencedDeclaration: 45681,
                                                            src: "3110:11:24",
                                                            typeDescriptions: {
                                                                typeIdentifier:
                                                                    "t_address",
                                                                typeString:
                                                                    "address"
                                                            }
                                                        },
                                                        src: "3099:22:24",
                                                        typeDescriptions: {
                                                            typeIdentifier:
                                                                "t_bool",
                                                            typeString: "bool"
                                                        }
                                                    }
                                                ],
                                                id: 45907,
                                                isConstant: false,
                                                isInlineArray: false,
                                                isLValue: false,
                                                isPure: false,
                                                lValueRequested: false,
                                                nodeType: "TupleExpression",
                                                src: "3098:24:24",
                                                typeDescriptions: {
                                                    typeIdentifier: "t_bool",
                                                    typeString: "bool"
                                                }
                                            },
                                            nodeType: "BinaryOperation",
                                            operator: "&&",
                                            rightExpression: {
                                                components: [
                                                    {
                                                        commonType: {
                                                            typeIdentifier:
                                                                "t_address",
                                                            typeString:
                                                                "address"
                                                        },
                                                        id: 45911,
                                                        isConstant: false,
                                                        isLValue: false,
                                                        isPure: false,
                                                        lValueRequested: false,
                                                        leftExpression: {
                                                            id: 45908,
                                                            name: "signer2",
                                                            nodeType:
                                                                "Identifier",
                                                            overloadedDeclarations:
                                                                [],
                                                            referencedDeclaration: 45869,
                                                            src: "3127:7:24",
                                                            typeDescriptions: {
                                                                typeIdentifier:
                                                                    "t_address",
                                                                typeString:
                                                                    "address"
                                                            }
                                                        },
                                                        nodeType:
                                                            "BinaryOperation",
                                                        operator: "==",
                                                        rightExpression: {
                                                            expression: {
                                                                id: 45909,
                                                                name: "proof",
                                                                nodeType:
                                                                    "Identifier",
                                                                overloadedDeclarations:
                                                                    [],
                                                                referencedDeclaration: 45828,
                                                                src: "3138:5:24",
                                                                typeDescriptions:
                                                                    {
                                                                        typeIdentifier:
                                                                            "t_struct$_ProofStorage_$45653_storage_ptr",
                                                                        typeString:
                                                                            "struct ProofStorage storage pointer"
                                                                    }
                                                            },
                                                            id: 45910,
                                                            isConstant: false,
                                                            isLValue: true,
                                                            isPure: false,
                                                            lValueRequested: false,
                                                            memberLocation:
                                                                "3144:11:24",
                                                            memberName:
                                                                "userAddress",
                                                            nodeType:
                                                                "MemberAccess",
                                                            referencedDeclaration: 45650,
                                                            src: "3138:17:24",
                                                            typeDescriptions: {
                                                                typeIdentifier:
                                                                    "t_address",
                                                                typeString:
                                                                    "address"
                                                            }
                                                        },
                                                        src: "3127:28:24",
                                                        typeDescriptions: {
                                                            typeIdentifier:
                                                                "t_bool",
                                                            typeString: "bool"
                                                        }
                                                    }
                                                ],
                                                id: 45912,
                                                isConstant: false,
                                                isInlineArray: false,
                                                isLValue: false,
                                                isPure: false,
                                                lValueRequested: false,
                                                nodeType: "TupleExpression",
                                                src: "3126:30:24",
                                                typeDescriptions: {
                                                    typeIdentifier: "t_bool",
                                                    typeString: "bool"
                                                }
                                            },
                                            src: "3098:58:24",
                                            typeDescriptions: {
                                                typeIdentifier: "t_bool",
                                                typeString: "bool"
                                            }
                                        },
                                        nodeType:
                                            "VariableDeclarationStatement",
                                        src: "3085:71:24"
                                    },
                                    {
                                        condition: {
                                            id: 45916,
                                            isConstant: false,
                                            isLValue: false,
                                            isPure: false,
                                            lValueRequested: false,
                                            nodeType: "UnaryOperation",
                                            operator: "!",
                                            prefix: true,
                                            src: "3171:6:24",
                                            subExpression: {
                                                id: 45915,
                                                name: "valid",
                                                nodeType: "Identifier",
                                                overloadedDeclarations: [],
                                                referencedDeclaration: 45903,
                                                src: "3172:5:24",
                                                typeDescriptions: {
                                                    typeIdentifier: "t_bool",
                                                    typeString: "bool"
                                                }
                                            },
                                            typeDescriptions: {
                                                typeIdentifier: "t_bool",
                                                typeString: "bool"
                                            }
                                        },
                                        id: 45944,
                                        nodeType: "IfStatement",
                                        src: "3167:261:24",
                                        trueBody: {
                                            id: 45943,
                                            nodeType: "Block",
                                            src: "3179:249:24",
                                            statements: [
                                                {
                                                    assignments: [45919],
                                                    declarations: [
                                                        {
                                                            constant: false,
                                                            id: 45919,
                                                            mutability:
                                                                "mutable",
                                                            name: "invalidValidAfter",
                                                            nameLocation:
                                                                "3204:17:24",
                                                            nodeType:
                                                                "VariableDeclaration",
                                                            scope: 45943,
                                                            src: "3193:28:24",
                                                            stateVariable: false,
                                                            storageLocation:
                                                                "default",
                                                            typeDescriptions: {
                                                                typeIdentifier:
                                                                    "t_userDefinedValueType$_ValidAfter_$46106",
                                                                typeString:
                                                                    "ValidAfter"
                                                            },
                                                            typeName: {
                                                                id: 45918,
                                                                nodeType:
                                                                    "UserDefinedTypeName",
                                                                pathNode: {
                                                                    id: 45917,
                                                                    name: "ValidAfter",
                                                                    nameLocations:
                                                                        [
                                                                            "3193:10:24"
                                                                        ],
                                                                    nodeType:
                                                                        "IdentifierPath",
                                                                    referencedDeclaration: 46106,
                                                                    src: "3193:10:24"
                                                                },
                                                                referencedDeclaration: 46106,
                                                                src: "3193:10:24",
                                                                typeDescriptions:
                                                                    {
                                                                        typeIdentifier:
                                                                            "t_userDefinedValueType$_ValidAfter_$46106",
                                                                        typeString:
                                                                            "ValidAfter"
                                                                    }
                                                            },
                                                            visibility:
                                                                "internal"
                                                        }
                                                    ],
                                                    id: 45924,
                                                    initialValue: {
                                                        arguments: [
                                                            {
                                                                hexValue: "30",
                                                                id: 45922,
                                                                isConstant: false,
                                                                isLValue: false,
                                                                isPure: true,
                                                                kind: "number",
                                                                lValueRequested: false,
                                                                nodeType:
                                                                    "Literal",
                                                                src: "3240:1:24",
                                                                typeDescriptions:
                                                                    {
                                                                        typeIdentifier:
                                                                            "t_rational_0_by_1",
                                                                        typeString:
                                                                            "int_const 0"
                                                                    },
                                                                value: "0"
                                                            }
                                                        ],
                                                        expression: {
                                                            argumentTypes: [
                                                                {
                                                                    typeIdentifier:
                                                                        "t_rational_0_by_1",
                                                                    typeString:
                                                                        "int_const 0"
                                                                }
                                                            ],
                                                            expression: {
                                                                id: 45920,
                                                                name: "ValidAfter",
                                                                nodeType:
                                                                    "Identifier",
                                                                overloadedDeclarations:
                                                                    [],
                                                                referencedDeclaration: 46106,
                                                                src: "3224:10:24",
                                                                typeDescriptions:
                                                                    {
                                                                        typeIdentifier:
                                                                            "t_type$_t_userDefinedValueType$_ValidAfter_$46106_$",
                                                                        typeString:
                                                                            "type(ValidAfter)"
                                                                    }
                                                            },
                                                            id: 45921,
                                                            isConstant: false,
                                                            isLValue: false,
                                                            isPure: true,
                                                            lValueRequested: false,
                                                            memberLocation:
                                                                "3235:4:24",
                                                            memberName: "wrap",
                                                            nodeType:
                                                                "MemberAccess",
                                                            src: "3224:15:24",
                                                            typeDescriptions: {
                                                                typeIdentifier:
                                                                    "t_function_wrap_pure$_t_uint48_$returns$_t_userDefinedValueType$_ValidAfter_$46106_$",
                                                                typeString:
                                                                    "function (uint48) pure returns (ValidAfter)"
                                                            }
                                                        },
                                                        id: 45923,
                                                        isConstant: false,
                                                        isLValue: false,
                                                        isPure: true,
                                                        kind: "functionCall",
                                                        lValueRequested: false,
                                                        nameLocations: [],
                                                        names: [],
                                                        nodeType:
                                                            "FunctionCall",
                                                        src: "3224:18:24",
                                                        tryCall: false,
                                                        typeDescriptions: {
                                                            typeIdentifier:
                                                                "t_userDefinedValueType$_ValidAfter_$46106",
                                                            typeString:
                                                                "ValidAfter"
                                                        }
                                                    },
                                                    nodeType:
                                                        "VariableDeclarationStatement",
                                                    src: "3193:49:24"
                                                },
                                                {
                                                    assignments: [45927],
                                                    declarations: [
                                                        {
                                                            constant: false,
                                                            id: 45927,
                                                            mutability:
                                                                "mutable",
                                                            name: "invalidValidUntil",
                                                            nameLocation:
                                                                "3267:17:24",
                                                            nodeType:
                                                                "VariableDeclaration",
                                                            scope: 45943,
                                                            src: "3256:28:24",
                                                            stateVariable: false,
                                                            storageLocation:
                                                                "default",
                                                            typeDescriptions: {
                                                                typeIdentifier:
                                                                    "t_userDefinedValueType$_ValidUntil_$46108",
                                                                typeString:
                                                                    "ValidUntil"
                                                            },
                                                            typeName: {
                                                                id: 45926,
                                                                nodeType:
                                                                    "UserDefinedTypeName",
                                                                pathNode: {
                                                                    id: 45925,
                                                                    name: "ValidUntil",
                                                                    nameLocations:
                                                                        [
                                                                            "3256:10:24"
                                                                        ],
                                                                    nodeType:
                                                                        "IdentifierPath",
                                                                    referencedDeclaration: 46108,
                                                                    src: "3256:10:24"
                                                                },
                                                                referencedDeclaration: 46108,
                                                                src: "3256:10:24",
                                                                typeDescriptions:
                                                                    {
                                                                        typeIdentifier:
                                                                            "t_userDefinedValueType$_ValidUntil_$46108",
                                                                        typeString:
                                                                            "ValidUntil"
                                                                    }
                                                            },
                                                            visibility:
                                                                "internal"
                                                        }
                                                    ],
                                                    id: 45932,
                                                    initialValue: {
                                                        arguments: [
                                                            {
                                                                hexValue: "31",
                                                                id: 45930,
                                                                isConstant: false,
                                                                isLValue: false,
                                                                isPure: true,
                                                                kind: "number",
                                                                lValueRequested: false,
                                                                nodeType:
                                                                    "Literal",
                                                                src: "3303:1:24",
                                                                typeDescriptions:
                                                                    {
                                                                        typeIdentifier:
                                                                            "t_rational_1_by_1",
                                                                        typeString:
                                                                            "int_const 1"
                                                                    },
                                                                value: "1"
                                                            }
                                                        ],
                                                        expression: {
                                                            argumentTypes: [
                                                                {
                                                                    typeIdentifier:
                                                                        "t_rational_1_by_1",
                                                                    typeString:
                                                                        "int_const 1"
                                                                }
                                                            ],
                                                            expression: {
                                                                id: 45928,
                                                                name: "ValidUntil",
                                                                nodeType:
                                                                    "Identifier",
                                                                overloadedDeclarations:
                                                                    [],
                                                                referencedDeclaration: 46108,
                                                                src: "3287:10:24",
                                                                typeDescriptions:
                                                                    {
                                                                        typeIdentifier:
                                                                            "t_type$_t_userDefinedValueType$_ValidUntil_$46108_$",
                                                                        typeString:
                                                                            "type(ValidUntil)"
                                                                    }
                                                            },
                                                            id: 45929,
                                                            isConstant: false,
                                                            isLValue: false,
                                                            isPure: true,
                                                            lValueRequested: false,
                                                            memberLocation:
                                                                "3298:4:24",
                                                            memberName: "wrap",
                                                            nodeType:
                                                                "MemberAccess",
                                                            src: "3287:15:24",
                                                            typeDescriptions: {
                                                                typeIdentifier:
                                                                    "t_function_wrap_pure$_t_uint48_$returns$_t_userDefinedValueType$_ValidUntil_$46108_$",
                                                                typeString:
                                                                    "function (uint48) pure returns (ValidUntil)"
                                                            }
                                                        },
                                                        id: 45931,
                                                        isConstant: false,
                                                        isLValue: false,
                                                        isPure: true,
                                                        kind: "functionCall",
                                                        lValueRequested: false,
                                                        nameLocations: [],
                                                        names: [],
                                                        nodeType:
                                                            "FunctionCall",
                                                        src: "3287:18:24",
                                                        tryCall: false,
                                                        typeDescriptions: {
                                                            typeIdentifier:
                                                                "t_userDefinedValueType$_ValidUntil_$46108",
                                                            typeString:
                                                                "ValidUntil"
                                                        }
                                                    },
                                                    nodeType:
                                                        "VariableDeclarationStatement",
                                                    src: "3256:49:24"
                                                },
                                                {
                                                    eventCall: {
                                                        arguments: [
                                                            {
                                                                hexValue: "30",
                                                                id: 45934,
                                                                isConstant: false,
                                                                isLValue: false,
                                                                isPure: true,
                                                                kind: "number",
                                                                lValueRequested: false,
                                                                nodeType:
                                                                    "Literal",
                                                                src: "3335:1:24",
                                                                typeDescriptions:
                                                                    {
                                                                        typeIdentifier:
                                                                            "t_rational_0_by_1",
                                                                        typeString:
                                                                            "int_const 0"
                                                                    },
                                                                value: "0"
                                                            },
                                                            {
                                                                hexValue: "31",
                                                                id: 45935,
                                                                isConstant: false,
                                                                isLValue: false,
                                                                isPure: true,
                                                                kind: "number",
                                                                lValueRequested: false,
                                                                nodeType:
                                                                    "Literal",
                                                                src: "3338:1:24",
                                                                typeDescriptions:
                                                                    {
                                                                        typeIdentifier:
                                                                            "t_rational_1_by_1",
                                                                        typeString:
                                                                            "int_const 1"
                                                                    },
                                                                value: "1"
                                                            }
                                                        ],
                                                        expression: {
                                                            argumentTypes: [
                                                                {
                                                                    typeIdentifier:
                                                                        "t_rational_0_by_1",
                                                                    typeString:
                                                                        "int_const 0"
                                                                },
                                                                {
                                                                    typeIdentifier:
                                                                        "t_rational_1_by_1",
                                                                    typeString:
                                                                        "int_const 1"
                                                                }
                                                            ],
                                                            id: 45933,
                                                            name: "Validation",
                                                            nodeType:
                                                                "Identifier",
                                                            overloadedDeclarations:
                                                                [],
                                                            referencedDeclaration: 45661,
                                                            src: "3324:10:24",
                                                            typeDescriptions: {
                                                                typeIdentifier:
                                                                    "t_function_event_nonpayable$_t_uint48_$_t_uint48_$returns$__$",
                                                                typeString:
                                                                    "function (uint48,uint48)"
                                                            }
                                                        },
                                                        id: 45936,
                                                        isConstant: false,
                                                        isLValue: false,
                                                        isPure: false,
                                                        kind: "functionCall",
                                                        lValueRequested: false,
                                                        nameLocations: [],
                                                        names: [],
                                                        nodeType:
                                                            "FunctionCall",
                                                        src: "3324:16:24",
                                                        tryCall: false,
                                                        typeDescriptions: {
                                                            typeIdentifier:
                                                                "t_tuple$__$",
                                                            typeString:
                                                                "tuple()"
                                                        }
                                                    },
                                                    id: 45937,
                                                    nodeType: "EmitStatement",
                                                    src: "3319:21:24"
                                                },
                                                {
                                                    expression: {
                                                        arguments: [
                                                            {
                                                                id: 45939,
                                                                name: "invalidValidAfter",
                                                                nodeType:
                                                                    "Identifier",
                                                                overloadedDeclarations:
                                                                    [],
                                                                referencedDeclaration: 45919,
                                                                src: "3380:17:24",
                                                                typeDescriptions:
                                                                    {
                                                                        typeIdentifier:
                                                                            "t_userDefinedValueType$_ValidAfter_$46106",
                                                                        typeString:
                                                                            "ValidAfter"
                                                                    }
                                                            },
                                                            {
                                                                id: 45940,
                                                                name: "invalidValidUntil",
                                                                nodeType:
                                                                    "Identifier",
                                                                overloadedDeclarations:
                                                                    [],
                                                                referencedDeclaration: 45927,
                                                                src: "3399:17:24",
                                                                typeDescriptions:
                                                                    {
                                                                        typeIdentifier:
                                                                            "t_userDefinedValueType$_ValidUntil_$46108",
                                                                        typeString:
                                                                            "ValidUntil"
                                                                    }
                                                            }
                                                        ],
                                                        expression: {
                                                            argumentTypes: [
                                                                {
                                                                    typeIdentifier:
                                                                        "t_userDefinedValueType$_ValidAfter_$46106",
                                                                    typeString:
                                                                        "ValidAfter"
                                                                },
                                                                {
                                                                    typeIdentifier:
                                                                        "t_userDefinedValueType$_ValidUntil_$46108",
                                                                    typeString:
                                                                        "ValidUntil"
                                                                }
                                                            ],
                                                            id: 45938,
                                                            name: "packValidationData",
                                                            nodeType:
                                                                "Identifier",
                                                            overloadedDeclarations:
                                                                [],
                                                            referencedDeclaration: 46146,
                                                            src: "3361:18:24",
                                                            typeDescriptions: {
                                                                typeIdentifier:
                                                                    "t_function_internal_pure$_t_userDefinedValueType$_ValidAfter_$46106_$_t_userDefinedValueType$_ValidUntil_$46108_$returns$_t_userDefinedValueType$_ValidationData_$46110_$",
                                                                typeString:
                                                                    "function (ValidAfter,ValidUntil) pure returns (ValidationData)"
                                                            }
                                                        },
                                                        id: 45941,
                                                        isConstant: false,
                                                        isLValue: false,
                                                        isPure: false,
                                                        kind: "functionCall",
                                                        lValueRequested: false,
                                                        nameLocations: [],
                                                        names: [],
                                                        nodeType:
                                                            "FunctionCall",
                                                        src: "3361:56:24",
                                                        tryCall: false,
                                                        typeDescriptions: {
                                                            typeIdentifier:
                                                                "t_userDefinedValueType$_ValidationData_$46110",
                                                            typeString:
                                                                "ValidationData"
                                                        }
                                                    },
                                                    functionReturnParameters: 45817,
                                                    id: 45942,
                                                    nodeType: "Return",
                                                    src: "3354:63:24"
                                                }
                                            ]
                                        }
                                    },
                                    {
                                        assignments: [45947],
                                        declarations: [
                                            {
                                                constant: false,
                                                id: 45947,
                                                mutability: "mutable",
                                                name: "validAfter",
                                                nameLocation: "3449:10:24",
                                                nodeType: "VariableDeclaration",
                                                scope: 45991,
                                                src: "3438:21:24",
                                                stateVariable: false,
                                                storageLocation: "default",
                                                typeDescriptions: {
                                                    typeIdentifier:
                                                        "t_userDefinedValueType$_ValidAfter_$46106",
                                                    typeString: "ValidAfter"
                                                },
                                                typeName: {
                                                    id: 45946,
                                                    nodeType:
                                                        "UserDefinedTypeName",
                                                    pathNode: {
                                                        id: 45945,
                                                        name: "ValidAfter",
                                                        nameLocations: [
                                                            "3438:10:24"
                                                        ],
                                                        nodeType:
                                                            "IdentifierPath",
                                                        referencedDeclaration: 46106,
                                                        src: "3438:10:24"
                                                    },
                                                    referencedDeclaration: 46106,
                                                    src: "3438:10:24",
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_userDefinedValueType$_ValidAfter_$46106",
                                                        typeString: "ValidAfter"
                                                    }
                                                },
                                                visibility: "internal"
                                            }
                                        ],
                                        id: 45956,
                                        initialValue: {
                                            arguments: [
                                                {
                                                    arguments: [
                                                        {
                                                            expression: {
                                                                id: 45952,
                                                                name: "block",
                                                                nodeType:
                                                                    "Identifier",
                                                                overloadedDeclarations:
                                                                    [],
                                                                referencedDeclaration:
                                                                    -4,
                                                                src: "3485:5:24",
                                                                typeDescriptions:
                                                                    {
                                                                        typeIdentifier:
                                                                            "t_magic_block",
                                                                        typeString:
                                                                            "block"
                                                                    }
                                                            },
                                                            id: 45953,
                                                            isConstant: false,
                                                            isLValue: false,
                                                            isPure: false,
                                                            lValueRequested: false,
                                                            memberLocation:
                                                                "3491:9:24",
                                                            memberName:
                                                                "timestamp",
                                                            nodeType:
                                                                "MemberAccess",
                                                            src: "3485:15:24",
                                                            typeDescriptions: {
                                                                typeIdentifier:
                                                                    "t_uint256",
                                                                typeString:
                                                                    "uint256"
                                                            }
                                                        }
                                                    ],
                                                    expression: {
                                                        argumentTypes: [
                                                            {
                                                                typeIdentifier:
                                                                    "t_uint256",
                                                                typeString:
                                                                    "uint256"
                                                            }
                                                        ],
                                                        id: 45951,
                                                        isConstant: false,
                                                        isLValue: false,
                                                        isPure: true,
                                                        lValueRequested: false,
                                                        nodeType:
                                                            "ElementaryTypeNameExpression",
                                                        src: "3478:6:24",
                                                        typeDescriptions: {
                                                            typeIdentifier:
                                                                "t_type$_t_uint48_$",
                                                            typeString:
                                                                "type(uint48)"
                                                        },
                                                        typeName: {
                                                            id: 45950,
                                                            name: "uint48",
                                                            nodeType:
                                                                "ElementaryTypeName",
                                                            src: "3478:6:24",
                                                            typeDescriptions: {}
                                                        }
                                                    },
                                                    id: 45954,
                                                    isConstant: false,
                                                    isLValue: false,
                                                    isPure: false,
                                                    kind: "typeConversion",
                                                    lValueRequested: false,
                                                    nameLocations: [],
                                                    names: [],
                                                    nodeType: "FunctionCall",
                                                    src: "3478:23:24",
                                                    tryCall: false,
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_uint48",
                                                        typeString: "uint48"
                                                    }
                                                }
                                            ],
                                            expression: {
                                                argumentTypes: [
                                                    {
                                                        typeIdentifier:
                                                            "t_uint48",
                                                        typeString: "uint48"
                                                    }
                                                ],
                                                expression: {
                                                    id: 45948,
                                                    name: "ValidAfter",
                                                    nodeType: "Identifier",
                                                    overloadedDeclarations: [],
                                                    referencedDeclaration: 46106,
                                                    src: "3462:10:24",
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_type$_t_userDefinedValueType$_ValidAfter_$46106_$",
                                                        typeString:
                                                            "type(ValidAfter)"
                                                    }
                                                },
                                                id: 45949,
                                                isConstant: false,
                                                isLValue: false,
                                                isPure: true,
                                                lValueRequested: false,
                                                memberLocation: "3473:4:24",
                                                memberName: "wrap",
                                                nodeType: "MemberAccess",
                                                src: "3462:15:24",
                                                typeDescriptions: {
                                                    typeIdentifier:
                                                        "t_function_wrap_pure$_t_uint48_$returns$_t_userDefinedValueType$_ValidAfter_$46106_$",
                                                    typeString:
                                                        "function (uint48) pure returns (ValidAfter)"
                                                }
                                            },
                                            id: 45955,
                                            isConstant: false,
                                            isLValue: false,
                                            isPure: false,
                                            kind: "functionCall",
                                            lValueRequested: false,
                                            nameLocations: [],
                                            names: [],
                                            nodeType: "FunctionCall",
                                            src: "3462:40:24",
                                            tryCall: false,
                                            typeDescriptions: {
                                                typeIdentifier:
                                                    "t_userDefinedValueType$_ValidAfter_$46106",
                                                typeString: "ValidAfter"
                                            }
                                        },
                                        nodeType:
                                            "VariableDeclarationStatement",
                                        src: "3438:64:24"
                                    },
                                    {
                                        assignments: [45959],
                                        declarations: [
                                            {
                                                constant: false,
                                                id: 45959,
                                                mutability: "mutable",
                                                name: "validUntil",
                                                nameLocation: "3524:10:24",
                                                nodeType: "VariableDeclaration",
                                                scope: 45991,
                                                src: "3513:21:24",
                                                stateVariable: false,
                                                storageLocation: "default",
                                                typeDescriptions: {
                                                    typeIdentifier:
                                                        "t_userDefinedValueType$_ValidUntil_$46108",
                                                    typeString: "ValidUntil"
                                                },
                                                typeName: {
                                                    id: 45958,
                                                    nodeType:
                                                        "UserDefinedTypeName",
                                                    pathNode: {
                                                        id: 45957,
                                                        name: "ValidUntil",
                                                        nameLocations: [
                                                            "3513:10:24"
                                                        ],
                                                        nodeType:
                                                            "IdentifierPath",
                                                        referencedDeclaration: 46108,
                                                        src: "3513:10:24"
                                                    },
                                                    referencedDeclaration: 46108,
                                                    src: "3513:10:24",
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_userDefinedValueType$_ValidUntil_$46108",
                                                        typeString: "ValidUntil"
                                                    }
                                                },
                                                visibility: "internal"
                                            }
                                        ],
                                        id: 45970,
                                        initialValue: {
                                            arguments: [
                                                {
                                                    arguments: [
                                                        {
                                                            commonType: {
                                                                typeIdentifier:
                                                                    "t_uint256",
                                                                typeString:
                                                                    "uint256"
                                                            },
                                                            id: 45967,
                                                            isConstant: false,
                                                            isLValue: false,
                                                            isPure: false,
                                                            lValueRequested: false,
                                                            leftExpression: {
                                                                expression: {
                                                                    id: 45964,
                                                                    name: "block",
                                                                    nodeType:
                                                                        "Identifier",
                                                                    overloadedDeclarations:
                                                                        [],
                                                                    referencedDeclaration:
                                                                        -4,
                                                                    src: "3560:5:24",
                                                                    typeDescriptions:
                                                                        {
                                                                            typeIdentifier:
                                                                                "t_magic_block",
                                                                            typeString:
                                                                                "block"
                                                                        }
                                                                },
                                                                id: 45965,
                                                                isConstant: false,
                                                                isLValue: false,
                                                                isPure: false,
                                                                lValueRequested: false,
                                                                memberLocation:
                                                                    "3566:9:24",
                                                                memberName:
                                                                    "timestamp",
                                                                nodeType:
                                                                    "MemberAccess",
                                                                src: "3560:15:24",
                                                                typeDescriptions:
                                                                    {
                                                                        typeIdentifier:
                                                                            "t_uint256",
                                                                        typeString:
                                                                            "uint256"
                                                                    }
                                                            },
                                                            nodeType:
                                                                "BinaryOperation",
                                                            operator: "+",
                                                            rightExpression: {
                                                                hexValue: "38",
                                                                id: 45966,
                                                                isConstant: false,
                                                                isLValue: false,
                                                                isPure: true,
                                                                kind: "number",
                                                                lValueRequested: false,
                                                                nodeType:
                                                                    "Literal",
                                                                src: "3578:1:24",
                                                                typeDescriptions:
                                                                    {
                                                                        typeIdentifier:
                                                                            "t_rational_8_by_1",
                                                                        typeString:
                                                                            "int_const 8"
                                                                    },
                                                                value: "8"
                                                            },
                                                            src: "3560:19:24",
                                                            typeDescriptions: {
                                                                typeIdentifier:
                                                                    "t_uint256",
                                                                typeString:
                                                                    "uint256"
                                                            }
                                                        }
                                                    ],
                                                    expression: {
                                                        argumentTypes: [
                                                            {
                                                                typeIdentifier:
                                                                    "t_uint256",
                                                                typeString:
                                                                    "uint256"
                                                            }
                                                        ],
                                                        id: 45963,
                                                        isConstant: false,
                                                        isLValue: false,
                                                        isPure: true,
                                                        lValueRequested: false,
                                                        nodeType:
                                                            "ElementaryTypeNameExpression",
                                                        src: "3553:6:24",
                                                        typeDescriptions: {
                                                            typeIdentifier:
                                                                "t_type$_t_uint48_$",
                                                            typeString:
                                                                "type(uint48)"
                                                        },
                                                        typeName: {
                                                            id: 45962,
                                                            name: "uint48",
                                                            nodeType:
                                                                "ElementaryTypeName",
                                                            src: "3553:6:24",
                                                            typeDescriptions: {}
                                                        }
                                                    },
                                                    id: 45968,
                                                    isConstant: false,
                                                    isLValue: false,
                                                    isPure: false,
                                                    kind: "typeConversion",
                                                    lValueRequested: false,
                                                    nameLocations: [],
                                                    names: [],
                                                    nodeType: "FunctionCall",
                                                    src: "3553:27:24",
                                                    tryCall: false,
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_uint48",
                                                        typeString: "uint48"
                                                    }
                                                }
                                            ],
                                            expression: {
                                                argumentTypes: [
                                                    {
                                                        typeIdentifier:
                                                            "t_uint48",
                                                        typeString: "uint48"
                                                    }
                                                ],
                                                expression: {
                                                    id: 45960,
                                                    name: "ValidUntil",
                                                    nodeType: "Identifier",
                                                    overloadedDeclarations: [],
                                                    referencedDeclaration: 46108,
                                                    src: "3537:10:24",
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_type$_t_userDefinedValueType$_ValidUntil_$46108_$",
                                                        typeString:
                                                            "type(ValidUntil)"
                                                    }
                                                },
                                                id: 45961,
                                                isConstant: false,
                                                isLValue: false,
                                                isPure: true,
                                                lValueRequested: false,
                                                memberLocation: "3548:4:24",
                                                memberName: "wrap",
                                                nodeType: "MemberAccess",
                                                src: "3537:15:24",
                                                typeDescriptions: {
                                                    typeIdentifier:
                                                        "t_function_wrap_pure$_t_uint48_$returns$_t_userDefinedValueType$_ValidUntil_$46108_$",
                                                    typeString:
                                                        "function (uint48) pure returns (ValidUntil)"
                                                }
                                            },
                                            id: 45969,
                                            isConstant: false,
                                            isLValue: false,
                                            isPure: false,
                                            kind: "functionCall",
                                            lValueRequested: false,
                                            nameLocations: [],
                                            names: [],
                                            nodeType: "FunctionCall",
                                            src: "3537:44:24",
                                            tryCall: false,
                                            typeDescriptions: {
                                                typeIdentifier:
                                                    "t_userDefinedValueType$_ValidUntil_$46108",
                                                typeString: "ValidUntil"
                                            }
                                        },
                                        nodeType:
                                            "VariableDeclarationStatement",
                                        src: "3513:68:24"
                                    },
                                    {
                                        eventCall: {
                                            arguments: [
                                                {
                                                    arguments: [
                                                        {
                                                            expression: {
                                                                id: 45974,
                                                                name: "block",
                                                                nodeType:
                                                                    "Identifier",
                                                                overloadedDeclarations:
                                                                    [],
                                                                referencedDeclaration:
                                                                    -4,
                                                                src: "3614:5:24",
                                                                typeDescriptions:
                                                                    {
                                                                        typeIdentifier:
                                                                            "t_magic_block",
                                                                        typeString:
                                                                            "block"
                                                                    }
                                                            },
                                                            id: 45975,
                                                            isConstant: false,
                                                            isLValue: false,
                                                            isPure: false,
                                                            lValueRequested: false,
                                                            memberLocation:
                                                                "3620:9:24",
                                                            memberName:
                                                                "timestamp",
                                                            nodeType:
                                                                "MemberAccess",
                                                            src: "3614:15:24",
                                                            typeDescriptions: {
                                                                typeIdentifier:
                                                                    "t_uint256",
                                                                typeString:
                                                                    "uint256"
                                                            }
                                                        }
                                                    ],
                                                    expression: {
                                                        argumentTypes: [
                                                            {
                                                                typeIdentifier:
                                                                    "t_uint256",
                                                                typeString:
                                                                    "uint256"
                                                            }
                                                        ],
                                                        id: 45973,
                                                        isConstant: false,
                                                        isLValue: false,
                                                        isPure: true,
                                                        lValueRequested: false,
                                                        nodeType:
                                                            "ElementaryTypeNameExpression",
                                                        src: "3607:6:24",
                                                        typeDescriptions: {
                                                            typeIdentifier:
                                                                "t_type$_t_uint48_$",
                                                            typeString:
                                                                "type(uint48)"
                                                        },
                                                        typeName: {
                                                            id: 45972,
                                                            name: "uint48",
                                                            nodeType:
                                                                "ElementaryTypeName",
                                                            src: "3607:6:24",
                                                            typeDescriptions: {}
                                                        }
                                                    },
                                                    id: 45976,
                                                    isConstant: false,
                                                    isLValue: false,
                                                    isPure: false,
                                                    kind: "typeConversion",
                                                    lValueRequested: false,
                                                    nameLocations: [],
                                                    names: [],
                                                    nodeType: "FunctionCall",
                                                    src: "3607:23:24",
                                                    tryCall: false,
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_uint48",
                                                        typeString: "uint48"
                                                    }
                                                },
                                                {
                                                    arguments: [
                                                        {
                                                            commonType: {
                                                                typeIdentifier:
                                                                    "t_uint256",
                                                                typeString:
                                                                    "uint256"
                                                            },
                                                            id: 45982,
                                                            isConstant: false,
                                                            isLValue: false,
                                                            isPure: false,
                                                            lValueRequested: false,
                                                            leftExpression: {
                                                                expression: {
                                                                    id: 45979,
                                                                    name: "block",
                                                                    nodeType:
                                                                        "Identifier",
                                                                    overloadedDeclarations:
                                                                        [],
                                                                    referencedDeclaration:
                                                                        -4,
                                                                    src: "3639:5:24",
                                                                    typeDescriptions:
                                                                        {
                                                                            typeIdentifier:
                                                                                "t_magic_block",
                                                                            typeString:
                                                                                "block"
                                                                        }
                                                                },
                                                                id: 45980,
                                                                isConstant: false,
                                                                isLValue: false,
                                                                isPure: false,
                                                                lValueRequested: false,
                                                                memberLocation:
                                                                    "3645:9:24",
                                                                memberName:
                                                                    "timestamp",
                                                                nodeType:
                                                                    "MemberAccess",
                                                                src: "3639:15:24",
                                                                typeDescriptions:
                                                                    {
                                                                        typeIdentifier:
                                                                            "t_uint256",
                                                                        typeString:
                                                                            "uint256"
                                                                    }
                                                            },
                                                            nodeType:
                                                                "BinaryOperation",
                                                            operator: "+",
                                                            rightExpression: {
                                                                hexValue: "38",
                                                                id: 45981,
                                                                isConstant: false,
                                                                isLValue: false,
                                                                isPure: true,
                                                                kind: "number",
                                                                lValueRequested: false,
                                                                nodeType:
                                                                    "Literal",
                                                                src: "3657:1:24",
                                                                typeDescriptions:
                                                                    {
                                                                        typeIdentifier:
                                                                            "t_rational_8_by_1",
                                                                        typeString:
                                                                            "int_const 8"
                                                                    },
                                                                value: "8"
                                                            },
                                                            src: "3639:19:24",
                                                            typeDescriptions: {
                                                                typeIdentifier:
                                                                    "t_uint256",
                                                                typeString:
                                                                    "uint256"
                                                            }
                                                        }
                                                    ],
                                                    expression: {
                                                        argumentTypes: [
                                                            {
                                                                typeIdentifier:
                                                                    "t_uint256",
                                                                typeString:
                                                                    "uint256"
                                                            }
                                                        ],
                                                        id: 45978,
                                                        isConstant: false,
                                                        isLValue: false,
                                                        isPure: true,
                                                        lValueRequested: false,
                                                        nodeType:
                                                            "ElementaryTypeNameExpression",
                                                        src: "3632:6:24",
                                                        typeDescriptions: {
                                                            typeIdentifier:
                                                                "t_type$_t_uint48_$",
                                                            typeString:
                                                                "type(uint48)"
                                                        },
                                                        typeName: {
                                                            id: 45977,
                                                            name: "uint48",
                                                            nodeType:
                                                                "ElementaryTypeName",
                                                            src: "3632:6:24",
                                                            typeDescriptions: {}
                                                        }
                                                    },
                                                    id: 45983,
                                                    isConstant: false,
                                                    isLValue: false,
                                                    isPure: false,
                                                    kind: "typeConversion",
                                                    lValueRequested: false,
                                                    nameLocations: [],
                                                    names: [],
                                                    nodeType: "FunctionCall",
                                                    src: "3632:27:24",
                                                    tryCall: false,
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_uint48",
                                                        typeString: "uint48"
                                                    }
                                                }
                                            ],
                                            expression: {
                                                argumentTypes: [
                                                    {
                                                        typeIdentifier:
                                                            "t_uint48",
                                                        typeString: "uint48"
                                                    },
                                                    {
                                                        typeIdentifier:
                                                            "t_uint48",
                                                        typeString: "uint48"
                                                    }
                                                ],
                                                id: 45971,
                                                name: "Validation",
                                                nodeType: "Identifier",
                                                overloadedDeclarations: [],
                                                referencedDeclaration: 45661,
                                                src: "3596:10:24",
                                                typeDescriptions: {
                                                    typeIdentifier:
                                                        "t_function_event_nonpayable$_t_uint48_$_t_uint48_$returns$__$",
                                                    typeString:
                                                        "function (uint48,uint48)"
                                                }
                                            },
                                            id: 45984,
                                            isConstant: false,
                                            isLValue: false,
                                            isPure: false,
                                            kind: "functionCall",
                                            lValueRequested: false,
                                            nameLocations: [],
                                            names: [],
                                            nodeType: "FunctionCall",
                                            src: "3596:64:24",
                                            tryCall: false,
                                            typeDescriptions: {
                                                typeIdentifier: "t_tuple$__$",
                                                typeString: "tuple()"
                                            }
                                        },
                                        id: 45985,
                                        nodeType: "EmitStatement",
                                        src: "3591:69:24"
                                    },
                                    {
                                        expression: {
                                            arguments: [
                                                {
                                                    id: 45987,
                                                    name: "validAfter",
                                                    nodeType: "Identifier",
                                                    overloadedDeclarations: [],
                                                    referencedDeclaration: 45947,
                                                    src: "3697:10:24",
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_userDefinedValueType$_ValidAfter_$46106",
                                                        typeString: "ValidAfter"
                                                    }
                                                },
                                                {
                                                    id: 45988,
                                                    name: "validUntil",
                                                    nodeType: "Identifier",
                                                    overloadedDeclarations: [],
                                                    referencedDeclaration: 45959,
                                                    src: "3709:10:24",
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_userDefinedValueType$_ValidUntil_$46108",
                                                        typeString: "ValidUntil"
                                                    }
                                                }
                                            ],
                                            expression: {
                                                argumentTypes: [
                                                    {
                                                        typeIdentifier:
                                                            "t_userDefinedValueType$_ValidAfter_$46106",
                                                        typeString: "ValidAfter"
                                                    },
                                                    {
                                                        typeIdentifier:
                                                            "t_userDefinedValueType$_ValidUntil_$46108",
                                                        typeString: "ValidUntil"
                                                    }
                                                ],
                                                id: 45986,
                                                name: "packValidationData",
                                                nodeType: "Identifier",
                                                overloadedDeclarations: [],
                                                referencedDeclaration: 46146,
                                                src: "3678:18:24",
                                                typeDescriptions: {
                                                    typeIdentifier:
                                                        "t_function_internal_pure$_t_userDefinedValueType$_ValidAfter_$46106_$_t_userDefinedValueType$_ValidUntil_$46108_$returns$_t_userDefinedValueType$_ValidationData_$46110_$",
                                                    typeString:
                                                        "function (ValidAfter,ValidUntil) pure returns (ValidationData)"
                                                }
                                            },
                                            id: 45989,
                                            isConstant: false,
                                            isLValue: false,
                                            isPure: false,
                                            kind: "functionCall",
                                            lValueRequested: false,
                                            nameLocations: [],
                                            names: [],
                                            nodeType: "FunctionCall",
                                            src: "3678:42:24",
                                            tryCall: false,
                                            typeDescriptions: {
                                                typeIdentifier:
                                                    "t_userDefinedValueType$_ValidationData_$46110",
                                                typeString: "ValidationData"
                                            }
                                        },
                                        functionReturnParameters: 45817,
                                        id: 45990,
                                        nodeType: "Return",
                                        src: "3671:49:24"
                                    }
                                ]
                            },
                            baseFunctions: [46082],
                            functionSelector: "3a871cdd",
                            implemented: true,
                            kind: "function",
                            modifiers: [],
                            name: "validateUserOp",
                            nameLocation: "2072:14:24",
                            overrides: {
                                id: 45813,
                                nodeType: "OverrideSpecifier",
                                overrides: [],
                                src: "2204:8:24"
                            },
                            parameters: {
                                id: 45812,
                                nodeType: "ParameterList",
                                parameters: [
                                    {
                                        constant: false,
                                        id: 45807,
                                        mutability: "mutable",
                                        name: "_userOp",
                                        nameLocation: "2119:7:24",
                                        nodeType: "VariableDeclaration",
                                        scope: 45992,
                                        src: "2096:30:24",
                                        stateVariable: false,
                                        storageLocation: "calldata",
                                        typeDescriptions: {
                                            typeIdentifier:
                                                "t_struct$_UserOperation_$46188_calldata_ptr",
                                            typeString: "struct UserOperation"
                                        },
                                        typeName: {
                                            id: 45806,
                                            nodeType: "UserDefinedTypeName",
                                            pathNode: {
                                                id: 45805,
                                                name: "UserOperation",
                                                nameLocations: ["2096:13:24"],
                                                nodeType: "IdentifierPath",
                                                referencedDeclaration: 46188,
                                                src: "2096:13:24"
                                            },
                                            referencedDeclaration: 46188,
                                            src: "2096:13:24",
                                            typeDescriptions: {
                                                typeIdentifier:
                                                    "t_struct$_UserOperation_$46188_storage_ptr",
                                                typeString:
                                                    "struct UserOperation"
                                            }
                                        },
                                        visibility: "internal"
                                    },
                                    {
                                        constant: false,
                                        id: 45809,
                                        mutability: "mutable",
                                        name: "_userOpHash",
                                        nameLocation: "2144:11:24",
                                        nodeType: "VariableDeclaration",
                                        scope: 45992,
                                        src: "2136:19:24",
                                        stateVariable: false,
                                        storageLocation: "default",
                                        typeDescriptions: {
                                            typeIdentifier: "t_bytes32",
                                            typeString: "bytes32"
                                        },
                                        typeName: {
                                            id: 45808,
                                            name: "bytes32",
                                            nodeType: "ElementaryTypeName",
                                            src: "2136:7:24",
                                            typeDescriptions: {
                                                typeIdentifier: "t_bytes32",
                                                typeString: "bytes32"
                                            }
                                        },
                                        visibility: "internal"
                                    },
                                    {
                                        constant: false,
                                        id: 45811,
                                        mutability: "mutable",
                                        name: "proofId",
                                        nameLocation: "2173:7:24",
                                        nodeType: "VariableDeclaration",
                                        scope: 45992,
                                        src: "2165:15:24",
                                        stateVariable: false,
                                        storageLocation: "default",
                                        typeDescriptions: {
                                            typeIdentifier: "t_uint256",
                                            typeString: "uint256"
                                        },
                                        typeName: {
                                            id: 45810,
                                            name: "uint256",
                                            nodeType: "ElementaryTypeName",
                                            src: "2165:7:24",
                                            typeDescriptions: {
                                                typeIdentifier: "t_uint256",
                                                typeString: "uint256"
                                            }
                                        },
                                        visibility: "internal"
                                    }
                                ],
                                src: "2086:100:24"
                            },
                            returnParameters: {
                                id: 45817,
                                nodeType: "ParameterList",
                                parameters: [
                                    {
                                        constant: false,
                                        id: 45816,
                                        mutability: "mutable",
                                        name: "",
                                        nameLocation: "-1:-1:-1",
                                        nodeType: "VariableDeclaration",
                                        scope: 45992,
                                        src: "2222:14:24",
                                        stateVariable: false,
                                        storageLocation: "default",
                                        typeDescriptions: {
                                            typeIdentifier:
                                                "t_userDefinedValueType$_ValidationData_$46110",
                                            typeString: "ValidationData"
                                        },
                                        typeName: {
                                            id: 45815,
                                            nodeType: "UserDefinedTypeName",
                                            pathNode: {
                                                id: 45814,
                                                name: "ValidationData",
                                                nameLocations: ["2222:14:24"],
                                                nodeType: "IdentifierPath",
                                                referencedDeclaration: 46110,
                                                src: "2222:14:24"
                                            },
                                            referencedDeclaration: 46110,
                                            src: "2222:14:24",
                                            typeDescriptions: {
                                                typeIdentifier:
                                                    "t_userDefinedValueType$_ValidationData_$46110",
                                                typeString: "ValidationData"
                                            }
                                        },
                                        visibility: "internal"
                                    }
                                ],
                                src: "2221:16:24"
                            },
                            scope: 46052,
                            stateMutability: "payable",
                            virtual: false,
                            visibility: "external"
                        },
                        {
                            id: 46028,
                            nodeType: "FunctionDefinition",
                            src: "3733:747:24",
                            nodes: [],
                            body: {
                                id: 46027,
                                nodeType: "Block",
                                src: "3903:577:24",
                                nodes: [],
                                statements: [
                                    {
                                        expression: {
                                            arguments: [
                                                {
                                                    commonType: {
                                                        typeIdentifier:
                                                            "t_uint256",
                                                        typeString: "uint256"
                                                    },
                                                    id: 46013,
                                                    isConstant: false,
                                                    isLValue: false,
                                                    isPure: false,
                                                    lValueRequested: false,
                                                    leftExpression: {
                                                        expression: {
                                                            id: 46010,
                                                            name: "signatures",
                                                            nodeType:
                                                                "Identifier",
                                                            overloadedDeclarations:
                                                                [],
                                                            referencedDeclaration: 45994,
                                                            src: "3921:10:24",
                                                            typeDescriptions: {
                                                                typeIdentifier:
                                                                    "t_bytes_memory_ptr",
                                                                typeString:
                                                                    "bytes memory"
                                                            }
                                                        },
                                                        id: 46011,
                                                        isConstant: false,
                                                        isLValue: false,
                                                        isPure: false,
                                                        lValueRequested: false,
                                                        memberLocation:
                                                            "3932:6:24",
                                                        memberName: "length",
                                                        nodeType:
                                                            "MemberAccess",
                                                        src: "3921:17:24",
                                                        typeDescriptions: {
                                                            typeIdentifier:
                                                                "t_uint256",
                                                            typeString:
                                                                "uint256"
                                                        }
                                                    },
                                                    nodeType: "BinaryOperation",
                                                    operator: "==",
                                                    rightExpression: {
                                                        hexValue: "313330",
                                                        id: 46012,
                                                        isConstant: false,
                                                        isLValue: false,
                                                        isPure: true,
                                                        kind: "number",
                                                        lValueRequested: false,
                                                        nodeType: "Literal",
                                                        src: "3942:3:24",
                                                        typeDescriptions: {
                                                            typeIdentifier:
                                                                "t_rational_130_by_1",
                                                            typeString:
                                                                "int_const 130"
                                                        },
                                                        value: "130"
                                                    },
                                                    src: "3921:24:24",
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_bool",
                                                        typeString: "bool"
                                                    }
                                                },
                                                {
                                                    hexValue:
                                                        "5369676e617475726573206c656e677468206d75737420626520313330206279746573",
                                                    id: 46014,
                                                    isConstant: false,
                                                    isLValue: false,
                                                    isPure: true,
                                                    kind: "string",
                                                    lValueRequested: false,
                                                    nodeType: "Literal",
                                                    src: "3947:37:24",
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_stringliteral_3fc9ef5970fba622e9a2bcb300992a7b508fb3c086cb7133a790c25fb34d60eb",
                                                        typeString:
                                                            'literal_string "Signatures length must be 130 bytes"'
                                                    },
                                                    value: "Signatures length must be 130 bytes"
                                                }
                                            ],
                                            expression: {
                                                argumentTypes: [
                                                    {
                                                        typeIdentifier:
                                                            "t_bool",
                                                        typeString: "bool"
                                                    },
                                                    {
                                                        typeIdentifier:
                                                            "t_stringliteral_3fc9ef5970fba622e9a2bcb300992a7b508fb3c086cb7133a790c25fb34d60eb",
                                                        typeString:
                                                            'literal_string "Signatures length must be 130 bytes"'
                                                    }
                                                ],
                                                id: 46009,
                                                name: "require",
                                                nodeType: "Identifier",
                                                overloadedDeclarations: [
                                                    -18, -18
                                                ],
                                                referencedDeclaration: -18,
                                                src: "3913:7:24",
                                                typeDescriptions: {
                                                    typeIdentifier:
                                                        "t_function_require_pure$_t_bool_$_t_string_memory_ptr_$returns$__$",
                                                    typeString:
                                                        "function (bool,string memory) pure"
                                                }
                                            },
                                            id: 46015,
                                            isConstant: false,
                                            isLValue: false,
                                            isPure: false,
                                            kind: "functionCall",
                                            lValueRequested: false,
                                            nameLocations: [],
                                            names: [],
                                            nodeType: "FunctionCall",
                                            src: "3913:72:24",
                                            tryCall: false,
                                            typeDescriptions: {
                                                typeIdentifier: "t_tuple$__$",
                                                typeString: "tuple()"
                                            }
                                        },
                                        id: 46016,
                                        nodeType: "ExpressionStatement",
                                        src: "3913:72:24"
                                    },
                                    {
                                        AST: {
                                            nativeSrc: "4042:155:24",
                                            nodeType: "YulBlock",
                                            src: "4042:155:24",
                                            statements: [
                                                {
                                                    nativeSrc: "4056:32:24",
                                                    nodeType: "YulAssignment",
                                                    src: "4056:32:24",
                                                    value: {
                                                        arguments: [
                                                            {
                                                                arguments: [
                                                                    {
                                                                        name: "signatures",
                                                                        nativeSrc:
                                                                            "4072:10:24",
                                                                        nodeType:
                                                                            "YulIdentifier",
                                                                        src: "4072:10:24"
                                                                    },
                                                                    {
                                                                        kind: "number",
                                                                        nativeSrc:
                                                                            "4084:2:24",
                                                                        nodeType:
                                                                            "YulLiteral",
                                                                        src: "4084:2:24",
                                                                        type: "",
                                                                        value: "32"
                                                                    }
                                                                ],
                                                                functionName: {
                                                                    name: "add",
                                                                    nativeSrc:
                                                                        "4068:3:24",
                                                                    nodeType:
                                                                        "YulIdentifier",
                                                                    src: "4068:3:24"
                                                                },
                                                                nativeSrc:
                                                                    "4068:19:24",
                                                                nodeType:
                                                                    "YulFunctionCall",
                                                                src: "4068:19:24"
                                                            }
                                                        ],
                                                        functionName: {
                                                            name: "mload",
                                                            nativeSrc:
                                                                "4062:5:24",
                                                            nodeType:
                                                                "YulIdentifier",
                                                            src: "4062:5:24"
                                                        },
                                                        nativeSrc: "4062:26:24",
                                                        nodeType:
                                                            "YulFunctionCall",
                                                        src: "4062:26:24"
                                                    },
                                                    variableNames: [
                                                        {
                                                            name: "r1",
                                                            nativeSrc:
                                                                "4056:2:24",
                                                            nodeType:
                                                                "YulIdentifier",
                                                            src: "4056:2:24"
                                                        }
                                                    ]
                                                },
                                                {
                                                    nativeSrc: "4101:32:24",
                                                    nodeType: "YulAssignment",
                                                    src: "4101:32:24",
                                                    value: {
                                                        arguments: [
                                                            {
                                                                arguments: [
                                                                    {
                                                                        name: "signatures",
                                                                        nativeSrc:
                                                                            "4117:10:24",
                                                                        nodeType:
                                                                            "YulIdentifier",
                                                                        src: "4117:10:24"
                                                                    },
                                                                    {
                                                                        kind: "number",
                                                                        nativeSrc:
                                                                            "4129:2:24",
                                                                        nodeType:
                                                                            "YulLiteral",
                                                                        src: "4129:2:24",
                                                                        type: "",
                                                                        value: "64"
                                                                    }
                                                                ],
                                                                functionName: {
                                                                    name: "add",
                                                                    nativeSrc:
                                                                        "4113:3:24",
                                                                    nodeType:
                                                                        "YulIdentifier",
                                                                    src: "4113:3:24"
                                                                },
                                                                nativeSrc:
                                                                    "4113:19:24",
                                                                nodeType:
                                                                    "YulFunctionCall",
                                                                src: "4113:19:24"
                                                            }
                                                        ],
                                                        functionName: {
                                                            name: "mload",
                                                            nativeSrc:
                                                                "4107:5:24",
                                                            nodeType:
                                                                "YulIdentifier",
                                                            src: "4107:5:24"
                                                        },
                                                        nativeSrc: "4107:26:24",
                                                        nodeType:
                                                            "YulFunctionCall",
                                                        src: "4107:26:24"
                                                    },
                                                    variableNames: [
                                                        {
                                                            name: "s1",
                                                            nativeSrc:
                                                                "4101:2:24",
                                                            nodeType:
                                                                "YulIdentifier",
                                                            src: "4101:2:24"
                                                        }
                                                    ]
                                                },
                                                {
                                                    nativeSrc: "4146:41:24",
                                                    nodeType: "YulAssignment",
                                                    src: "4146:41:24",
                                                    value: {
                                                        arguments: [
                                                            {
                                                                kind: "number",
                                                                nativeSrc:
                                                                    "4157:1:24",
                                                                nodeType:
                                                                    "YulLiteral",
                                                                src: "4157:1:24",
                                                                type: "",
                                                                value: "0"
                                                            },
                                                            {
                                                                arguments: [
                                                                    {
                                                                        arguments:
                                                                            [
                                                                                {
                                                                                    name: "signatures",
                                                                                    nativeSrc:
                                                                                        "4170:10:24",
                                                                                    nodeType:
                                                                                        "YulIdentifier",
                                                                                    src: "4170:10:24"
                                                                                },
                                                                                {
                                                                                    kind: "number",
                                                                                    nativeSrc:
                                                                                        "4182:2:24",
                                                                                    nodeType:
                                                                                        "YulLiteral",
                                                                                    src: "4182:2:24",
                                                                                    type: "",
                                                                                    value: "96"
                                                                                }
                                                                            ],
                                                                        functionName:
                                                                            {
                                                                                name: "add",
                                                                                nativeSrc:
                                                                                    "4166:3:24",
                                                                                nodeType:
                                                                                    "YulIdentifier",
                                                                                src: "4166:3:24"
                                                                            },
                                                                        nativeSrc:
                                                                            "4166:19:24",
                                                                        nodeType:
                                                                            "YulFunctionCall",
                                                                        src: "4166:19:24"
                                                                    }
                                                                ],
                                                                functionName: {
                                                                    name: "mload",
                                                                    nativeSrc:
                                                                        "4160:5:24",
                                                                    nodeType:
                                                                        "YulIdentifier",
                                                                    src: "4160:5:24"
                                                                },
                                                                nativeSrc:
                                                                    "4160:26:24",
                                                                nodeType:
                                                                    "YulFunctionCall",
                                                                src: "4160:26:24"
                                                            }
                                                        ],
                                                        functionName: {
                                                            name: "byte",
                                                            nativeSrc:
                                                                "4152:4:24",
                                                            nodeType:
                                                                "YulIdentifier",
                                                            src: "4152:4:24"
                                                        },
                                                        nativeSrc: "4152:35:24",
                                                        nodeType:
                                                            "YulFunctionCall",
                                                        src: "4152:35:24"
                                                    },
                                                    variableNames: [
                                                        {
                                                            name: "v1",
                                                            nativeSrc:
                                                                "4146:2:24",
                                                            nodeType:
                                                                "YulIdentifier",
                                                            src: "4146:2:24"
                                                        }
                                                    ]
                                                }
                                            ]
                                        },
                                        evmVersion: "paris",
                                        externalReferences: [
                                            {
                                                declaration: 45999,
                                                isOffset: false,
                                                isSlot: false,
                                                src: "4056:2:24",
                                                valueSize: 1
                                            },
                                            {
                                                declaration: 46001,
                                                isOffset: false,
                                                isSlot: false,
                                                src: "4101:2:24",
                                                valueSize: 1
                                            },
                                            {
                                                declaration: 45994,
                                                isOffset: false,
                                                isSlot: false,
                                                src: "4072:10:24",
                                                valueSize: 1
                                            },
                                            {
                                                declaration: 45994,
                                                isOffset: false,
                                                isSlot: false,
                                                src: "4117:10:24",
                                                valueSize: 1
                                            },
                                            {
                                                declaration: 45994,
                                                isOffset: false,
                                                isSlot: false,
                                                src: "4170:10:24",
                                                valueSize: 1
                                            },
                                            {
                                                declaration: 45997,
                                                isOffset: false,
                                                isSlot: false,
                                                src: "4146:2:24",
                                                valueSize: 1
                                            }
                                        ],
                                        id: 46017,
                                        nodeType: "InlineAssembly",
                                        src: "4033:164:24"
                                    },
                                    {
                                        AST: {
                                            nativeSrc: "4275:157:24",
                                            nodeType: "YulBlock",
                                            src: "4275:157:24",
                                            statements: [
                                                {
                                                    nativeSrc: "4289:32:24",
                                                    nodeType: "YulAssignment",
                                                    src: "4289:32:24",
                                                    value: {
                                                        arguments: [
                                                            {
                                                                arguments: [
                                                                    {
                                                                        name: "signatures",
                                                                        nativeSrc:
                                                                            "4305:10:24",
                                                                        nodeType:
                                                                            "YulIdentifier",
                                                                        src: "4305:10:24"
                                                                    },
                                                                    {
                                                                        kind: "number",
                                                                        nativeSrc:
                                                                            "4317:2:24",
                                                                        nodeType:
                                                                            "YulLiteral",
                                                                        src: "4317:2:24",
                                                                        type: "",
                                                                        value: "97"
                                                                    }
                                                                ],
                                                                functionName: {
                                                                    name: "add",
                                                                    nativeSrc:
                                                                        "4301:3:24",
                                                                    nodeType:
                                                                        "YulIdentifier",
                                                                    src: "4301:3:24"
                                                                },
                                                                nativeSrc:
                                                                    "4301:19:24",
                                                                nodeType:
                                                                    "YulFunctionCall",
                                                                src: "4301:19:24"
                                                            }
                                                        ],
                                                        functionName: {
                                                            name: "mload",
                                                            nativeSrc:
                                                                "4295:5:24",
                                                            nodeType:
                                                                "YulIdentifier",
                                                            src: "4295:5:24"
                                                        },
                                                        nativeSrc: "4295:26:24",
                                                        nodeType:
                                                            "YulFunctionCall",
                                                        src: "4295:26:24"
                                                    },
                                                    variableNames: [
                                                        {
                                                            name: "r2",
                                                            nativeSrc:
                                                                "4289:2:24",
                                                            nodeType:
                                                                "YulIdentifier",
                                                            src: "4289:2:24"
                                                        }
                                                    ]
                                                },
                                                {
                                                    nativeSrc: "4334:33:24",
                                                    nodeType: "YulAssignment",
                                                    src: "4334:33:24",
                                                    value: {
                                                        arguments: [
                                                            {
                                                                arguments: [
                                                                    {
                                                                        name: "signatures",
                                                                        nativeSrc:
                                                                            "4350:10:24",
                                                                        nodeType:
                                                                            "YulIdentifier",
                                                                        src: "4350:10:24"
                                                                    },
                                                                    {
                                                                        kind: "number",
                                                                        nativeSrc:
                                                                            "4362:3:24",
                                                                        nodeType:
                                                                            "YulLiteral",
                                                                        src: "4362:3:24",
                                                                        type: "",
                                                                        value: "129"
                                                                    }
                                                                ],
                                                                functionName: {
                                                                    name: "add",
                                                                    nativeSrc:
                                                                        "4346:3:24",
                                                                    nodeType:
                                                                        "YulIdentifier",
                                                                    src: "4346:3:24"
                                                                },
                                                                nativeSrc:
                                                                    "4346:20:24",
                                                                nodeType:
                                                                    "YulFunctionCall",
                                                                src: "4346:20:24"
                                                            }
                                                        ],
                                                        functionName: {
                                                            name: "mload",
                                                            nativeSrc:
                                                                "4340:5:24",
                                                            nodeType:
                                                                "YulIdentifier",
                                                            src: "4340:5:24"
                                                        },
                                                        nativeSrc: "4340:27:24",
                                                        nodeType:
                                                            "YulFunctionCall",
                                                        src: "4340:27:24"
                                                    },
                                                    variableNames: [
                                                        {
                                                            name: "s2",
                                                            nativeSrc:
                                                                "4334:2:24",
                                                            nodeType:
                                                                "YulIdentifier",
                                                            src: "4334:2:24"
                                                        }
                                                    ]
                                                },
                                                {
                                                    nativeSrc: "4380:42:24",
                                                    nodeType: "YulAssignment",
                                                    src: "4380:42:24",
                                                    value: {
                                                        arguments: [
                                                            {
                                                                kind: "number",
                                                                nativeSrc:
                                                                    "4391:1:24",
                                                                nodeType:
                                                                    "YulLiteral",
                                                                src: "4391:1:24",
                                                                type: "",
                                                                value: "0"
                                                            },
                                                            {
                                                                arguments: [
                                                                    {
                                                                        arguments:
                                                                            [
                                                                                {
                                                                                    name: "signatures",
                                                                                    nativeSrc:
                                                                                        "4404:10:24",
                                                                                    nodeType:
                                                                                        "YulIdentifier",
                                                                                    src: "4404:10:24"
                                                                                },
                                                                                {
                                                                                    kind: "number",
                                                                                    nativeSrc:
                                                                                        "4416:3:24",
                                                                                    nodeType:
                                                                                        "YulLiteral",
                                                                                    src: "4416:3:24",
                                                                                    type: "",
                                                                                    value: "161"
                                                                                }
                                                                            ],
                                                                        functionName:
                                                                            {
                                                                                name: "add",
                                                                                nativeSrc:
                                                                                    "4400:3:24",
                                                                                nodeType:
                                                                                    "YulIdentifier",
                                                                                src: "4400:3:24"
                                                                            },
                                                                        nativeSrc:
                                                                            "4400:20:24",
                                                                        nodeType:
                                                                            "YulFunctionCall",
                                                                        src: "4400:20:24"
                                                                    }
                                                                ],
                                                                functionName: {
                                                                    name: "mload",
                                                                    nativeSrc:
                                                                        "4394:5:24",
                                                                    nodeType:
                                                                        "YulIdentifier",
                                                                    src: "4394:5:24"
                                                                },
                                                                nativeSrc:
                                                                    "4394:27:24",
                                                                nodeType:
                                                                    "YulFunctionCall",
                                                                src: "4394:27:24"
                                                            }
                                                        ],
                                                        functionName: {
                                                            name: "byte",
                                                            nativeSrc:
                                                                "4386:4:24",
                                                            nodeType:
                                                                "YulIdentifier",
                                                            src: "4386:4:24"
                                                        },
                                                        nativeSrc: "4386:36:24",
                                                        nodeType:
                                                            "YulFunctionCall",
                                                        src: "4386:36:24"
                                                    },
                                                    variableNames: [
                                                        {
                                                            name: "v2",
                                                            nativeSrc:
                                                                "4380:2:24",
                                                            nodeType:
                                                                "YulIdentifier",
                                                            src: "4380:2:24"
                                                        }
                                                    ]
                                                }
                                            ]
                                        },
                                        evmVersion: "paris",
                                        externalReferences: [
                                            {
                                                declaration: 46005,
                                                isOffset: false,
                                                isSlot: false,
                                                src: "4289:2:24",
                                                valueSize: 1
                                            },
                                            {
                                                declaration: 46007,
                                                isOffset: false,
                                                isSlot: false,
                                                src: "4334:2:24",
                                                valueSize: 1
                                            },
                                            {
                                                declaration: 45994,
                                                isOffset: false,
                                                isSlot: false,
                                                src: "4305:10:24",
                                                valueSize: 1
                                            },
                                            {
                                                declaration: 45994,
                                                isOffset: false,
                                                isSlot: false,
                                                src: "4350:10:24",
                                                valueSize: 1
                                            },
                                            {
                                                declaration: 45994,
                                                isOffset: false,
                                                isSlot: false,
                                                src: "4404:10:24",
                                                valueSize: 1
                                            },
                                            {
                                                declaration: 46003,
                                                isOffset: false,
                                                isSlot: false,
                                                src: "4380:2:24",
                                                valueSize: 1
                                            }
                                        ],
                                        id: 46018,
                                        nodeType: "InlineAssembly",
                                        src: "4266:166:24"
                                    },
                                    {
                                        expression: {
                                            components: [
                                                {
                                                    id: 46019,
                                                    name: "v1",
                                                    nodeType: "Identifier",
                                                    overloadedDeclarations: [],
                                                    referencedDeclaration: 45997,
                                                    src: "4450:2:24",
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_uint8",
                                                        typeString: "uint8"
                                                    }
                                                },
                                                {
                                                    id: 46020,
                                                    name: "r1",
                                                    nodeType: "Identifier",
                                                    overloadedDeclarations: [],
                                                    referencedDeclaration: 45999,
                                                    src: "4454:2:24",
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_bytes32",
                                                        typeString: "bytes32"
                                                    }
                                                },
                                                {
                                                    id: 46021,
                                                    name: "s1",
                                                    nodeType: "Identifier",
                                                    overloadedDeclarations: [],
                                                    referencedDeclaration: 46001,
                                                    src: "4458:2:24",
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_bytes32",
                                                        typeString: "bytes32"
                                                    }
                                                },
                                                {
                                                    id: 46022,
                                                    name: "v2",
                                                    nodeType: "Identifier",
                                                    overloadedDeclarations: [],
                                                    referencedDeclaration: 46003,
                                                    src: "4462:2:24",
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_uint8",
                                                        typeString: "uint8"
                                                    }
                                                },
                                                {
                                                    id: 46023,
                                                    name: "r2",
                                                    nodeType: "Identifier",
                                                    overloadedDeclarations: [],
                                                    referencedDeclaration: 46005,
                                                    src: "4466:2:24",
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_bytes32",
                                                        typeString: "bytes32"
                                                    }
                                                },
                                                {
                                                    id: 46024,
                                                    name: "s2",
                                                    nodeType: "Identifier",
                                                    overloadedDeclarations: [],
                                                    referencedDeclaration: 46007,
                                                    src: "4470:2:24",
                                                    typeDescriptions: {
                                                        typeIdentifier:
                                                            "t_bytes32",
                                                        typeString: "bytes32"
                                                    }
                                                }
                                            ],
                                            id: 46025,
                                            isConstant: false,
                                            isInlineArray: false,
                                            isLValue: false,
                                            isPure: false,
                                            lValueRequested: false,
                                            nodeType: "TupleExpression",
                                            src: "4449:24:24",
                                            typeDescriptions: {
                                                typeIdentifier:
                                                    "t_tuple$_t_uint8_$_t_bytes32_$_t_bytes32_$_t_uint8_$_t_bytes32_$_t_bytes32_$",
                                                typeString:
                                                    "tuple(uint8,bytes32,bytes32,uint8,bytes32,bytes32)"
                                            }
                                        },
                                        functionReturnParameters: 46008,
                                        id: 46026,
                                        nodeType: "Return",
                                        src: "4442:31:24"
                                    }
                                ]
                            },
                            implemented: true,
                            kind: "function",
                            modifiers: [],
                            name: "_splitSignatures",
                            nameLocation: "3742:16:24",
                            parameters: {
                                id: 45995,
                                nodeType: "ParameterList",
                                parameters: [
                                    {
                                        constant: false,
                                        id: 45994,
                                        mutability: "mutable",
                                        name: "signatures",
                                        nameLocation: "3772:10:24",
                                        nodeType: "VariableDeclaration",
                                        scope: 46028,
                                        src: "3759:23:24",
                                        stateVariable: false,
                                        storageLocation: "memory",
                                        typeDescriptions: {
                                            typeIdentifier:
                                                "t_bytes_memory_ptr",
                                            typeString: "bytes"
                                        },
                                        typeName: {
                                            id: 45993,
                                            name: "bytes",
                                            nodeType: "ElementaryTypeName",
                                            src: "3759:5:24",
                                            typeDescriptions: {
                                                typeIdentifier:
                                                    "t_bytes_storage_ptr",
                                                typeString: "bytes"
                                            }
                                        },
                                        visibility: "internal"
                                    }
                                ],
                                src: "3758:25:24"
                            },
                            returnParameters: {
                                id: 46008,
                                nodeType: "ParameterList",
                                parameters: [
                                    {
                                        constant: false,
                                        id: 45997,
                                        mutability: "mutable",
                                        name: "v1",
                                        nameLocation: "3837:2:24",
                                        nodeType: "VariableDeclaration",
                                        scope: 46028,
                                        src: "3831:8:24",
                                        stateVariable: false,
                                        storageLocation: "default",
                                        typeDescriptions: {
                                            typeIdentifier: "t_uint8",
                                            typeString: "uint8"
                                        },
                                        typeName: {
                                            id: 45996,
                                            name: "uint8",
                                            nodeType: "ElementaryTypeName",
                                            src: "3831:5:24",
                                            typeDescriptions: {
                                                typeIdentifier: "t_uint8",
                                                typeString: "uint8"
                                            }
                                        },
                                        visibility: "internal"
                                    },
                                    {
                                        constant: false,
                                        id: 45999,
                                        mutability: "mutable",
                                        name: "r1",
                                        nameLocation: "3849:2:24",
                                        nodeType: "VariableDeclaration",
                                        scope: 46028,
                                        src: "3841:10:24",
                                        stateVariable: false,
                                        storageLocation: "default",
                                        typeDescriptions: {
                                            typeIdentifier: "t_bytes32",
                                            typeString: "bytes32"
                                        },
                                        typeName: {
                                            id: 45998,
                                            name: "bytes32",
                                            nodeType: "ElementaryTypeName",
                                            src: "3841:7:24",
                                            typeDescriptions: {
                                                typeIdentifier: "t_bytes32",
                                                typeString: "bytes32"
                                            }
                                        },
                                        visibility: "internal"
                                    },
                                    {
                                        constant: false,
                                        id: 46001,
                                        mutability: "mutable",
                                        name: "s1",
                                        nameLocation: "3861:2:24",
                                        nodeType: "VariableDeclaration",
                                        scope: 46028,
                                        src: "3853:10:24",
                                        stateVariable: false,
                                        storageLocation: "default",
                                        typeDescriptions: {
                                            typeIdentifier: "t_bytes32",
                                            typeString: "bytes32"
                                        },
                                        typeName: {
                                            id: 46000,
                                            name: "bytes32",
                                            nodeType: "ElementaryTypeName",
                                            src: "3853:7:24",
                                            typeDescriptions: {
                                                typeIdentifier: "t_bytes32",
                                                typeString: "bytes32"
                                            }
                                        },
                                        visibility: "internal"
                                    },
                                    {
                                        constant: false,
                                        id: 46003,
                                        mutability: "mutable",
                                        name: "v2",
                                        nameLocation: "3871:2:24",
                                        nodeType: "VariableDeclaration",
                                        scope: 46028,
                                        src: "3865:8:24",
                                        stateVariable: false,
                                        storageLocation: "default",
                                        typeDescriptions: {
                                            typeIdentifier: "t_uint8",
                                            typeString: "uint8"
                                        },
                                        typeName: {
                                            id: 46002,
                                            name: "uint8",
                                            nodeType: "ElementaryTypeName",
                                            src: "3865:5:24",
                                            typeDescriptions: {
                                                typeIdentifier: "t_uint8",
                                                typeString: "uint8"
                                            }
                                        },
                                        visibility: "internal"
                                    },
                                    {
                                        constant: false,
                                        id: 46005,
                                        mutability: "mutable",
                                        name: "r2",
                                        nameLocation: "3883:2:24",
                                        nodeType: "VariableDeclaration",
                                        scope: 46028,
                                        src: "3875:10:24",
                                        stateVariable: false,
                                        storageLocation: "default",
                                        typeDescriptions: {
                                            typeIdentifier: "t_bytes32",
                                            typeString: "bytes32"
                                        },
                                        typeName: {
                                            id: 46004,
                                            name: "bytes32",
                                            nodeType: "ElementaryTypeName",
                                            src: "3875:7:24",
                                            typeDescriptions: {
                                                typeIdentifier: "t_bytes32",
                                                typeString: "bytes32"
                                            }
                                        },
                                        visibility: "internal"
                                    },
                                    {
                                        constant: false,
                                        id: 46007,
                                        mutability: "mutable",
                                        name: "s2",
                                        nameLocation: "3895:2:24",
                                        nodeType: "VariableDeclaration",
                                        scope: 46028,
                                        src: "3887:10:24",
                                        stateVariable: false,
                                        storageLocation: "default",
                                        typeDescriptions: {
                                            typeIdentifier: "t_bytes32",
                                            typeString: "bytes32"
                                        },
                                        typeName: {
                                            id: 46006,
                                            name: "bytes32",
                                            nodeType: "ElementaryTypeName",
                                            src: "3887:7:24",
                                            typeDescriptions: {
                                                typeIdentifier: "t_bytes32",
                                                typeString: "bytes32"
                                            }
                                        },
                                        visibility: "internal"
                                    }
                                ],
                                src: "3830:68:24"
                            },
                            scope: 46052,
                            stateMutability: "pure",
                            virtual: false,
                            visibility: "internal"
                        },
                        {
                            id: 46040,
                            nodeType: "FunctionDefinition",
                            src: "4486:139:24",
                            nodes: [],
                            body: {
                                id: 46039,
                                nodeType: "Block",
                                src: "4623:2:24",
                                nodes: [],
                                statements: []
                            },
                            baseFunctions: [46092],
                            functionSelector: "333daf92",
                            implemented: true,
                            kind: "function",
                            modifiers: [],
                            name: "validateSignature",
                            nameLocation: "4495:17:24",
                            overrides: {
                                id: 46034,
                                nodeType: "OverrideSpecifier",
                                overrides: [],
                                src: "4589:8:24"
                            },
                            parameters: {
                                id: 46033,
                                nodeType: "ParameterList",
                                parameters: [
                                    {
                                        constant: false,
                                        id: 46030,
                                        mutability: "mutable",
                                        name: "hash",
                                        nameLocation: "4530:4:24",
                                        nodeType: "VariableDeclaration",
                                        scope: 46040,
                                        src: "4522:12:24",
                                        stateVariable: false,
                                        storageLocation: "default",
                                        typeDescriptions: {
                                            typeIdentifier: "t_bytes32",
                                            typeString: "bytes32"
                                        },
                                        typeName: {
                                            id: 46029,
                                            name: "bytes32",
                                            nodeType: "ElementaryTypeName",
                                            src: "4522:7:24",
                                            typeDescriptions: {
                                                typeIdentifier: "t_bytes32",
                                                typeString: "bytes32"
                                            }
                                        },
                                        visibility: "internal"
                                    },
                                    {
                                        constant: false,
                                        id: 46032,
                                        mutability: "mutable",
                                        name: "signature",
                                        nameLocation: "4559:9:24",
                                        nodeType: "VariableDeclaration",
                                        scope: 46040,
                                        src: "4544:24:24",
                                        stateVariable: false,
                                        storageLocation: "calldata",
                                        typeDescriptions: {
                                            typeIdentifier:
                                                "t_bytes_calldata_ptr",
                                            typeString: "bytes"
                                        },
                                        typeName: {
                                            id: 46031,
                                            name: "bytes",
                                            nodeType: "ElementaryTypeName",
                                            src: "4544:5:24",
                                            typeDescriptions: {
                                                typeIdentifier:
                                                    "t_bytes_storage_ptr",
                                                typeString: "bytes"
                                            }
                                        },
                                        visibility: "internal"
                                    }
                                ],
                                src: "4512:62:24"
                            },
                            returnParameters: {
                                id: 46038,
                                nodeType: "ParameterList",
                                parameters: [
                                    {
                                        constant: false,
                                        id: 46037,
                                        mutability: "mutable",
                                        name: "",
                                        nameLocation: "-1:-1:-1",
                                        nodeType: "VariableDeclaration",
                                        scope: 46040,
                                        src: "4607:14:24",
                                        stateVariable: false,
                                        storageLocation: "default",
                                        typeDescriptions: {
                                            typeIdentifier:
                                                "t_userDefinedValueType$_ValidationData_$46110",
                                            typeString: "ValidationData"
                                        },
                                        typeName: {
                                            id: 46036,
                                            nodeType: "UserDefinedTypeName",
                                            pathNode: {
                                                id: 46035,
                                                name: "ValidationData",
                                                nameLocations: ["4607:14:24"],
                                                nodeType: "IdentifierPath",
                                                referencedDeclaration: 46110,
                                                src: "4607:14:24"
                                            },
                                            referencedDeclaration: 46110,
                                            src: "4607:14:24",
                                            typeDescriptions: {
                                                typeIdentifier:
                                                    "t_userDefinedValueType$_ValidationData_$46110",
                                                typeString: "ValidationData"
                                            }
                                        },
                                        visibility: "internal"
                                    }
                                ],
                                src: "4606:16:24"
                            },
                            scope: 46052,
                            stateMutability: "view",
                            virtual: false,
                            visibility: "external"
                        },
                        {
                            id: 46051,
                            nodeType: "FunctionDefinition",
                            src: "4631:120:24",
                            nodes: [],
                            body: {
                                id: 46050,
                                nodeType: "Block",
                                src: "4749:2:24",
                                nodes: [],
                                statements: []
                            },
                            baseFunctions: [46101],
                            functionSelector: "9ea9bd59",
                            implemented: true,
                            kind: "function",
                            modifiers: [],
                            name: "validCaller",
                            nameLocation: "4640:11:24",
                            overrides: {
                                id: 46046,
                                nodeType: "OverrideSpecifier",
                                overrides: [],
                                src: "4725:8:24"
                            },
                            parameters: {
                                id: 46045,
                                nodeType: "ParameterList",
                                parameters: [
                                    {
                                        constant: false,
                                        id: 46042,
                                        mutability: "mutable",
                                        name: "caller",
                                        nameLocation: "4669:6:24",
                                        nodeType: "VariableDeclaration",
                                        scope: 46051,
                                        src: "4661:14:24",
                                        stateVariable: false,
                                        storageLocation: "default",
                                        typeDescriptions: {
                                            typeIdentifier: "t_address",
                                            typeString: "address"
                                        },
                                        typeName: {
                                            id: 46041,
                                            name: "address",
                                            nodeType: "ElementaryTypeName",
                                            src: "4661:7:24",
                                            stateMutability: "nonpayable",
                                            typeDescriptions: {
                                                typeIdentifier: "t_address",
                                                typeString: "address"
                                            }
                                        },
                                        visibility: "internal"
                                    },
                                    {
                                        constant: false,
                                        id: 46044,
                                        mutability: "mutable",
                                        name: "data",
                                        nameLocation: "4700:4:24",
                                        nodeType: "VariableDeclaration",
                                        scope: 46051,
                                        src: "4685:19:24",
                                        stateVariable: false,
                                        storageLocation: "calldata",
                                        typeDescriptions: {
                                            typeIdentifier:
                                                "t_bytes_calldata_ptr",
                                            typeString: "bytes"
                                        },
                                        typeName: {
                                            id: 46043,
                                            name: "bytes",
                                            nodeType: "ElementaryTypeName",
                                            src: "4685:5:24",
                                            typeDescriptions: {
                                                typeIdentifier:
                                                    "t_bytes_storage_ptr",
                                                typeString: "bytes"
                                            }
                                        },
                                        visibility: "internal"
                                    }
                                ],
                                src: "4651:59:24"
                            },
                            returnParameters: {
                                id: 46049,
                                nodeType: "ParameterList",
                                parameters: [
                                    {
                                        constant: false,
                                        id: 46048,
                                        mutability: "mutable",
                                        name: "",
                                        nameLocation: "-1:-1:-1",
                                        nodeType: "VariableDeclaration",
                                        scope: 46051,
                                        src: "4743:4:24",
                                        stateVariable: false,
                                        storageLocation: "default",
                                        typeDescriptions: {
                                            typeIdentifier: "t_bool",
                                            typeString: "bool"
                                        },
                                        typeName: {
                                            id: 46047,
                                            name: "bool",
                                            nodeType: "ElementaryTypeName",
                                            src: "4743:4:24",
                                            typeDescriptions: {
                                                typeIdentifier: "t_bool",
                                                typeString: "bool"
                                            }
                                        },
                                        visibility: "internal"
                                    }
                                ],
                                src: "4742:6:24"
                            },
                            scope: 46052,
                            stateMutability: "view",
                            virtual: false,
                            visibility: "external"
                        }
                    ],
                    abstract: false,
                    baseContracts: [
                        {
                            baseName: {
                                id: 45654,
                                name: "IKernelValidator",
                                nameLocations: ["388:16:24"],
                                nodeType: "IdentifierPath",
                                referencedDeclaration: 46102,
                                src: "388:16:24"
                            },
                            id: 45655,
                            nodeType: "InheritanceSpecifier",
                            src: "388:16:24"
                        }
                    ],
                    canonicalName: "ProofSigValidator",
                    contractDependencies: [],
                    contractKind: "contract",
                    fullyImplemented: true,
                    linearizedBaseContracts: [46052, 46102],
                    name: "ProofSigValidator",
                    nameLocation: "367:17:24",
                    scope: 46053,
                    usedErrors: [45299, 45304, 45309, 46059],
                    usedEvents: [45661, 45673, 45679]
                }
            ],
            license: "UNLICENSED"
        },
        id: 24
    }
]
