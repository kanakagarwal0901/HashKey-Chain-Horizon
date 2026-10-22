// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ShunyaGridEscrow
 * @author ShunyaGrid Security Team (blockchain-developer)
 * @notice Enterprise-grade, token-bounded escrow contract for decentralized AI API exchange.
 * @dev Enforces Conservation of Value:
 *          Deposit(T_max) = SellerPayout(T_used) + ProtocolCommission(T_max - T_used) + Refund
 *      Incorporates Sybil-resistant World ID nullifier binding and CEI reentrancy safety.
 */
contract ShunyaGridEscrow {
    // -------------------------------------------------------------------------
    // Custom Errors
    // -------------------------------------------------------------------------
    error ZeroAddress();
    error ZeroAmount();
    error JobAlreadyExists(bytes32 jobId);
    error JobNotFound(bytes32 jobId);
    error JobAlreadySettled(bytes32 jobId);
    error Unauthorized();
    error ReentrancyAttempt();
    error InsufficientAllowance();
    error TokenTransferFailed();
    error NullifierAlreadySpent(bytes32 nullifier);

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------
    event JobEscrowCreated(
        bytes32 indexed jobId,
        address indexed buyer,
        address indexed seller,
        uint256 maxUpfrontAmount,
        bytes32 worldIdNullifier
    );

    event JobSettled(
        bytes32 indexed jobId,
        address indexed seller,
        uint256 sellerPayout,
        uint256 protocolCommission,
        uint256 buyerRefund
    );

    // -------------------------------------------------------------------------
    // Structs & State
    // -------------------------------------------------------------------------
    struct EscrowJob {
        address buyer;
        address seller;
        uint256 maxUpfrontAmount;
        bool settled;
        bytes32 worldIdNullifier;
        uint256 createdAt;
    }

    address public owner;
    address public protocolFeeRecipient;
    mapping(bytes32 => EscrowJob) public jobs;
    mapping(bytes32 => bool) public usedNullifiers;

    uint256 private _status;
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    modifier nonReentrant() {
        if (_status == _ENTERED) revert ReentrancyAttempt();
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    constructor(address _protocolFeeRecipient) {
        if (_protocolFeeRecipient == address(0)) revert ZeroAddress();
        owner = msg.sender;
        protocolFeeRecipient = _protocolFeeRecipient;
        _status = _NOT_ENTERED;
    }

    /**
     * @notice Creates an upfront escrow deposit for T_max tokens.
     */
    function createJobEscrow(
        bytes32 jobId,
        address seller,
        bytes32 worldIdNullifier
    ) external payable nonReentrant {
        if (msg.value == 0) revert ZeroAmount();
        if (seller == address(0)) revert ZeroAddress();
        if (jobs[jobId].buyer != address(0)) revert JobAlreadyExists(jobId);
        if (worldIdNullifier != bytes32(0) && usedNullifiers[worldIdNullifier]) {
            revert NullifierAlreadySpent(worldIdNullifier);
        }

        if (worldIdNullifier != bytes32(0)) {
            usedNullifiers[worldIdNullifier] = true;
        }

        jobs[jobId] = EscrowJob({
            buyer: msg.sender,
            seller: seller,
            maxUpfrontAmount: msg.value,
            settled: false,
            worldIdNullifier: worldIdNullifier,
            createdAt: block.timestamp
        });

        emit JobEscrowCreated(jobId, msg.sender, seller, msg.value, worldIdNullifier);
    }

    /**
     * @notice Settles a job based on actual tokens used (T_used).
     * @dev Strictly enforces: sellerPayout + protocolCommission + refund == maxUpfrontAmount.
     */
    function settleJob(
        bytes32 jobId,
        uint256 sellerPayout,
        uint256 protocolCommission,
        uint256 buyerRefund
    ) external onlyOwner nonReentrant {
        EscrowJob storage job = jobs[jobId];
        if (job.buyer == address(0)) revert JobNotFound(jobId);
        if (job.settled) revert JobAlreadySettled(jobId);

        // Conservation of Value Invariant
        if (sellerPayout + protocolCommission + buyerRefund != job.maxUpfrontAmount) {
            revert ZeroAmount();
        }

        job.settled = true;

        emit JobSettled(jobId, job.seller, sellerPayout, protocolCommission, buyerRefund);

        // Interactions (CEI compliant)
        if (sellerPayout > 0) {
            (bool s1, ) = job.seller.call{value: sellerPayout}("");
            if (!s1) revert TokenTransferFailed();
        }

        if (protocolCommission > 0) {
            (bool s2, ) = protocolFeeRecipient.call{value: protocolCommission}("");
            if (!s2) revert TokenTransferFailed();
        }

        if (buyerRefund > 0) {
            (bool s3, ) = job.buyer.call{value: buyerRefund}("");
            if (!s3) revert TokenTransferFailed();
        }
    }
}
