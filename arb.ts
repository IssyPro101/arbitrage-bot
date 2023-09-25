const { ethers } = require("ethers");
const { Web3 } = require("web3");
const dotenv = require("dotenv");
dotenv.config();

const { parseUnits } = ethers;
const ArbitrageBotArtifact = require("./artifacts/contracts/ArbitrageBot.sol/ArbitrageBot.json");

const INFURA_API_KEY = process.env.INFURA_API_KEY;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const PROVIDER_URL = `https://mainnet.infura.io/v3/${INFURA_API_KEY}`;


const INPUT_TOKEN_DECIMALS = 6;

const TEST_VOLUMES = [
    parseUnits("1000", INPUT_TOKEN_DECIMALS),
    parseUnits("10000", INPUT_TOKEN_DECIMALS),
    parseUnits("100000", INPUT_TOKEN_DECIMALS),
    parseUnits("1000000", INPUT_TOKEN_DECIMALS),
    parseUnits("5000", INPUT_TOKEN_DECIMALS),
    parseUnits("50000", INPUT_TOKEN_DECIMALS),
    parseUnits("500000", INPUT_TOKEN_DECIMALS),
    parseUnits("5000000", INPUT_TOKEN_DECIMALS),
    parseUnits("2000", INPUT_TOKEN_DECIMALS),
    parseUnits("20000", INPUT_TOKEN_DECIMALS),
    parseUnits("200000", INPUT_TOKEN_DECIMALS),
    parseUnits("2000000", INPUT_TOKEN_DECIMALS),
    parseUnits("3000", INPUT_TOKEN_DECIMALS),
    parseUnits("30000", INPUT_TOKEN_DECIMALS),
    parseUnits("300000", INPUT_TOKEN_DECIMALS),
    parseUnits("3000000", INPUT_TOKEN_DECIMALS),
    parseUnits("4000", INPUT_TOKEN_DECIMALS),
    parseUnits("40000", INPUT_TOKEN_DECIMALS),
    parseUnits("400000", INPUT_TOKEN_DECIMALS),
    parseUnits("4000000", INPUT_TOKEN_DECIMALS),
]



const TOKEN1 = process.env.TOKEN1;
const TOKEN2 = process.env.TOKEN2;

const TOKEN1_NAME = process.env.TOKEN1_NAME;
const TOKEN2_NAME = process.env.TOKEN2_NAME;

const path1 = [TOKEN1, TOKEN2];
const path2 = [TOKEN2, TOKEN1];

const UNISWAP_V2_ROUTER_ADDRESS = process.env.UNISWAP_V2_ROUTER_ADDRESS; // Uniswap
const UNISWAP_V21_ROUTER_ADDRESS = process.env.UNISWAP_V21_ROUTER_ADDRESS; // Sushiswap

const UNISWAP_V2_FACTORY_ADDRESS = process.env.UNISWAP_V2_FACTORY_ADDRESS; // Uniswap
const UNISWAP_V21_FACTORY_ADDRESS = process.env.UNISWAP_V21_FACTORY_ADDRESS; // Sushiswap

const UNISWAP_V2_NAME = process.env.UNISWAP_V2_NAME; // Uniswap
const UNISWAP_V21_NAME = process.env.UNISWAP_V21_NAME; // Sushiswap

const BORROW_AMOUNT = parseUnits("1000000", INPUT_TOKEN_DECIMALS)

const MIN_PROFIT_MARGIN = parseUnits("1", INPUT_TOKEN_DECIMALS);  // Minimum profit to consider it worthwhile.

const web3 = new Web3(PROVIDER_URL);
const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
wallet.connect(provider);

const arbitrageBot = new ethers.Contract(process.env.ARBITRAGE_BOT_CONTRACT_ADDRESS, ArbitrageBotArtifact.abi, wallet);
let sentTransactions: { [key: string]: any } = {};

async function getGasPrice(): Promise<typeof ethers.BigNumber> {
    const baseGasPrice = await web3.eth.getGasPrice();
    return baseGasPrice * 120n / 100n;  // Increase by 20% to defend against front-running and gas price volatility
}

async function getReserves(pairAddress: string): Promise<{ reserveA: typeof ethers.BigNumber, reserveB: typeof ethers.BigNumber }> {
    const pair = new ethers.Contract(pairAddress, ["function getReserves() external view returns (uint112, uint112, uint32)"], wallet);
    const [reserveA, reserveB] = await pair.getReserves();
    return { reserveA, reserveB };
}

async function getTokensOut(amountIn: BigInt, path: Array<string | undefined>, routerAddress: string | undefined): Promise<{ amounts: Array<typeof ethers.BigNumber> }> {
    const router = new ethers.Contract(routerAddress, ["function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)"], wallet);
    const amounts = await router.getAmountsOut(amountIn, path);
    return { amounts };
}

type BestCrossedMarket = {
    exchange: null | string,
    size: null | typeof ethers.BigNumber,
    profit: number
}

