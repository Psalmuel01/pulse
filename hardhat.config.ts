import "dotenv/config";
import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { HardhatUserConfig } from "hardhat/config";

const tempoRpcUrl = process.env.TEMPO_RPC_URL;
const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY;
const tempoChainId = Number(process.env.TEMPO_CHAIN_ID || "0");

const config: HardhatUserConfig = {
  plugins: [hardhatToolboxMochaEthersPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.24"
      },
      production: {
        version: "0.8.24",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      }
    }
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1"
    },
    ...(tempoRpcUrl && deployerPrivateKey
      ? {
          tempo: {
            type: "http",
            chainType: "l1",
            url: tempoRpcUrl,
            chainId: tempoChainId,
            accounts: [deployerPrivateKey]
          }
        }
      : {})
  }
};

export default config;
