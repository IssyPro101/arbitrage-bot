const dotenv = require("dotenv");
dotenv.config();
const { HardhatUserConfig } = require("hardhat/config");
require("@nomicfoundation/hardhat-toolbox");

const INFURA_API_KEY = process.env.INFURA_API_KEY;
const PROVIDER_URL = `https://goerli.infura.io/v3/${INFURA_API_KEY}`;

const config: typeof HardhatUserConfig = {
  solidity: "0.8.19",
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {},
    goerli: {
      chainId: 5,
      url: PROVIDER_URL,
      accounts: {
        mnemonic: process.env.MNEMONIC
      }
    },
  }
};

export default config;