async function checkForArbitrageOpportunity(): Promise<BestCrossedMarket> {

    let bestCrossedMarket: BestCrossedMarket = {
        exchange: null,
        size: null,
        profit: MIN_PROFIT_MARGIN
    }

    try {


        for (const size of TEST_VOLUMES) {
            // Calculate profit margin for 1st DEX
            const inputAmount = size;
            let amounts = await getTokensOut(inputAmount, path1, UNISWAP_V2_ROUTER_ADDRESS);
            let amountOut = amounts.amounts[1];

            let amounts1 = await getTokensOut(amountOut, path2, UNISWAP_V21_ROUTER_ADDRESS);
            let amountOut1 = amounts1.amounts[1];

            console.log(`Minimum profit: ${Number(MIN_PROFIT_MARGIN) / 10 ** INPUT_TOKEN_DECIMALS} ${TOKEN1_NAME}`);

            let profitMarginV2 = amountOut1 - inputAmount;
            console.log(`${UNISWAP_V2_NAME} Potential Profit: ${Number(profitMarginV2) / 10 ** INPUT_TOKEN_DECIMALS}`);
            // Calculate profit margin for 2nd DEX
            amounts = await getTokensOut(inputAmount, path1, UNISWAP_V21_ROUTER_ADDRESS);
            amountOut = amounts.amounts[1];

            amounts1 = await getTokensOut(amountOut, path2, UNISWAP_V2_ROUTER_ADDRESS);
            amountOut1 = amounts1.amounts[1];

            // Check if buying on V2.1 and selling on V2
            let profitMarginV21 = amountOut1 - inputAmount;
            console.log(`${UNISWAP_V21_NAME} Potential Profit: ${Number(profitMarginV21) / 10 ** INPUT_TOKEN_DECIMALS}`);


            if (profitMarginV2 >= profitMarginV21 && profitMarginV2 >= bestCrossedMarket["profit"]) {
                bestCrossedMarket["exchange"] = "V2"
                bestCrossedMarket["size"] = size
                bestCrossedMarket["profit"] = profitMarginV2
            } else if (profitMarginV21 > profitMarginV2 && profitMarginV21 >= bestCrossedMarket["profit"]) {
                bestCrossedMarket["exchange"] = "V2.1"
                bestCrossedMarket["size"] = size
                bestCrossedMarket["profit"] = profitMarginV21
            }



        }
        console.log(bestCrossedMarket)
        return bestCrossedMarket;
    } catch (error) {
        console.error("Error checking arbitrage opportunity:", error);
        return bestCrossedMarket;
    }
}

async function monitorTransactions(opportunityExists: boolean | string, borrowAmount: typeof ethers.BigNumber) {
    for (let txHash in sentTransactions) {
        try {
            let tx = await provider.getTransaction(txHash);
            if (tx) {
                let currentBlockNumber = await provider.getBlockNumber();
                if ((currentBlockNumber - tx.blockNumber) > 12) {
                    let newGasPrice = tx.gasPrice * 120n / 100n;
                    let nonce = tx.nonce;
                    await executeArbitrage(opportunityExists, borrowAmount, nonce, newGasPrice);
                    delete sentTransactions[txHash];
                }
            }
        } catch (error) {
            console.error(`Error monitoring transaction with hash ${txHash}:`, error);
            delete sentTransactions[txHash];
        }
    }
}

async function executeArbitrage(opportunityExists: boolean | string, borrowAmount: typeof ethers.BigNumber, customNonce?: number, customGasPrice?: typeof ethers.BigNumber) {
    try {
        const gasPrice = customGasPrice || await getGasPrice();
        const nonce = customNonce || await provider.getTransactionCount(wallet.address, 'latest');

        const dexPath: Array<string | undefined> = []

        console.log(opportunityExists)
        if (opportunityExists == "V2") {
            dexPath.push(UNISWAP_V2_ROUTER_ADDRESS)
            dexPath.push(UNISWAP_V21_ROUTER_ADDRESS)
        } else {
            dexPath.push(UNISWAP_V21_ROUTER_ADDRESS)
            dexPath.push(UNISWAP_V2_ROUTER_ADDRESS)
        }

        const tx = await arbitrageBot.startArbitrage(TOKEN1, borrowAmount, path1, path2, dexPath, { nonce, gasPrice, gasLimit: 500000 });

        console.log(`Sent transaction with hash: ${tx.hash}`);
        sentTransactions[tx.hash] = tx;
    } catch (error) {
        console.error("Error executing arbitrage:", error);
    }
}

async function main() {
    provider.on("block", async (blockNumber: number) => {
        console.log(`\nCurrent Block: ${blockNumber}`)
        const opportunityExists = await checkForArbitrageOpportunity();
        if (opportunityExists.exchange && opportunityExists.size) {
            await executeArbitrage(opportunityExists.exchange, opportunityExists.size);
            await monitorTransactions(opportunityExists.exchange, opportunityExists.size);
        }
    });
}

main().catch(console.error);
