import { expect } from "chai";
import { network } from "hardhat";

describe("PulseSubscriptions", function () {
  const DECIMALS = 6;
  const THIRTY_DAYS = 30 * 24 * 60 * 60;
  const MOCK_QUOTE_TOKEN = "0x0000000000000000000000000000000000000007";

  function pathUsd(amount: string) {
    return ethers.parseUnits(amount, DECIMALS);
  }

  let token: any;
  let pulse: any;
  let ethers: any;
  let networkHelpers: any;
  let owner: any;
  let creator: any;
  let subscriber: any;

  beforeEach(async function () {
    ({ ethers, networkHelpers } = await network.connect());
    [owner, creator, subscriber] = await ethers.getSigners();

    token = await ethers.deployContract("MockPathUSD", [
      "Mock pathUSD",
      "pathUSD",
      DECIMALS,
      "USD",
      MOCK_QUOTE_TOKEN
    ]);
    await token.waitForDeployment();

    pulse = await ethers.deployContract("PulseSubscriptions", [await token.getAddress()]);
    await pulse.waitForDeployment();

    await token.mint(subscriber.address, pathUsd("1000"));
  });

  it("registerCreator sets initial fee and zeroes earnings", async function () {
    const initialFee = pathUsd("10");

    await expect(pulse.connect(creator).registerCreator(initialFee))
      .to.emit(pulse, "CreatorRegistered")
      .withArgs(creator.address, initialFee);

    const state = await pulse.getCreator(creator.address);
    expect(state.subscriptionFee).to.equal(initialFee);
    expect(state.earnings).to.equal(0n);
    expect(state.totalEarnings).to.equal(0n);
    expect(state.registered).to.equal(true);
  });

  it("subscribe transfers pathUSD, updates earnings and stamps 30-day expiry", async function () {
    const fee = pathUsd("10");

    await pulse.connect(creator).registerCreator(fee);

    await token.connect(subscriber).approve(await pulse.getAddress(), fee);
    await pulse.connect(subscriber).subscribe(creator.address, fee);

    const contractBalance = await token.balanceOf(await pulse.getAddress());
    expect(contractBalance).to.equal(fee);

    const creatorState = await pulse.getCreator(creator.address);
    expect(creatorState.earnings).to.equal(fee);
    expect(creatorState.totalEarnings).to.equal(fee);

    const firstExpiry = await pulse.getSubscriptionExpiry(subscriber.address, creator.address);
    const latestTime = await networkHelpers.time.latest();
    expect(firstExpiry).to.be.greaterThan(BigInt(latestTime));

    await token.connect(subscriber).approve(await pulse.getAddress(), fee);
    await pulse.connect(subscriber).subscribe(creator.address, fee);

    const secondExpiry = await pulse.getSubscriptionExpiry(subscriber.address, creator.address);
    expect(secondExpiry).to.equal(firstExpiry + BigInt(THIRTY_DAYS));

    const stateAfterResubscribe = await pulse.getCreator(creator.address);
    expect(stateAfterResubscribe.earnings).to.equal(fee * 2n);
    expect(stateAfterResubscribe.totalEarnings).to.equal(fee * 2n);
  });

  it("withdrawCreatorEarning lets creator pull accumulated pathUSD", async function () {
    const fee = pathUsd("10");
    const withdrawAmount = pathUsd("4");

    await pulse.connect(creator).registerCreator(fee);
    await token.connect(subscriber).approve(await pulse.getAddress(), fee);
    await pulse.connect(subscriber).subscribe(creator.address, fee);

    await expect(pulse.connect(creator).withdrawCreatorEarning(withdrawAmount))
      .to.emit(pulse, "CreatorEarningsWithdrawn")
      .withArgs(creator.address, withdrawAmount);

    const creatorWalletBalance = await token.balanceOf(creator.address);
    expect(creatorWalletBalance).to.equal(withdrawAmount);

    const creatorState = await pulse.getCreator(creator.address);
    expect(creatorState.earnings).to.equal(fee - withdrawAmount);
    expect(creatorState.totalEarnings).to.equal(fee);
  });

  it("updateSubscriptionFee and isActiveSubscriber reflect current state", async function () {
    const initialFee = pathUsd("10");
    const newFee = pathUsd("15");

    await pulse.connect(creator).registerCreator(initialFee);
    await pulse.connect(creator).updateSubscriptionFee(newFee);

    const creatorState = await pulse.getCreator(creator.address);
    expect(creatorState.subscriptionFee).to.equal(newFee);

    expect(await pulse.isActiveSubscriber(subscriber.address, creator.address)).to.equal(false);

    await token.connect(subscriber).approve(await pulse.getAddress(), newFee);
    await pulse.connect(subscriber).subscribe(creator.address, newFee);

    expect(await pulse.isActiveSubscriber(subscriber.address, creator.address)).to.equal(true);

    await networkHelpers.time.increase(THIRTY_DAYS + 1);
    expect(await pulse.isActiveSubscriber(subscriber.address, creator.address)).to.equal(false);
  });
});
