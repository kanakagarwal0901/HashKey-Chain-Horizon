// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./HSPAdapter.sol";

/**
 * @title HashKeySettlementRouter
 * @notice Enterprise Router for Autonomous Agent Payments & A2A Settlement on HashKey Chain.
 * @dev Integrates HashKey Settlement Protocol (HSP) with optional Chainlink CCIP cross-chain settlement.
 *      Network: HashKey Chain (Chain ID: 177 Mainnet / 133 Testnet)
 *      Chainlink CCIP Selector: 7613811247471741961 (ethereum-mainnet-hashkey-1)
 */
contract HashKeySettlementRouter {
    error ZeroAddress();
    error Unauthorized();
    error TransferFailed();

    event AgentPaymentRouted(
        bytes32 indexed mandateId,
        address indexed buyerAgent,
        address indexed sellerNode,
        address token,
        uint256 amount,
        string modelId
    );

    event CrossChainSettlementReceived(
        uint64 indexed sourceChainSelector,
        address sender,
        bytes32 mandateId,
        uint256 amount
    );

    address public owner;
    HSPAdapter public immutable hspAdapter;
    address public ccipRouter;
    uint64 public constant HASHKEY_CHAIN_SELECTOR = 7613811247471741961;

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    constructor(address payable _hspAdapter, address _ccipRouter) {
        if (_hspAdapter == address(0)) revert ZeroAddress();
        owner = msg.sender;
        hspAdapter = HSPAdapter(_hspAdapter);
        ccipRouter = _ccipRouter;
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

    function _safeApprove(address token, address spender, uint256 amount) internal {
        if (token.code.length == 0) revert TransferFailed();
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(IERC20.approve.selector, spender, amount)
        );
        if (!success || (data.length > 0 && !abi.decode(data, (bool)))) {
            // Reset to 0 and retry (for tokens requiring 0-allowance reset like USDT)
            (bool sReset, bytes memory dReset) = token.call(
                abi.encodeWithSelector(IERC20.approve.selector, spender, 0)
            );
            if (!sReset || (dReset.length > 0 && !abi.decode(dReset, (bool)))) {
                revert TransferFailed();
            }
            (bool sRetry, bytes memory dRetry) = token.call(
                abi.encodeWithSelector(IERC20.approve.selector, spender, amount)
            );
            if (!sRetry || (dRetry.length > 0 && !abi.decode(dRetry, (bool)))) {
                revert TransferFailed();
            }
        }
    }

    /**
     * @notice Routes an autonomous agent payment through HSPAdapter with native HSK.
     */
    function routeAgentPaymentNative(
        bytes32 mandateId,
        address sellerNode,
        uint256 tMax,
        string calldata modelId
    ) external payable {
        hspAdapter.lockHSPMandateFor{value: msg.value}(
            msg.sender,
            mandateId,
            sellerNode,
            address(0),
            msg.value,
            tMax,
            modelId
        );

        emit AgentPaymentRouted(mandateId, msg.sender, sellerNode, address(0), msg.value, modelId);
    }

    /**
     * @notice Routes an autonomous agent payment through HSPAdapter with HashKey ERC20 tokens (e.g. USDC).
     */
    function routeAgentPaymentERC20(
        bytes32 mandateId,
        address sellerNode,
        address token,
        uint256 amount,
        uint256 tMax,
        string calldata modelId
    ) external {
        if (token == address(0)) revert ZeroAddress();

        // Transfer tokens from agent to router
        _safeTransferFrom(token, msg.sender, address(this), amount);

        // Approve HSPAdapter to spend tokens
        _safeApprove(token, address(hspAdapter), amount);

        // Lock mandate on HSPAdapter with msg.sender preserved as buyerAgent
        hspAdapter.lockHSPMandateFor(
            msg.sender,
            mandateId,
            sellerNode,
            token,
            amount,
            tMax,
            modelId
        );

        emit AgentPaymentRouted(mandateId, msg.sender, sellerNode, token, amount, modelId);
    }

    /**
     * @notice Optional cross-chain settlement hook from Chainlink CCIP.
     */
    function setCCIPRouter(address _newRouter) external onlyOwner {
        ccipRouter = _newRouter;
    }

    receive() external payable {}
}
