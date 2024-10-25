// src/Components/FlexibleStakeComponent.jsx

import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { SwineStakeAddress, SwineABI, ERC20ABI } from "../Utils/Contract";
import { formatUnits, parseUnits } from "ethers/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import LoadingSpinner from "./LoadingSpinner";
import { FiCopy } from "react-icons/fi"; // Icon for copy functionality

const FlexibleStakeComponent = ({ isConnected }) => {
  // State variables
  const [userBalance, setUserBalance] = useState("");
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
          setFlexibleError("Failed to fetch pool token information.");
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
          setFlexibleError("Failed to initialize pool token contract.");
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
    <div className="bg-[#BB4938]/20 w-full p-6 rounded-xl shadow-lg">
      

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
                    className="ml-10 text-gray-600 dark:text-gray-400 hover:text-[#BB4938] dark:hover:text-[#BB4938] transition-colors duration-200"
                    aria-label="Copy Wallet Address">
                    <FiCopy size={18} />
                  </button>
                </div>
                <p className="mt-2">
                  <strong>Staked :</strong> {flexibleStake?.amount || "0"}{" "}
                  $SWINE
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
            Amount to Stake:
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
              className="underline">
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
        {flexibleStake ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between">
              <div></div>
              {/* Integrated Rewards and Claim Button */}
              <div className="mt-4 sm:mt-0 sm:text-right">
                <p className="text-center">
                  <strong>Accumulated Rewards:</strong>
                  <br />{" "}
                  <span className="font-semibold">
                    {flexibleRewards} $SWINE
                  </span>
                </p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={claimFlexibleRewards}
                  className="bg-[#BB4938] p-2 rounded-xl w-full mt-3 text-center font-semibold cursor-pointer hover:bg-[#ae3d2c] transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={
                    isFlexibleStaking ||
                    !flexibleStake ||
                    Number(flexibleRewards) === 0
                  }>
                  {isFlexibleStaking ? (
                    <div className="flex items-center justify-center">
                      <LoadingSpinner />
                      <span className="ml-2">Processing...</span>
                    </div>
                  ) : (
                    "Claim Rewards"
                  )}
                </motion.button>
              </div>
            </div>

            <p className="mt-10 text-center">
              <strong>Time left to unstake without forfeiting accumulated but unclaimed rewards:</strong>{" "}
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
                Unstake:
              </label>
              <input
                id="flexibleUnstakeAmount"
                type="number"
                step="any"
                min="0"
                placeholder="Enter amount"
                value={flexibleUnstakeAmount}
                onChange={(e) => setFlexibleUnstakeAmount(e.target.value)}
                className="w-full p-4 bg-black border border-red-600 rounded-xl text-right text-lg outline-none focus:border-red-700 transition duration-150"
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
            You have no flexible stake to unstake.
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
    </div>
  );
};

export default FlexibleStakeComponent;
