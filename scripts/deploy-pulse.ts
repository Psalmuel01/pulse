import { network } from "hardhat";

async function main() {
  const stablecoinAddress = process.env.TEMPO_STABLECOIN_ADDRESS;

  if (!stablecoinAddress) {
    throw new Error("Missing TEMPO_STABLECOIN_ADDRESS in environment.");
  }

  const { ethers } = await network.connect();

  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);

  const pulse = await ethers.deployContract("PulseSubscriptions", [stablecoinAddress]);
  await pulse.waitForDeployment();

  console.log(`PulseSubscriptions deployed at: ${await pulse.getAddress()}`);
  console.log(`Stablecoin used: ${stablecoinAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
