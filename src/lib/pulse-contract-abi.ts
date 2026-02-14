export const pulseSubscriptionsAbi = [
  "function registerCreator(uint256 initialFee)",
  "function subscribe(address creator, uint256 amount)",
  "function withdrawCreatorEarning(uint256 amount)",
  "function updateSubscriptionFee(uint256 newFee)",
  "function isActiveSubscriber(address subscriber, address creator) view returns (bool)",
  "function getCreator(address creator) view returns (uint256 subscriptionFee, uint256 earnings, uint256 totalEarnings, bool registered)",
  "function getSubscriptionExpiry(address subscriber, address creator) view returns (uint256)",
  "event CreatorRegistered(address indexed creator, uint256 initialFee)",
  "event Subscribed(address indexed subscriber, address indexed creator, uint256 amount, uint256 expiresAt)",
  "event CreatorEarningsWithdrawn(address indexed creator, uint256 amount)",
  "event SubscriptionFeeUpdated(address indexed creator, uint256 newFee)"
] as const;
