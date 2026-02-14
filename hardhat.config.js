require("@nomicfoundation/hardhat-toolbox");
require("dotenv/config");

const tempoRpcUrl = process.env.TEMPO_RPC_URL;
const chainId = Number(process.env.TEMPO_CHAIN_ID || 0);
const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY;

const networks = {
  hardhat: {}
};

if (tempoRpcUrl && deployerPrivateKey) {
  networks.tempo = {
    url: tempoRpcUrl,
    chainId,
    accounts: [deployerPrivateKey]
  };
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks
};
