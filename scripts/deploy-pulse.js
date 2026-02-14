const hre = require("hardhat");

async function main() {
  const stablecoinAddress = process.env.TEMPO_STABLECOIN_ADDRESS;

  if (!stablecoinAddress) {
    throw new Error("Missing TEMPO_STABLECOIN_ADDRESS in environment.");
  }

  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);

  const PulseSubscriptions = await hre.ethers.getContractFactory("PulseSubscriptions");
  const pulse = await PulseSubscriptions.deploy(stablecoinAddress);
  await pulse.waitForDeployment();

  console.log(`PulseSubscriptions deployed at: ${await pulse.getAddress()}`);
  console.log(`Stablecoin used: ${stablecoinAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
