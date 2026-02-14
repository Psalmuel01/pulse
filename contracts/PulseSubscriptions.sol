// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract PulseSubscriptions {
    using SafeERC20 for IERC20;

    uint256 public constant SUBSCRIPTION_DURATION = 30 days;

    error CreatorAlreadyRegistered();
    error CreatorNotRegistered();
    error InvalidFee();
    error AmountBelowSubscriptionFee();
    error InsufficientCreatorEarnings();

    struct Creator {
        uint256 subscriptionFee;
        uint256 earnings;
        uint256 totalEarnings;
        bool registered;
    }

    IERC20 public immutable usdToken;

    mapping(address => Creator) private creators;
    mapping(address => mapping(address => uint256)) private subscriptionExpiry;

    event CreatorRegistered(address indexed creator, uint256 initialFee);
    event SubscriptionFeeUpdated(address indexed creator, uint256 newFee);
    event Subscribed(
        address indexed subscriber,
        address indexed creator,
        uint256 amount,
        uint256 expiresAt
    );
    event CreatorEarningsWithdrawn(address indexed creator, uint256 amount);

    constructor(address usdTokenAddress) {
        if (usdTokenAddress == address(0)) {
            revert InvalidFee();
        }

        usdToken = IERC20(usdTokenAddress);
    }

    function registerCreator(uint256 initialFee) external {
        if (creators[msg.sender].registered) {
            revert CreatorAlreadyRegistered();
        }
        if (initialFee == 0) {
            revert InvalidFee();
        }

        creators[msg.sender] = Creator({
            subscriptionFee: initialFee,
            earnings: 0,
            totalEarnings: 0,
            registered: true
        });

        emit CreatorRegistered(msg.sender, initialFee);
    }

    function subscribe(address creator, uint256 amount) external {
        Creator storage creatorData = creators[creator];
        if (!creatorData.registered) {
            revert CreatorNotRegistered();
        }
        if (amount < creatorData.subscriptionFee) {
            revert AmountBelowSubscriptionFee();
        }

        usdToken.safeTransferFrom(msg.sender, address(this), amount);

        uint256 currentExpiry = subscriptionExpiry[msg.sender][creator];
        uint256 startTime = currentExpiry > block.timestamp ? currentExpiry : block.timestamp;
        uint256 expiresAt = startTime + SUBSCRIPTION_DURATION;

        subscriptionExpiry[msg.sender][creator] = expiresAt;
        creatorData.earnings += amount;
        creatorData.totalEarnings += amount;

        emit Subscribed(msg.sender, creator, amount, expiresAt);
    }

    function withdrawCreatorEarning(uint256 amount) external {
        Creator storage creatorData = creators[msg.sender];
        if (!creatorData.registered) {
            revert CreatorNotRegistered();
        }
        if (amount == 0) {
            revert InvalidFee();
        }
        if (amount > creatorData.earnings) {
            revert InsufficientCreatorEarnings();
        }

        creatorData.earnings -= amount;
        usdToken.safeTransfer(msg.sender, amount);

        emit CreatorEarningsWithdrawn(msg.sender, amount);
    }

    function updateSubscriptionFee(uint256 newFee) external {
        Creator storage creatorData = creators[msg.sender];
        if (!creatorData.registered) {
            revert CreatorNotRegistered();
        }
        if (newFee == 0) {
            revert InvalidFee();
        }

        creatorData.subscriptionFee = newFee;

        emit SubscriptionFeeUpdated(msg.sender, newFee);
    }

    function isActiveSubscriber(address subscriber, address creator) external view returns (bool) {
        return subscriptionExpiry[subscriber][creator] > block.timestamp;
    }

    function getCreator(address creator)
        external
        view
        returns (uint256 subscriptionFee, uint256 earnings, uint256 totalEarnings, bool registered)
    {
        Creator memory data = creators[creator];
        return (data.subscriptionFee, data.earnings, data.totalEarnings, data.registered);
    }

    function getSubscriptionExpiry(address subscriber, address creator) external view returns (uint256) {
        return subscriptionExpiry[subscriber][creator];
    }
}
