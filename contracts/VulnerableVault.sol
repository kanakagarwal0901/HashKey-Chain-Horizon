// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title VulnerableVault (Target for Confidential Security Audit)
 * @notice Demonstrates a textbook Reentrancy flaw (SWC-107).
 * @dev VULNERABILITY: Line 19 executes an external transfer before clearing balances[msg.sender].
 *      Refer to SecureVault.sol and VaultLending.sol for patched implementations.
 */
contract VulnerableVault {
    mapping(address => uint256) public balances;

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw() external {
        uint256 bal = balances[msg.sender];
        require(bal > 0, "No balance to withdraw");

        // CRITICAL BUG: External call precedes state zeroing (Reentrancy vector)
        (bool s, ) = msg.sender.call{value: bal}("");
        require(s, "Transfer failed");

        balances[msg.sender] = 0;
    }
}
