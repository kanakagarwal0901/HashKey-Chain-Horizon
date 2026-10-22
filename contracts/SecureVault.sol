// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SecureVault
 * @author ShunyaGrid Security Hardening Engine
 * @notice Hardened implementation of VulnerableVault.sol with CEI adherence,
 *         mutex reentrancy prevention, deposit entry point, and custom error types.
 */
contract SecureVault {
    error ZeroDeposit();
    error ZeroBalance();
    error TransferFailed();
    error ReentrancyLock();

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);

    mapping(address => uint256) public balances;
    bool private _locked;

    modifier nonReentrant() {
        if (_locked) revert ReentrancyLock();
        _locked = true;
        _;
        _locked = false;
    }

    function deposit() external payable nonReentrant {
        if (msg.value == 0) revert ZeroDeposit();
        balances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    function withdraw() external nonReentrant {
        uint256 bal = balances[msg.sender];
        if (bal == 0) revert ZeroBalance();

        // 1. Checks-Effects: Clear balance before external call
        balances[msg.sender] = 0;
        emit Withdrawn(msg.sender, bal);

        // 2. Interactions: External low-level transfer
        (bool s, ) = msg.sender.call{value: bal}("");
        if (!s) revert TransferFailed();
    }

    receive() external payable {
        if (msg.value > 0) {
            balances[msg.sender] += msg.value;
            emit Deposited(msg.sender, msg.value);
        }
    }
}
