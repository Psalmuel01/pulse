// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ITIP20 is IERC20 {
    function currency() external view returns (string memory);
    function quoteToken() external view returns (address);
}
