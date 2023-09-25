import { ethers } from 'hardhat';
import "@nomiclabs/hardhat-ethers";
const dotenv = require("dotenv");
dotenv.config();

async function deploy() {
  const [owner] = await ethers.getSigners();

  const vault = process.env.VAULT;

  const aribtrageBot = await ethers.deployContract("ArbitrageBot", [vault, owner], {});

  await aribtrageBot.waitForDeployment();

  console.log(
    `ArbitrageBot deployed to ${aribtrageBot.target}`
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
deploy().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});