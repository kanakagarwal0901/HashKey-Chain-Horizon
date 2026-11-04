// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ShunyaGridOrderbook
 * @notice Global decentralized orderbook for ShunyaGrid AI Agent node listings on HashKey Chain Horizon.
 * @dev Enables zero-trust, multi-device listing discovery across all clients and serverless instances.
 */
contract ShunyaGridOrderbook {
    struct ListingRecord {
        string id;
        address ownerAddress;
        string ensName;
        string model;
        string provider;
        uint256 availableTokens;
        uint256 pricePer1kMicroUsdc;
        bool humanVerified;
        string sealedApiKey;
        address payoutAddress;
        uint256 createdAt;
        bool active;
    }

    error Unauthorized();
    error ZeroAddress();
    error ListingNotFound();

    address public owner;
    address public pendingOwner;

    ListingRecord[] public listings;
    mapping(string => uint256) private _indexMap; // id => arrayIndex + 1

    event ListingPublished(
        string indexed id,
        address indexed ownerAddress,
        string ensName,
        string model,
        uint256 availableTokens,
        uint256 pricePer1kMicroUsdc
    );

    event ListingDeactivated(string indexed id);
    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

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

    function publishListing(
        string calldata id,
        address ownerAddress,
        string calldata ensName,
        string calldata model,
        string calldata provider,
        uint256 availableTokens,
        uint256 pricePer1kMicroUsdc,
        bool humanVerified,
        string calldata sealedApiKey,
        address payoutAddress
    ) external {
        uint256 existingIndex = _indexMap[id];
        if (existingIndex > 0) {
            uint256 idx = existingIndex - 1;
            ListingRecord storage item = listings[idx];
            if (msg.sender != item.ownerAddress && msg.sender != owner) {
                revert Unauthorized();
            }
            item.ownerAddress = ownerAddress;
            item.ensName = ensName;
            item.model = model;
            item.provider = provider;
            item.availableTokens = availableTokens;
            item.pricePer1kMicroUsdc = pricePer1kMicroUsdc;
            item.humanVerified = humanVerified;
            item.sealedApiKey = sealedApiKey;
            item.payoutAddress = payoutAddress;
            item.active = true;
        } else {
            if (msg.sender != owner && ownerAddress != msg.sender) {
                revert Unauthorized();
            }
            ListingRecord storage item = listings.push();
            item.id = id;
            item.ownerAddress = ownerAddress;
            item.ensName = ensName;
            item.model = model;
            item.provider = provider;
            item.availableTokens = availableTokens;
            item.pricePer1kMicroUsdc = pricePer1kMicroUsdc;
            item.humanVerified = humanVerified;
            item.sealedApiKey = sealedApiKey;
            item.payoutAddress = payoutAddress;
            item.createdAt = block.timestamp;
            item.active = true;
            _indexMap[id] = listings.length;
        }

        emit ListingPublished(id, ownerAddress, ensName, model, availableTokens, pricePer1kMicroUsdc);
    }

    function deactivateListing(string calldata id) external {
        uint256 existingIndex = _indexMap[id];
        if (existingIndex == 0) revert ListingNotFound();
        uint256 idx = existingIndex - 1;
        ListingRecord storage item = listings[idx];
        if (msg.sender != item.ownerAddress && msg.sender != owner) {
            revert Unauthorized();
        }
        item.active = false;
        emit ListingDeactivated(id);
    }

    function getAllListings() external view returns (ListingRecord[] memory) {
        return listings;
    }

    function getListingCount() external view returns (uint256) {
        return listings.length;
    }
}
