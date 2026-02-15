import { network } from "hardhat";

async function main() {
  const pathUsdAddress = process.env.TEMPO_PATHUSD_ADDRESS ?? process.env.TEMPO_STABLECOIN_ADDRESS;

  if (!pathUsdAddress) {
    throw new Error("Missing TEMPO_PATHUSD_ADDRESS in environment.");
  }

  const { ethers } = await network.connect();

  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);

  const pulse = await ethers.deployContract("PulseSubscriptions", [pathUsdAddress]);
  await pulse.waitForDeployment();

  console.log(`PulseSubscriptions deployed at: ${await pulse.getAddress()}`);
  console.log(`pathUSD TIP-20 token used: ${pathUsdAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
