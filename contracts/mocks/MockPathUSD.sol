// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ITIP20} from "../interfaces/ITIP20.sol";

contract MockPathUSD is ERC20, ITIP20 {
    uint8 private immutable tokenDecimals;
    string private tokenCurrency;
    address private immutable quoteTokenAddress;

    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        string memory currency_,
        address quoteToken_
    ) ERC20(name_, symbol_) {
        tokenDecimals = decimals_;
        tokenCurrency = currency_;
        quoteTokenAddress = quoteToken_;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function decimals() public view override returns (uint8) {
        return tokenDecimals;
    }

    function currency() external view returns (string memory) {
        return tokenCurrency;
    }

    function quoteToken() external view returns (address) {
        return quoteTokenAddress;
    }
}
