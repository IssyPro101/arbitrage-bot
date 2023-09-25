// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@balancer-labs/v2-interfaces/contracts/vault/IVault.sol";
import "@balancer-labs/v2-interfaces/contracts/vault/IFlashLoanRecipient.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
}

contract ArbitrageBot is IFlashLoanRecipient, Ownable {
    address public profitRecipitent;
    IVault public vault;

    constructor(address _vault, address _profitRecipitent) {
        vault = IVault(_vault);
        profitRecipitent = _profitRecipitent;
    }

    function startArbitrage(
        address tokenBorrow, 
        uint amountBorrow, 
        address[] calldata path1, 
        address[] calldata path2,
        address[] calldata dexPath 
    ) external onlyOwner {
        IERC20[] memory tokens = new IERC20[](1);
        uint256[] memory amounts = new uint256[](1);

        tokens[0] = IERC20(tokenBorrow);
        amounts[0] = amountBorrow;

        _makeFlashLoan(tokens, amounts, abi.encode(path1, path2, dexPath));
    }

    function _executeArbitrage(address[] memory path1, address[] memory path2, address[] memory dexPath, uint amount) internal {

        uint deadline = block.timestamp + 20 minutes;  // Ensure trade is valid for 20 minutes

        // Access both uniswap routers
        IUniswapV2Router uniswapV2Router = IUniswapV2Router(dexPath[0]);
        IUniswapV2Router uniswapV21Router = IUniswapV2Router(dexPath[1]);

        IERC20(path1[0]).approve(address(uniswapV2Router), amount); // Approve first swap

        // Buy input asset on first Uniswap V2 dex
        uniswapV2Router.swapExactTokensForTokens(
            amount, 
            1,  // Minimum output (would need a better way to estimate this)
            path1, 
            address(this), 
            deadline
        );

        // Then Uniswap V2.1
        uint amountV21 = IERC20(path1[1]).balanceOf(address(this));  // Get the output token amount from V2 swap

        IERC20(path2[0]).approve(address(uniswapV21Router), amountV21); // Approve second swap

        // Sell asset on second Uniswap V2 dex
        uniswapV21Router.swapExactTokensForTokens(
            amountV21, 
            1, 
            path2, 
            address(this), 
            deadline
        );
        
    }

    function _makeFlashLoan(
        IERC20[] memory tokens,
        uint256[] memory amounts,
        bytes memory userData
    ) internal {
      vault.flashLoan(this, tokens, amounts, userData);
    }

    function receiveFlashLoan(
        IERC20[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory feeAmounts,
        bytes memory userData
    ) external override {
        require(msg.sender == address(vault), "Message sender must be Balancer Vault!");
        
        // Decode the user data to get paths
        (address[] memory path1, address[] memory path2, address[] memory dexPath) = abi.decode(userData, (address[], address[], address[]));

        // Assuming the amount to start the arbitrage with is the first amount in the amounts array
        uint256 arbitrageAmount = amounts[0];
        
        // Perform arbitrage
        _executeArbitrage(path1, path2, dexPath, arbitrageAmount);

        // Repay flash loan
        IERC20(tokens[0]).transfer(address(vault), amounts[0]);
    }

    function withdrawProfit(
        IERC20 token
    ) external onlyOwner {
        token.transfer(profitRecipitent, token.balanceOf(address(this)));
    }
}

