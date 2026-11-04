// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title HSPAdapter
 * @notice Official HashKey Settlement Protocol (HSP) Adapter for Autonomous Agent Payments & A2A Settlement.
 * @dev Compliant with HashKey Chain Horizon Track 2 standards and HashKey Merchant payment rails.
 *      Website: https://hashkey-merchant.github.io/#/
 *      Network: HashKey Chain (Chain ID: 177 Mainnet / 133 Testnet)
 * 
 * Provides:
 *  1. EIP-712 cryptographic payment mandate verification for autonomous AI agents.
 *  2. Standardized HSP event emissions (`HSPMessageEmitted`, `HSPMandateCreated`, `HSPSettlementExecuted`).
 *  3. Pay-per-token escrow with deterministic zero-cutoff bounds (T_max).
 *  4. Native HSK and HashKey official ERC20 tokens (USDC / USDT).
 */

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract HSPAdapter {
    // -------------------------------------------------------------------------
    // Constants & Domain Separator
    // -------------------------------------------------------------------------
    string public constant NAME = "HashKey Settlement Protocol Adapter";
    string public constant VERSION = "1.0";
    bytes32 public constant DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );
    bytes32 public constant MANDATE_TYPEHASH = keccak256(
        "HSPPaymentMandate(bytes32 mandateId,address buyerAgent,address sellerNode,address token,uint256 maxDeposit,uint256 tMax,uint256 nonce,uint256 deadline)"
    );

    // Official HashKey Chain Mainnet Token Reference Addresses
    address public constant HSK_MAINNET_USDC = 0x054ed45810DbBAb8B27668922D110669c9D88D0a;
    address public constant HSK_MAINNET_USDT = 0xF1B50eD67A9e2CC94Ad3c477779E2d4cBfFf9029;
    address public constant HSK_MAINNET_WHSK = 0xB210D2120d57b758EE163cFfb43e73728c471Cf1;

    // Maximum protocol fee bound: 2000 bps = 20%
    uint256 public constant MAX_FEE_BPS = 2000;

    // -------------------------------------------------------------------------
    // Custom Errors
    // -------------------------------------------------------------------------
    error ZeroAddress();
    error ZeroAmount();
    error MandateExpired();
    error MandateAlreadyExists();
    error MandateNotFound();
    error MandateAlreadySettled();
    error InvalidSignature();
    error Unauthorized();
    error ConservationOfValueFailed();
    error TransferFailed();
    error Reentrancy();
    error ExceedsTMax();
    error ExcessivePayout();
    error ExcessiveFee();

    // -------------------------------------------------------------------------
    // Standard HSP Events (Indexed by HashKey Merchant off-chain explorers)
    // -------------------------------------------------------------------------
    event HSPMessageEmitted(
        bytes32 indexed topicId,
        uint8 indexed messageType,
        bytes payload
    );

    event HSPMandateCreated(
        bytes32 indexed mandateId,
        address indexed buyerAgent,
        address indexed sellerNode,
        address token,
        uint256 maxDeposit,
        uint256 tMax,
        string modelId
    );

    event HSPSettlementExecuted(
        bytes32 indexed mandateId,
        address indexed sellerNode,
        uint256 sellerPayout,
        uint256 protocolFee,
        uint256 buyerRefund,
        uint256 tUsed,
        bytes attestationHash
    );

    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event ProtocolTreasuryUpdated(address indexed previousTreasury, address indexed newTreasury);
    event TrustedRouterUpdated(address indexed previousRouter, address indexed newRouter);
    event PendingWithdrawalCredited(address indexed recipient, uint256 amount);
    event WithdrawalExecuted(address indexed recipient, uint256 amount);

    // -------------------------------------------------------------------------
    // Enums & Structs
    // -------------------------------------------------------------------------
    enum MandateStatus { NONE, LOCKED, SETTLED, REFUNDED }

    struct MandateParams {
        bytes32 mandateId;
        address sellerNode;
        address token; // address(0) for native HSK, otherwise ERC20 (e.g. HashKey USDC)
        uint256 maxDeposit;
        uint256 tMax;
        string modelId;
        uint256 deadline;
    }

    struct HSPPaymentMandate {
        address buyerAgent;
        address sellerNode;
        address token;
        uint256 maxDeposit;
        uint256 tMax;
        string modelId;
        MandateStatus status;
        uint256 createdAt;
    }

    // -------------------------------------------------------------------------
    // State Variables
    // -------------------------------------------------------------------------
    address public owner;
    address public pendingOwner;
    address public protocolTreasury;
    address public trustedRouter;
    uint256 public chainId;
    bytes32 public DOMAIN_SEPARATOR;

    mapping(bytes32 => HSPPaymentMandate) public mandates;
    mapping(address => uint256) public agentNonces;
    mapping(address => uint256) public pendingWithdrawals;

    uint256 private _reentrancyStatus;
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    modifier nonReentrant() {
        if (_reentrancyStatus == _ENTERED) revert Reentrancy();
        _reentrancyStatus = _ENTERED;
        _;
        _reentrancyStatus = _NOT_ENTERED;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier onlyTrustedRouter() {
        if (msg.sender != trustedRouter) revert Unauthorized();
        _;
    }

    constructor(address _protocolTreasury) {
        if (_protocolTreasury == address(0)) revert ZeroAddress();
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);

        protocolTreasury = _protocolTreasury;
        emit ProtocolTreasuryUpdated(address(0), _protocolTreasury);

        _reentrancyStatus = _NOT_ENTERED;

        uint256 id;
        assembly {
            id := chainid()
        }
        chainId = id;

        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                DOMAIN_TYPEHASH,
                keccak256(bytes(NAME)),
                keccak256(bytes(VERSION)),
                id,
                address(this)
            )
        );
    }

    // -------------------------------------------------------------------------
    // Safe ERC20 Helpers (low-level calls supporting non-standard/no-return tokens)
    // -------------------------------------------------------------------------
    function _safeTransfer(address token, address to, uint256 amount) internal {
        if (token.code.length == 0) revert TransferFailed();
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(IERC20.transfer.selector, to, amount)
        );
        if (!success || (data.length > 0 && !abi.decode(data, (bool)))) {
            revert TransferFailed();
        }
    }

    function _safeTransferFrom(address token, address from, address to, uint256 amount) internal {
        if (token.code.length == 0) revert TransferFailed();
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(IERC20.transferFrom.selector, from, to, amount)
        );
        if (!success || (data.length > 0 && !abi.decode(data, (bool)))) {
            revert TransferFailed();
        }
    }

    /**
     * @notice Locks upfront T_max funds under a signed HSP payment mandate for autonomous A2A inference.
     */
    function lockHSPMandateWithSignature(
        MandateParams calldata params,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external payable nonReentrant {
        if (block.timestamp > params.deadline) revert MandateExpired();
        if (mandates[params.mandateId].status != MandateStatus.NONE) revert MandateAlreadyExists();
        if (params.sellerNode == address(0)) revert ZeroAddress();
        if (params.maxDeposit == 0 || params.tMax == 0) revert ZeroAmount();

        // Verify EIP-712 Agent Signature
        bytes32 structHash = keccak256(
            abi.encode(
                MANDATE_TYPEHASH,
                params.mandateId,
                msg.sender,
                params.sellerNode,
                params.token,
                params.maxDeposit,
                params.tMax,
                agentNonces[msg.sender]++,
                params.deadline
            )
        );

        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash)
        );

        address recovered = ecrecover(digest, v, r, s);
        if (recovered == address(0) || recovered != msg.sender) {
            revert InvalidSignature();
        }

        // Receive funds (native HSK or ERC20)
        uint256 depositAmount = params.maxDeposit;
        if (params.token == address(0)) {
            if (msg.value != params.maxDeposit) revert ZeroAmount();
        } else {
            if (msg.value != 0) revert ZeroAmount();
            uint256 balanceBefore = IERC20(params.token).balanceOf(address(this));
            _safeTransferFrom(params.token, msg.sender, address(this), params.maxDeposit);
            depositAmount = IERC20(params.token).balanceOf(address(this)) - balanceBefore;
            if (depositAmount == 0) revert ZeroAmount();
        }

        mandates[params.mandateId] = HSPPaymentMandate({
            buyerAgent: msg.sender,
            sellerNode: params.sellerNode,
            token: params.token,
            maxDeposit: depositAmount,
            tMax: params.tMax,
            modelId: params.modelId,
            status: MandateStatus.LOCKED,
            createdAt: block.timestamp
        });

        emit HSPMandateCreated(
            params.mandateId,
            msg.sender,
            params.sellerNode,
            params.token,
            depositAmount,
            params.tMax,
            params.modelId
        );

        emit HSPMessageEmitted(
            params.mandateId,
            1,
            abi.encode(msg.sender, params.sellerNode, depositAmount, params.tMax, params.modelId)
        );
    }

    /**
     * @notice Direct on-chain mandate lock without off-chain signature (for interactive dApp users).
     */
    function lockHSPMandateDirect(
        bytes32 mandateId,
        address sellerNode,
        address token,
        uint256 maxDeposit,
        uint256 tMax,
        string calldata modelId
    ) external payable nonReentrant {
        if (mandates[mandateId].status != MandateStatus.NONE) revert MandateAlreadyExists();
        if (sellerNode == address(0)) revert ZeroAddress();
        if (maxDeposit == 0 || tMax == 0) revert ZeroAmount();

        if (token == address(0)) {
            if (msg.value != maxDeposit) revert ZeroAmount();
        } else {
            if (msg.value != 0) revert ZeroAmount();
            uint256 balanceBefore = IERC20(token).balanceOf(address(this));
            _safeTransferFrom(token, msg.sender, address(this), maxDeposit);
            uint256 received = IERC20(token).balanceOf(address(this)) - balanceBefore;
            if (received == 0) revert ZeroAmount();
            maxDeposit = received;
        }

        mandates[mandateId] = HSPPaymentMandate({
            buyerAgent: msg.sender,
            sellerNode: sellerNode,
            token: token,
            maxDeposit: maxDeposit,
            tMax: tMax,
            modelId: modelId,
            status: MandateStatus.LOCKED,
            createdAt: block.timestamp
        });

        emit HSPMandateCreated(mandateId, msg.sender, sellerNode, token, maxDeposit, tMax, modelId);

        emit HSPMessageEmitted(
            mandateId,
            1,
            abi.encode(msg.sender, sellerNode, maxDeposit, tMax, modelId)
        );
    }

    /**
     * @notice Locks mandate for a specified buyer, callable only by the trusted settlement router.
     */
    function lockHSPMandateFor(
        address buyer,
        bytes32 mandateId,
        address sellerNode,
        address token,
        uint256 maxDeposit,
        uint256 tMax,
        string calldata modelId
    ) external payable onlyTrustedRouter nonReentrant {
        if (buyer == address(0)) revert ZeroAddress();
        if (mandates[mandateId].status != MandateStatus.NONE) revert MandateAlreadyExists();
        if (sellerNode == address(0)) revert ZeroAddress();
        if (maxDeposit == 0 || tMax == 0) revert ZeroAmount();

        if (token == address(0)) {
            if (msg.value != maxDeposit) revert ZeroAmount();
        } else {
            if (msg.value != 0) revert ZeroAmount();
            uint256 balanceBefore = IERC20(token).balanceOf(address(this));
            _safeTransferFrom(token, msg.sender, address(this), maxDeposit);
            uint256 received = IERC20(token).balanceOf(address(this)) - balanceBefore;
            if (received == 0) revert ZeroAmount();
            maxDeposit = received;
        }

        mandates[mandateId] = HSPPaymentMandate({
            buyerAgent: buyer,
            sellerNode: sellerNode,
            token: token,
            maxDeposit: maxDeposit,
            tMax: tMax,
            modelId: modelId,
            status: MandateStatus.LOCKED,
            createdAt: block.timestamp
        });

        emit HSPMandateCreated(mandateId, buyer, sellerNode, token, maxDeposit, tMax, modelId);

        emit HSPMessageEmitted(
            mandateId,
            1,
            abi.encode(buyer, sellerNode, maxDeposit, tMax, modelId)
        );
    }

    /**
     * @notice Settles an HSP payment mandate post-inference based on exact tokens used (T_used).
     * @dev Strictly enforces Conservation of Value: sellerPayout + protocolFee + buyerRefund == maxDeposit.
     *      Limits: tUsed <= tMax; sellerPayout <= maxDeposit * tUsed / tMax; protocolFee <= maxDeposit * MAX_FEE_BPS / 10000.
     */
    function settleHSPMandate(
        bytes32 mandateId,
        uint256 sellerPayout,
        uint256 protocolFee,
        uint256 buyerRefund,
        uint256 tUsed,
        bytes calldata attestationHash
    ) external onlyOwner nonReentrant {
        HSPPaymentMandate storage mandate = mandates[mandateId];
        if (mandate.status != MandateStatus.LOCKED) revert MandateNotFound();

        if (tUsed > mandate.tMax) revert ExceedsTMax();
        if (sellerPayout > (mandate.maxDeposit * tUsed) / mandate.tMax) {
            revert ExcessivePayout();
        }
        if (protocolFee > (mandate.maxDeposit * MAX_FEE_BPS) / 10000) {
            revert ExcessiveFee();
        }

        // Mathematical Conservation of Value
        if (sellerPayout + protocolFee + buyerRefund != mandate.maxDeposit) {
            revert ConservationOfValueFailed();
        }

        mandate.status = MandateStatus.SETTLED;

        emit HSPSettlementExecuted(
            mandateId,
            mandate.sellerNode,
            sellerPayout,
            protocolFee,
            buyerRefund,
            tUsed,
            attestationHash
        );

        emit HSPMessageEmitted(
            mandateId,
            2,
            abi.encode(mandate.sellerNode, sellerPayout, protocolFee, buyerRefund, tUsed, attestationHash)
        );

        // Execute disbursements (Checks-Effects-Interactions)
        if (mandate.token == address(0)) {
            if (sellerPayout > 0) {
                (bool s1, ) = mandate.sellerNode.call{value: sellerPayout}("");
                if (!s1) {
                    pendingWithdrawals[mandate.sellerNode] += sellerPayout;
                    emit PendingWithdrawalCredited(mandate.sellerNode, sellerPayout);
                }
            }
            if (protocolFee > 0) {
                (bool s2, ) = protocolTreasury.call{value: protocolFee}("");
                if (!s2) {
                    pendingWithdrawals[protocolTreasury] += protocolFee;
                    emit PendingWithdrawalCredited(protocolTreasury, protocolFee);
                }
            }
            if (buyerRefund > 0) {
                (bool s3, ) = mandate.buyerAgent.call{value: buyerRefund}("");
                if (!s3) {
                    pendingWithdrawals[mandate.buyerAgent] += buyerRefund;
                    emit PendingWithdrawalCredited(mandate.buyerAgent, buyerRefund);
                }
            }
        } else {
            if (sellerPayout > 0) {
                _safeTransfer(mandate.token, mandate.sellerNode, sellerPayout);
            }
            if (protocolFee > 0) {
                _safeTransfer(mandate.token, protocolTreasury, protocolFee);
            }
            if (buyerRefund > 0) {
                _safeTransfer(mandate.token, mandate.buyerAgent, buyerRefund);
            }
        }
    }

    /**
     * @notice Emergency refund if upstream inference fails completely or times out (> 24 hours for buyer).
     */
    function refundHSPMandate(bytes32 mandateId) external nonReentrant {
        HSPPaymentMandate storage mandate = mandates[mandateId];
        if (mandate.status != MandateStatus.LOCKED) revert MandateNotFound();

        if (msg.sender != owner && msg.sender != mandate.buyerAgent) revert Unauthorized();
        if (msg.sender == mandate.buyerAgent && block.timestamp < mandate.createdAt + 24 hours) {
            revert Unauthorized();
        }

        mandate.status = MandateStatus.REFUNDED;

        emit HSPMessageEmitted(mandateId, 3, abi.encode(mandate.buyerAgent, mandate.maxDeposit));

        if (mandate.token == address(0)) {
            (bool ok, ) = mandate.buyerAgent.call{value: mandate.maxDeposit}("");
            if (!ok) {
                pendingWithdrawals[mandate.buyerAgent] += mandate.maxDeposit;
                emit PendingWithdrawalCredited(mandate.buyerAgent, mandate.maxDeposit);
            }
        } else {
            _safeTransfer(mandate.token, mandate.buyerAgent, mandate.maxDeposit);
        }
    }

    /**
     * @notice Allows users/treasury to withdraw native funds credited via pull-payments after failed transfers.
     */
    function withdraw() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        if (amount == 0) revert ZeroAmount();

        pendingWithdrawals[msg.sender] = 0;

        (bool ok, ) = msg.sender.call{value: amount}("");
        if (!ok) revert TransferFailed();

        emit WithdrawalExecuted(msg.sender, amount);
    }

    // -------------------------------------------------------------------------
    // Ownership & Administration
    // -------------------------------------------------------------------------
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner, newOwner);
    }

    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert Unauthorized();
        address oldOwner = owner;
        owner = msg.sender;
        pendingOwner = address(0);
        emit OwnershipTransferred(oldOwner, msg.sender);
    }

    function setProtocolTreasury(address _newTreasury) external onlyOwner {
        if (_newTreasury == address(0)) revert ZeroAddress();
        address oldTreasury = protocolTreasury;
        protocolTreasury = _newTreasury;
        emit ProtocolTreasuryUpdated(oldTreasury, _newTreasury);
    }

    function setTrustedRouter(address _router) external onlyOwner {
        address oldRouter = trustedRouter;
        trustedRouter = _router;
        emit TrustedRouterUpdated(oldRouter, _router);
    }

    receive() external payable {}
}
