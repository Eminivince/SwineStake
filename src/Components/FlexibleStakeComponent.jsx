// src/Components/FlexibleStakeComponent.jsx

import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import {
  SwineStakeAddress,
  SwineABI,
  ERC20ABI,
  SWINE_TOKEN_ABI,
  UNISWAP_V2_PAIR_ABI,
} from "../Utils/Contract";
import { formatUnits, parseUnits } from "ethers/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import LoadingSpinner from "./LoadingSpinner";
import { FiCopy, FiTrendingUp, FiPercent } from "react-icons/fi"; // Icons for TVL and APY
import { IoMdRefresh } from "react-icons/io";
import axios from "axios";

const FlexibleStakeComponent = ({ isConnected }) => {
  // State variables
  const [userBalance, setUserBalance] = useState("");
  const [swinePrice, setSwinePrice] = useState("");
  const [allowance, setAllowance] = useState(0);
  const [poolTokenAddress, setPoolTokenAddress] = useState("");
  const [poolTokenDecimals, setPoolTokenDecimals] = useState(18); // Default to 18 decimals

  const [flexibleAmount, setFlexibleAmount] = useState("");
  const [flexibleStake, setFlexibleStake] = useState({
    amount: "0",
    lastClaimBlock: 0,
  });
  const [flexibleRewards, setFlexibleRewards] = useState("0");
  const [flexibleTimeLeft, setFlexibleTimeLeft] = useState(0); // Time left in seconds
  const [flexibleUnstakeAmount, setFlexibleUnstakeAmount] = useState("");
  const [isFlexibleStaking, setIsFlexibleStaking] = useState(false);
  const [flexibleTxHash, setFlexibleTxHash] = useState("");
  const [flexibleError, setFlexibleError] = useState("");
  const [flexibleWarning, setFlexibleWarning] = useState(false);

  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [stakeContract, setStakeContract] = useState(null);
  const [poolTokenContract, setPoolTokenContract] = useState(null);

  const [truncatedAddress, setTruncatedAddress] = useState("");

  // New State Variables for TVL and APY
  const [tvl, setTvl] = useState("");
  const [apy, setApy] = useState("");

  // Constants (Adjust these based on your contract's parameters)
  const STAKING_DURATION_DAYS = 30; // Staking period in days
  const ANNUAL_REWARD_RATE = 0.1; // 10% annual reward rate
  const BLOCK_TIME_SECONDS = 5.3; // Average block time in seconds (adjust as per your network)

  // Initialize provider and signer
  useEffect(() => {
    const initializeProvider = async () => {
      if (isConnected && window.ethereum) {
        try {
          const web3Provider = new ethers.providers.Web3Provider(
            window.ethereum
          );
          setProvider(web3Provider);
          const signerInstance = web3Provider.getSigner();
          setSigner(signerInstance);
          const contractInstance = new ethers.Contract(
            SwineStakeAddress,
            SwineABI,
            signerInstance
          );
          setStakeContract(contractInstance);
          calculateSwinePriceAndMc();

          // Fetch and truncate wallet address
          const address = await signerInstance.getAddress();
          const truncated = `${address.slice(0, 6)}...${address.slice(-4)}`;
          setTruncatedAddress(truncated);
        } catch (err) {
          console.error("Error initializing provider:", err);
          setFlexibleError("Failed to connect to wallet.");
        }
      } else {
        // Reset state if not connected
        setProvider(null);
        setSigner(null);
        setStakeContract(null);
        setPoolTokenContract(null);
        setUserBalance("");
        setAllowance(0);
        setFlexibleStake({
          amount: "0",
          lastClaimBlock: 0,
        });
        setFlexibleRewards("0");
        setFlexibleTimeLeft(0);
        setFlexibleUnstakeAmount("");
        setFlexibleTxHash("");
        setFlexibleError("");
        setFlexibleWarning(false);
        setTruncatedAddress("");
        setTvl("");
        setApy("");
      }
    };
    initializeProvider();
  }, [isConnected]);

  // Fetch poolToken address from SwineStake contract
  useEffect(() => {
    const fetchPoolTokenAddress = async () => {
      if (stakeContract) {
        try {
          const tokenAddress = await stakeContract.stakingToken();
          setPoolTokenAddress(tokenAddress);
        } catch (err) {
          console.error("Error fetching pool token address:", err);
          setFlexibleError("Please Connect Wallet");
        }
      }
    };
    fetchPoolTokenAddress();
  }, [stakeContract]);

  // Initialize Pool Token Contract and fetch decimals
  useEffect(() => {
    const initPoolTokenContract = async () => {
      if (poolTokenAddress && signer) {
        try {
          const tokenContract = new ethers.Contract(
            poolTokenAddress,
            ERC20ABI,
            signer
          );
          setPoolTokenContract(tokenContract);
          const decimals = await tokenContract.decimals();
          setPoolTokenDecimals(decimals);
        } catch (err) {
          console.error("Error initializing pool token contract:", err);
          setFlexibleError("Please Connect Wallet.");
        }
      }
    };
    initPoolTokenContract();
  }, [poolTokenAddress, signer]);

  // Fetch user's token balance
  useEffect(() => {
    const getUserBalance = async () => {
      try {
        if (poolTokenContract && signer) {
          const address = await signer.getAddress();
          const balance = await poolTokenContract.balanceOf(address);
          const formattedBal = ethers.utils.formatUnits(
            balance,
            poolTokenDecimals
          );
          setUserBalance(Number(formattedBal).toFixed(2));
        }
      } catch (err) {
        console.error("Error getting user balance:", err);
        setFlexibleError("Failed to fetch balance.");
      }
    };
    getUserBalance();
  }, [poolTokenContract, signer, poolTokenDecimals]);

  // Fetch token allowance
  useEffect(() => {
    const fetchAllowance = async () => {
      try {
        if (poolTokenContract && signer && stakeContract) {
          const address = await signer.getAddress();
          const currentAllowance = await poolTokenContract.allowance(
            address,
            SwineStakeAddress
          );
          setAllowance(
            Number(
              ethers.utils.formatUnits(currentAllowance, poolTokenDecimals)
            )
          );
        }
      } catch (err) {
        console.error("Error fetching allowance:", err);
        setFlexibleError("Failed to fetch token allowance.");
      }
    };
    fetchAllowance();
  }, [poolTokenContract, signer, stakeContract, poolTokenDecimals]);

  // Fetch User's Flexible Stake, Rewards, and Time Left
  useEffect(() => {
    const fetchFlexibleStakeData = async () => {
      if (stakeContract && signer && provider) {
        try {
          const address = await signer.getAddress();
          const stake = await stakeContract.flexibleStakes(address);

          if (!stake || stake.amount.eq(0)) {
            setFlexibleStake({
              amount: "0",
              lastClaimBlock: 0,
            });
            setFlexibleRewards("0");
            setFlexibleTimeLeft(0);
            return;
          }

          setFlexibleStake({
            amount: formatUnits(stake.amount, poolTokenDecimals),
            lastClaimBlock: stake.lastClaimBlock.toNumber(),
          });

          // Calculate accumulated rewards
          const reward = await stakeContract.calculateFlexibleReward(address);
          setFlexibleRewards(formatUnits(reward, poolTokenDecimals));

          // Get current block number
          const currentBlock = await provider.getBlockNumber();

          // Calculate blocks since last claim
          const blocksSinceLastClaim =
            currentBlock - stake.lastClaimBlock.toNumber();

          // Fetch flexibleRewardInterval from contract
          const flexibleRewardInterval =
            await stakeContract.flexibleRewardInterval();

          // Calculate blocks left to complete the next interval
          const blocksLeft = flexibleRewardInterval - blocksSinceLastClaim;

          // Convert blocksLeft to seconds
          const timeLeftSeconds =
            blocksLeft > 0 ? blocksLeft * BLOCK_TIME_SECONDS : 0;
          setFlexibleTimeLeft(timeLeftSeconds);
        } catch (err) {
          console.error("Error fetching flexible stake data:", err);
          setFlexibleError("Failed to fetch flexible stake data.");
          setFlexibleStake({
            amount: "0",
            lastClaimBlock: 0,
          });
          setFlexibleRewards("0");
          setFlexibleTimeLeft(0);
        }
      }
    };
    fetchFlexibleStakeData();
  }, [stakeContract, signer, poolTokenDecimals, provider]);

  // Fetch TVL and APY
  useEffect(() => {
    const fetchTVLAndAPY = async () => {
      if (stakeContract && poolTokenContract) {
        try {
          // Fetch TVL by getting the staking token balance held by SwineStake contract
          const totalStaked = await poolTokenContract.balanceOf(
            SwineStakeAddress
          );
          const formattedTVL = ethers.utils.formatUnits(
            totalStaked,
            poolTokenDecimals
          );
          setTvl(Number(formattedTVL).toFixed(2));

          // Fetch APY
          const currentAPY = await stakeContract.flexibleAPY(); // Assuming flexibleAPY exists
          // Assuming APY is returned in basis points (e.g., 300 for 3%)
          const formattedAPY = (currentAPY.toNumber() / 100).toFixed(2);
          setApy(formattedAPY);
        } catch (err) {
          console.error("Error fetching TVL and APY:", err);
          setFlexibleError("Failed to fetch TVL and APY.");
        }
      }
    };
    fetchTVLAndAPY();
  }, [stakeContract, poolTokenContract, poolTokenDecimals]);

  // Approve tokens for Flexible staking
  const approveTokensFlexible = async () => {
    setFlexibleError("");
    setFlexibleTxHash("");

    if (!poolTokenContract) {
      setFlexibleError("Pool token contract not initialized.");
      return;
    }

    try {
      setIsFlexibleStaking(true);

      const tokenAmount = ethers.utils.parseUnits(
        flexibleAmount,
        poolTokenDecimals
      );

      const tx = await poolTokenContract.approve(
        SwineStakeAddress,
        tokenAmount
      );
      setFlexibleTxHash(tx.hash);

      // Wait for the transaction to be mined
      await tx.wait();

      // Update allowance
      const updatedAllowance = await poolTokenContract.allowance(
        await signer.getAddress(),
        SwineStakeAddress
      );
      setAllowance(
        Number(ethers.utils.formatUnits(updatedAllowance, poolTokenDecimals))
      );

      setIsFlexibleStaking(false);
      alert("Token approval successful!");
    } catch (err) {
      console.error("Error during token approval:", err);
      setFlexibleError("An error occurred during token approval.");
      setIsFlexibleStaking(false);
    }
  };

  // Stake tokens in Flexible mode
  const stakeFlexible = async () => {
    setFlexibleError("");
    setFlexibleTxHash("");

    if (!isConnected) {
      setFlexibleError("Please connect your wallet first.");
      return;
    }

    if (!flexibleAmount) {
      setFlexibleError("Please enter an amount to stake.");
      return;
    }

    try {
      setIsFlexibleStaking(true);

      const tokenAmount = ethers.utils.parseUnits(
        flexibleAmount,
        poolTokenDecimals
      );

      // Check allowance
      if (allowance < Number(flexibleAmount)) {
        setFlexibleError(
          "Insufficient allowance. Please approve tokens first."
        );
        setIsFlexibleStaking(false);
        return;
      }

      // Call the stakeFlexible function
      const tx = await stakeContract.stakeFlexible(tokenAmount);
      setFlexibleTxHash(tx.hash);

      // Wait for the transaction to be mined
      await tx.wait();

      // Update balance and allowance after staking
      const balance = await poolTokenContract.balanceOf(
        await signer.getAddress()
      );
      setUserBalance(
        Number(ethers.utils.formatUnits(balance, poolTokenDecimals)).toFixed(2)
      );

      const updatedAllowance = await poolTokenContract.allowance(
        await signer.getAddress(),
        SwineStakeAddress
      );
      setAllowance(
        Number(ethers.utils.formatUnits(updatedAllowance, poolTokenDecimals))
      );

      // Refresh flexible stake data
      const stake = await stakeContract.flexibleStakes(
        await signer.getAddress()
      );
      setFlexibleStake({
        amount: formatUnits(stake.amount, poolTokenDecimals),
        lastClaimBlock: stake.lastClaimBlock.toNumber(),
      });

      const reward = await stakeContract.calculateFlexibleReward(
        await signer.getAddress()
      );
      setFlexibleRewards(formatUnits(reward, poolTokenDecimals));

      const currentBlock = await provider.getBlockNumber();
      const blocksSinceLastClaim =
        currentBlock - stake.lastClaimBlock.toNumber();
      const flexibleRewardInterval =
        await stakeContract.flexibleRewardInterval();
      const blocksLeft = flexibleRewardInterval - blocksSinceLastClaim;
      const timeLeftSeconds =
        blocksLeft > 0 ? blocksLeft * BLOCK_TIME_SECONDS : 0;
      setFlexibleTimeLeft(timeLeftSeconds);

      setFlexibleAmount("");
      setIsFlexibleStaking(false);
      alert("Flexible staking successful!");
    } catch (err) {
      console.error("Error during flexible staking:", err);
      setFlexibleError("An error occurred during flexible staking.");
      setIsFlexibleStaking(false);
    }
  };

  // Claim rewards in Flexible staking
  const claimFlexibleRewards = async () => {
    setFlexibleError("");
    setFlexibleTxHash("");

    if (!isConnected) {
      setFlexibleError("Please connect your wallet first.");
      return;
    }

    try {
      setIsFlexibleStaking(true);

      // Call the claimFlexibleRewards function
      const tx = await stakeContract.claimFlexibleRewards();
      setFlexibleTxHash(tx.hash);

      // Wait for the transaction to be mined
      await tx.wait();

      // Refresh flexible stake data
      const stake = await stakeContract.flexibleStakes(
        await signer.getAddress()
      );
      setFlexibleStake({
        amount: formatUnits(stake.amount, poolTokenDecimals),
        lastClaimBlock: stake.lastClaimBlock.toNumber(),
      });

      const reward = await stakeContract.calculateFlexibleReward(
        await signer.getAddress()
      );
      setFlexibleRewards(formatUnits(reward, poolTokenDecimals));

      const currentBlock = await provider.getBlockNumber();
      const blocksSinceLastClaim =
        currentBlock - stake.lastClaimBlock.toNumber();
      const flexibleRewardInterval =
        await stakeContract.flexibleRewardInterval();
      const blocksLeft = flexibleRewardInterval - blocksSinceLastClaim;
      const timeLeftSeconds =
        blocksLeft > 0 ? blocksLeft * BLOCK_TIME_SECONDS : 0;
      setFlexibleTimeLeft(timeLeftSeconds);

      setIsFlexibleStaking(false);
      alert("Flexible rewards claimed successfully!");
    } catch (err) {
      console.error("Error during claiming flexible rewards:", err);
      setFlexibleError("An error occurred during claiming flexible rewards.");
      setIsFlexibleStaking(false);
    }
  };

  // Handle Flexible Unstaking
  const handleFlexibleUnstake = async () => {
    if (!flexibleUnstakeAmount || Number(flexibleUnstakeAmount) <= 0) {
      setFlexibleError("Please enter a valid amount to unstake.");
      return;
    }

    if (Number(flexibleUnstakeAmount) > Number(flexibleStake.amount)) {
      setFlexibleError("Unstake amount exceeds your flexible stake.");
      return;
    }

    // Check if it's the right time to unstake without forfeiting rewards
    if (flexibleTimeLeft > 0) {
      setFlexibleWarning(true);
      return;
    }

    try {
      setFlexibleError("");
      setFlexibleTxHash("");
      setIsFlexibleStaking(true);

      const amount = parseUnits(flexibleUnstakeAmount, poolTokenDecimals);

      const tx = await stakeContract.unstakeFlexible(amount);
      setFlexibleTxHash(tx.hash);

      await tx.wait();

      // Refresh data
      const updatedFlexibleStake = await stakeContract.flexibleStakes(
        await signer.getAddress()
      );
      setFlexibleStake({
        amount: formatUnits(updatedFlexibleStake.amount, poolTokenDecimals),
        lastClaimBlock: updatedFlexibleStake.lastClaimBlock.toNumber(),
      });

      // Reset rewards and time left
      const updatedReward = await stakeContract.calculateFlexibleReward(
        await signer.getAddress()
      );
      setFlexibleRewards(formatUnits(updatedReward, poolTokenDecimals));

      const currentBlock = await provider.getBlockNumber();
      const blocksSinceLastClaim =
        currentBlock - updatedFlexibleStake.lastClaimBlock.toNumber();
      const flexibleRewardInterval =
        await stakeContract.flexibleRewardInterval();
      const blocksLeft = flexibleRewardInterval - blocksSinceLastClaim;
      const timeLeftSeconds =
        blocksLeft > 0 ? blocksLeft * BLOCK_TIME_SECONDS : 0;
      setFlexibleTimeLeft(timeLeftSeconds);

      setFlexibleUnstakeAmount("");
      setIsFlexibleStaking(false);
      alert("Flexible unstaking successful!");
    } catch (err) {
      console.error("Error during flexible unstaking:", err);
      setFlexibleError("An error occurred during flexible unstaking.");
      setIsFlexibleStaking(false);
    }
  };

  // Confirm Flexible Unstaking with forfeited rewards
  const confirmFlexibleUnstake = async () => {
    if (!flexibleUnstakeAmount || Number(flexibleUnstakeAmount) <= 0) {
      setFlexibleError("Please enter a valid amount to unstake.");
      setFlexibleWarning(false);
      return;
    }

    if (Number(flexibleUnstakeAmount) > Number(flexibleStake.amount)) {
      setFlexibleError("Unstake amount exceeds your flexible stake.");
      setFlexibleWarning(false);
      return;
    }

    try {
      setFlexibleError("");
      setFlexibleTxHash("");
      setFlexibleWarning(false);
      setIsFlexibleStaking(true);

      const amount = parseUnits(flexibleUnstakeAmount, poolTokenDecimals);

      const tx = await stakeContract.unstakeFlexible(amount);
      setFlexibleTxHash(tx.hash);

      await tx.wait();

      // Refresh data
      const updatedFlexibleStake = await stakeContract.flexibleStakes(
        await signer.getAddress()
      );
      setFlexibleStake({
        amount: formatUnits(updatedFlexibleStake.amount, poolTokenDecimals),
        lastClaimBlock: updatedFlexibleStake.lastClaimBlock.toNumber(),
      });

      // Reset rewards and time left
      const updatedReward = await stakeContract.calculateFlexibleReward(
        await signer.getAddress()
      );
      setFlexibleRewards(formatUnits(updatedReward, poolTokenDecimals));

      const currentBlock = await provider.getBlockNumber();
      const blocksSinceLastClaim =
        currentBlock - updatedFlexibleStake.lastClaimBlock.toNumber();
      const flexibleRewardInterval =
        await stakeContract.flexibleRewardInterval();
      const blocksLeft = flexibleRewardInterval - blocksSinceLastClaim;
      const timeLeftSeconds =
        blocksLeft > 0 ? blocksLeft * BLOCK_TIME_SECONDS : 0;
      setFlexibleTimeLeft(timeLeftSeconds);

      setFlexibleUnstakeAmount("");
      setIsFlexibleStaking(false);
      alert(
        "Flexible unstaking successful! Note: Accumulated rewards have been forfeited."
      );
    } catch (err) {
      console.error("Error during flexible unstaking:", err);
      setFlexibleError("An error occurred during flexible unstaking.");
      setIsFlexibleStaking(false);
    }
  };

  // Handle TVL and APY Refresh
  const handleRefresh = async () => {
    setFlexibleError("");
    try {
      if (stakeContract && poolTokenContract) {
        calculateSwinePriceAndMc();

        // Fetch TVL
        const totalStaked = await poolTokenContract.balanceOf(
          SwineStakeAddress
        );
        const formattedTVL = ethers.utils.formatUnits(
          totalStaked,
          poolTokenDecimals
        );
        setTvl(Number(formattedTVL).toFixed(2));

        // Fetch APY
        const currentAPY = await stakeContract.flexibleAPY(); // Assuming flexibleAPY exists
        const formattedAPY = (currentAPY.toNumber() / 100).toFixed(2); // Assuming APY is in basis points
        setApy(formattedAPY);
      }
    } catch (err) {
      console.error("Error refreshing TVL and APY:", err);
      setFlexibleError("Failed to refresh TVL and APY.");
    }
  };

  // Function to copy wallet address to clipboard
  const copyWalletAddress = async () => {
    if (signer) {
      try {
        const address = await signer.getAddress();
        await navigator.clipboard.writeText(address);
        alert("Wallet address copied to clipboard!");
      } catch (err) {
        console.error("Failed to copy wallet address:", err);
        alert("Failed to copy wallet address.");
      }
    }
  };

  // Token and Contract Addresses
  const AMB_TOKEN_ADDRESS = "0x2b2d892C3fe2b4113dd7aC0D2c1882AF202FB28F"; // AMB Token
  const PAIR_CONTRACT = "0x1a052b0373115c796c636454fE8A90F53D28cf76"; // AMB-SWINE Pair Contract
  const SWINE_TOKEN_ADDRESS = "0xC410F3EB0c0f0E1EFA188D38C366536d59a265ba"; // SWINE Token

  // Create an instance of the pair contract
  const pairContract = new ethers.Contract(
    PAIR_CONTRACT,
    UNISWAP_V2_PAIR_ABI,
    provider
  );

  // Event signature for Uniswap V2 Swap event
  const SWAP_EVENT_SIGNATURE = ethers.utils.id(
    "Swap(address,uint256,uint256,uint256,uint256,address)"
  );

  // Create an instance of the SWINE token contract
  const swineTokenContract = new ethers.Contract(
    SWINE_TOKEN_ADDRESS,
    SWINE_TOKEN_ABI,
    provider
  );

  // Function to get the current price of AMB in USD from CoinGecko
  async function getEthPriceInUSD() {
    try {
      const response = await axios.get(
        "https://api.coingecko.com/api/v3/simple/price?ids=amber&vs_currencies=usd"
      );
      console.log("AMB Price in USD:", response.data.amber.usd);
      return response.data.amber.usd;
    } catch (error) {
      console.error("Error fetching AMB price:", error);
      return null;
    }
  }

  // Function to calculate the price of SWINE and market cap
  async function calculateSwinePriceAndMc() {
    try {
      const reserves = await pairContract.getReserves();
      const token0 = await pairContract.token0();
      const token1 = await pairContract.token1();

      const isToken0AMB =
        token0.toLowerCase() === AMB_TOKEN_ADDRESS.toLowerCase();
      const AMBReserve = isToken0AMB ? reserves._reserve0 : reserves._reserve1;
      const SWINEReserve = isToken0AMB
        ? reserves._reserve1
        : reserves._reserve0;

      const formattedAMBBal = ethers.utils.formatUnits(AMBReserve, 18);
      const formattedSWINEBal = ethers.utils.formatUnits(SWINEReserve, 18);

      const totalSupply = await swineTokenContract.totalSupply();
      const formattedTotalSupply = ethers.utils.formatUnits(totalSupply, 18);

      const ethPriceInUSD = await getEthPriceInUSD();
      if (ethPriceInUSD === null) {
        throw new Error("Failed to fetch AMB price in USD.");
      }

      const swinePriceInAmb =
        parseFloat(formattedAMBBal) / parseFloat(formattedSWINEBal);
      const swinePriceInUsd = swinePriceInAmb * ethPriceInUSD;
      const marketCap =
        parseFloat(swinePriceInUsd) * parseFloat(formattedTotalSupply);

      console.log("SWINE Price in AMB:", swinePriceInAmb);
      setSwinePrice(swinePriceInUsd);
      console.log("SWINE Price in USD:", swinePriceInUsd);
      console.log("SWINE Market Cap:", marketCap);

      return {
        swinePriceInAmb: swinePriceInAmb.toFixed(8),
        swinePriceInUsd: swinePriceInUsd.toFixed(8),
        marketCap: marketCap.toFixed(4),
      };
    } catch (error) {
      console.error("Error calculating SWINE price and MC:", error);
      return {
        swinePriceInAmb: "0",
        swinePriceInUsd: "0",
        marketCap: "0",
      };
    }
  }

  // Utility function to format time from seconds to "Xd Xh Xm Xs"
  const formatTime = (seconds) => {
    if (seconds <= 0) return "0 seconds";

    const days = Math.floor(seconds / (24 * 3600));
    seconds %= 24 * 3600;
    const hours = Math.floor(seconds / 3600);
    seconds %= 3600;
    const minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);

    let timeString = "";
    if (days > 0) timeString += `${days}d `;
    if (hours > 0) timeString += `${hours}h `;
    if (minutes > 0) timeString += `${minutes}m `;
    if (seconds > 0) timeString += `${seconds}s`;

    return timeString.trim();
  };

  return (
    <div className="bg-[#BB4938]/20 md:w-[600px] mx-auto p-6 rounded-xl shadow-lg">
      {/* Header */}

      {/* TVL and APY Information */}
      <div className="flex justify-between items-center mb-6">
        {/* TVL Card */}
        <div className="flex items-center bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 sm:mb-0">
          <FiTrendingUp size={24} className="text-green-500 mr-3" />
          <div className="text-center">
            <p className="text-gray-700 dark:text-gray-300">TVL</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {tvl && swinePrice ? (
                `$${Number(tvl * swinePrice).toFixed(3)}`
              ) : (
                <LoadingSpinner />
              )}
            </p>
          </div>
        </div>

        {/* APY Card */}
        <div className="flex items-center bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
          <FiPercent size={24} className="text-blue-500 mr-3" />
          <div className="text-center">
            <p className="text-gray-700 dark:text-gray-300">APY</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {apy ? `${apy}%` : "10%"}
            </p>
          </div>
        </div>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-center mb-6">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleRefresh}
          className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors duration-300"
          aria-label="Refresh TVL and APY">
          Refresh <IoMdRefresh size={20} className="ml-2" />
        </motion.button>
      </div>

      {/* Enhanced Wallet Segment */}
      {isConnected && (
        <div className="mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 flex flex-col sm:flex-row items-center justify-between">
            {/* Wallet Information */}
            <div className="flex items-center mb-4 sm:mb-0">
              <div className="bg-gray-200 dark:bg-gray-700 p-3 rounded-full mr-4">
                {/* Wallet Icon */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-[#BB4938]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 1.343-3 3v1H6v2h3v4h2v-4h3v-2h-3v-1c0-1.657-1.343-3-3-3z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-gray-800 dark:text-gray-200">
                  <strong>Bal:</strong> {userBalance} $SWINE
                </p>
                <div className="flex items-center mt-2">
                  <p className="text-gray-600 dark:text-gray-400 text-sm break-words">
                    <strong>Wallet:</strong> {truncatedAddress}
                  </p>
                  <button
                    onClick={copyWalletAddress}
                    className="ml-2 text-gray-600 dark:text-gray-400 hover:text-[#BB4938] dark:hover:text-[#BB4938] transition-colors duration-200"
                    aria-label="Copy Wallet Address">
                    <FiCopy size={18} />
                  </button>
                </div>
                <p className="mt-2">
                  <strong>Staked:</strong> {flexibleStake?.amount || "0"} $SWINE
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Staking Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (allowance < Number(flexibleAmount)) {
            approveTokensFlexible();
          } else {
            stakeFlexible();
          }
        }}>
        {/* Amount Input */}
        <div className="mb-4">
          <label htmlFor="flexibleAmount" className="block mb-2 text-lg">
            Stake Swine:
          </label>
          <input
            id="flexibleAmount"
            type="number"
            step="any"
            min="0"
            placeholder="Enter amount"
            value={flexibleAmount}
            onChange={(e) => setFlexibleAmount(e.target.value)}
            className="w-full p-4 bg-black border border-[#BB4938] rounded-xl text-right text-lg outline-none focus:border-[#ae3d2c] transition duration-150"
            required
          />
        </div>

        {/* Stake Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          className="mt-2 bg-[#BB4938] p-3 w-full rounded-xl text-center font-semibold cursor-pointer hover:bg-[#ae3d2c] transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!flexibleAmount || isFlexibleStaking}>
          {isFlexibleStaking ? (
            <div className="flex items-center justify-center">
              <LoadingSpinner />
              <span className="ml-2">Processing...</span>
            </div>
          ) : allowance < Number(flexibleAmount) ? (
            "Approve & Stake"
          ) : (
            "Stake"
          )}
        </motion.button>
      </form>

      {/* Transaction Hash */}
      {flexibleTxHash && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 p-2 bg-gray-800 rounded">
          <p className="text-lg">
            Transaction submitted.{" "}
            <a
              href={`https://airdao.io/explorer/tx/${flexibleTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-blue-400">
              View on Explorer
            </a>
          </p>
        </motion.div>
      )}

      {/* Error Message */}
      {flexibleError && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 p-2 bg-red-600 rounded">
          <p className="text-lg">{flexibleError}</p>
        </motion.div>
      )}

      {/* Display Flexible Stake Details */}
      <div className="mt-8">
        <h3 className="text-lg text-center font-semibold mb-4 mt-12">
          Your Stakes
        </h3>
        {flexibleStake && Number(flexibleStake.amount) > 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            {/* <div className="flex flex-col sm:flex-row sm:justify-between">
              <div className="flex items-center">
                <FiTrendingUp size={20} className="text-green-500 mr-2" />
                <p className="text-gray-800 dark:text-gray-200">
                  <strong>Staked:</strong> {flexibleStake.amount} $SWINE
                </p>
              </div>
              <div className="flex items-center">
                <FiPercent size={20} className="text-blue-500 mr-2" />
                <p className="text-gray-800 dark:text-gray-200">
                  <strong>APY:</strong> {apy}%
                </p>
              </div>
            </div> */}

            <p className="mt-4 text-center">
              <strong>Accumulated Rewards:</strong>
              <br />{" "}
              <span className="font-semibold">{flexibleRewards} $SWINE</span>
            </p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={claimFlexibleRewards}
              className="bg-[#BB4938] p-2 rounded-xl w-full mt-3 text-center font-semibold cursor-pointer hover:bg-[#ae3d2c] transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isFlexibleStaking || Number(flexibleRewards) === 0}>
              {isFlexibleStaking ? (
                <div className="flex items-center justify-center">
                  <LoadingSpinner />
                  <span className="ml-2">Processing...</span>
                </div>
              ) : (
                "Claim Rewards"
              )}
            </motion.button>

            <p className="mt-10 text-center">
              <strong>
                Time left to unstake without forfeiting accumulated but
                unclaimed rewards:
              </strong>{" "}
              {flexibleTimeLeft > 0 ? (
                <span className="text-green-500">
                  {formatTime(flexibleTimeLeft)}
                </span>
              ) : (
                <span className="text-green-500">
                  You can unstake now without forfeiting rewards.
                </span>
              )}
            </p>

            {/* Flexible Unstaking Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleFlexibleUnstake();
              }}
              className="mt-6">
              <label
                htmlFor="flexibleUnstakeAmount"
                className="block mb-2 text-lg">
                Unstake Swine:
              </label>
              <input
                id="flexibleUnstakeAmount"
                type="number"
                step="any"
                min="0"
                placeholder="Enter amount"
                value={flexibleUnstakeAmount}
                onChange={(e) => setFlexibleUnstakeAmount(e.target.value)}
                className="w-full p-4 bg-black border border-orange-600 rounded-xl text-right text-lg outline-none focus:border-red-700 transition duration-150"
                required
              />
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="mt-4 bg-red-600 p-3 w-full rounded-xl text-center font-semibold cursor-pointer hover:bg-red-700 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!flexibleUnstakeAmount || isFlexibleStaking}>
                {isFlexibleStaking ? (
                  <div className="flex items-center justify-center">
                    <LoadingSpinner />
                    <span className="ml-2">Unstaking...</span>
                  </div>
                ) : (
                  "Unstake"
                )}
              </motion.button>
            </form>
          </div>
        ) : (
          <p className="text-lg text-center">
            You have no stake at the moment.
          </p>
        )}
      </div>

      {/* Warning Modal for Early Unstaking */}
      <AnimatePresence>
        {flexibleWarning && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}>
            <motion.div
              className="bg-slate-800 p-6 rounded-xl shadow-lg w-11/12 max-w-md"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.3 }}>
              <h3 className="text-xl font-semibold mb-4 text-white">
                Confirm Unstake
              </h3>
              <p className="mb-6 text-gray-300">
                Warning: Unstaking now will forfeit your accumulated rewards. Do
                you wish to proceed?
              </p>
              <div className="flex justify-end space-x-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-gray-600 px-4 py-2 rounded-md text-white hover:bg-gray-700 transition-colors duration-300"
                  onClick={() => setFlexibleWarning(false)}
                  aria-label="Cancel Unstake">
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-red-600 px-4 py-2 rounded-md text-white hover:bg-red-700 transition-colors duration-300"
                  onClick={confirmFlexibleUnstake}
                  disabled={isFlexibleStaking}
                  aria-label="Confirm Unstake">
                  {isFlexibleStaking ? (
                    <div className="flex items-center justify-center">
                      <LoadingSpinner />
                      <span className="ml-2">Unstaking...</span>
                    </div>
                  ) : (
                    "Proceed"
                  )}
                </motion.button>
              </div>
              {/* Display Transaction Hash */}
              {flexibleTxHash && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 p-2 bg-gray-700 rounded">
                  <p className="text-lg text-gray-200">
                    Transaction submitted.{" "}
                    <a
                      href={`https://airdao.io/explorer/tx/${flexibleTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-blue-400">
                      View on Explorer
                    </a>
                  </p>
                </motion.div>
              )}
              {/* Display Error */}
              {flexibleError && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 p-2 bg-red-600 rounded">
                  <p className="text-lg text-white">{flexibleError}</p>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TVL and APY Display (Optional) */}
      {/* If you prefer to display TVL and APY here instead of at the top */}
      {/* <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <div className="flex items-center bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 mb-4 sm:mb-0">
          <FiTrendingUp size={24} className="text-green-500 mr-3" />
          <div>
            <p className="text-gray-700 dark:text-gray-300">Total Value Locked</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {tvl ? `$${Number(tvl * swinePrice).toFixed(3)}` : <LoadingSpinner />}
            </p>
          </div>
        </div>
        <div className="flex items-center bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
          <FiPercent size={24} className="text-blue-500 mr-3" />
          <div>
            <p className="text-gray-700 dark:text-gray-300">Annual Percentage Yield</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {apy ? `${apy}%` : <LoadingSpinner />}
            </p>
          </div>
        </div>
      </div> */}
    </div>
  );
};

export default FlexibleStakeComponent;
