// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title VaultLending
 * @author ShunyaGrid Security Audit & Hardening Engine
 * @notice Production-grade, audit-hardened lending and custody vault with formal
 *         Checks-Effects-Interactions (CEI) enforcement, reentrancy guards,
 *         custom gas-optimized errors, event indexing, and emergency circuit breakers.
 *
 * @dev AUDIT PATCH SUMMARY:
 *   - [CRITICAL PATCHED] Reentrancy (SWC-107): Balances are now zeroed BEFORE external call.
 *   - [CRITICAL PATCHED] Mutex Protection: Integrated nonReentrant execution guard.
 *   - [HIGH PATCHED] Input Validation: Enforced non-zero deposit requirements.
 *   - [MEDIUM PATCHED] Observability: Added Deposited and Withdrawn event logging.
 *   - [GAS OPTIMIZED] Custom Errors: Replaced revert strings with custom errors (saves ~50-80 gas per revert).
 *   - [OPERATIONAL PATCHED] Circuit Breaker: Added emergency pause and 2-step administrative access control.
 */
contract VaultLending {
    // -------------------------------------------------------------------------
    // Custom Errors (Gas-Optimized)
    // -------------------------------------------------------------------------
    error ZeroDepositAmount();
    error InsufficientVaultBalance(address user, uint256 requested, uint256 available);
    error EtherTransferFailed(address recipient, uint256 amount);
    error ReentrancyGuardTriggered();
    error UnauthorizedCaller(address caller);
    error ContractIsPaused();
    error ZeroAddressProvided();

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------
    event Deposited(address indexed user, uint256 amount, uint256 newBalance);
    event Withdrawn(address indexed user, uint256 amount, uint256 remainingBalance);
    event EmergencyPaused(address indexed admin);
    event EmergencyUnpaused(address indexed admin);
    event OwnershipTransferInitiated(address indexed currentOwner, address indexed pendingOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // -------------------------------------------------------------------------
    // State Variables
    // -------------------------------------------------------------------------
    mapping(address => uint256) public balances;
    uint256 public totalDeposits;

    address public owner;
    address public pendingOwner;
    bool public paused;

    // Mutex status flag (1 = NOT_ENTERED, 2 = ENTERED)
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status;

    // -------------------------------------------------------------------------
    // Modifiers
    // -------------------------------------------------------------------------
    modifier nonReentrant() {
        if (_status == _ENTERED) revert ReentrancyGuardTriggered();
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert UnauthorizedCaller(msg.sender);
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert ContractIsPaused();
        _;
    }

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    constructor() {
        owner = msg.sender;
        _status = _NOT_ENTERED;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    // -------------------------------------------------------------------------
    // Core Functions
    // -------------------------------------------------------------------------

    /**
     * @notice Deposits native ETH into the lending vault.
     * @dev Validates non-zero input, updates balance, and emits Deposited event.
     */
    function deposit() external payable whenNotPaused nonReentrant {
        if (msg.value == 0) revert ZeroDepositAmount();

        balances[msg.sender] += msg.value;
        totalDeposits += msg.value;

        emit Deposited(msg.sender, msg.value, balances[msg.sender]);
    }

    /**
     * @notice Withdraws the caller's entire deposited ETH balance.
     * @dev Strictly enforces Checks-Effects-Interactions (CEI) to eliminate reentrancy.
     *      State zeroing happens BEFORE the external call.
     */
    function withdraw() external whenNotPaused nonReentrant {
        uint256 amount = balances[msg.sender];
        if (amount == 0) revert InsufficientVaultBalance(msg.sender, 0, 0);

        // 1. CHECKS: Completed above

        // 2. EFFECTS: Zero user balance and decrement total pool BEFORE external interaction
        balances[msg.sender] = 0;
        totalDeposits -= amount;

        emit Withdrawn(msg.sender, amount, 0);

        // 3. INTERACTIONS: Transfer native ETH to recipient
        (bool ok, ) = msg.sender.call{value: amount}("");
        if (!ok) revert EtherTransferFailed(msg.sender, amount);
    }

    /**
     * @notice Allows partial withdrawal of funds.
     * @param amount The amount of ETH in wei to withdraw.
     */
    function withdrawAmount(uint256 amount) external whenNotPaused nonReentrant {
        if (amount == 0) revert ZeroDepositAmount();
        uint256 currentBalance = balances[msg.sender];
        if (amount > currentBalance) {
            revert InsufficientVaultBalance(msg.sender, amount, currentBalance);
        }

        // EFFECTS: Decrement balance before external call
        balances[msg.sender] = currentBalance - amount;
        totalDeposits -= amount;

        emit Withdrawn(msg.sender, amount, balances[msg.sender]);

        // INTERACTIONS: Transfer native ETH
        (bool ok, ) = msg.sender.call{value: amount}("");
        if (!ok) revert EtherTransferFailed(msg.sender, amount);
    }

    // -------------------------------------------------------------------------
    // Administrative & Emergency Circuit Breaker
    // -------------------------------------------------------------------------

    /**
     * @notice Emergency circuit breaker to pause vault operations.
     */
    function pause() external onlyOwner {
        paused = true;
        emit EmergencyPaused(msg.sender);
    }

    /**
     * @notice Unpauses vault operations after resolution.
     */
    function unpause() external onlyOwner {
        paused = false;
        emit EmergencyUnpaused(msg.sender);
    }

    /**
     * @notice Two-step ownership transfer initiation to prevent accidental lockout.
     */
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddressProvided();
        pendingOwner = newOwner;
        emit OwnershipTransferInitiated(owner, newOwner);
    }

    /**
     * @notice Two-step ownership transfer acceptance by pending owner.
     */
    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert UnauthorizedCaller(msg.sender);
        emit OwnershipTransferred(owner, pendingOwner);
        owner = pendingOwner;
        pendingOwner = address(0);
    }

    // -------------------------------------------------------------------------
    // Fallback handlers
    // -------------------------------------------------------------------------
    receive() external payable {
        if (msg.value == 0) revert ZeroDepositAmount();
        balances[msg.sender] += msg.value;
        totalDeposits += msg.value;
        emit Deposited(msg.sender, msg.value, balances[msg.sender]);
    }
}
