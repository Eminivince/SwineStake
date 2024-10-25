// src/Components/FixedStakeComponent.jsx

import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { SwineStakeAddress, SwineABI, ERC20ABI } from "../Utils/Contract";
import { formatUnits } from "ethers/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import LoadingSpinner from "./LoadingSpinner";
import { FiCopy } from "react-icons/fi"; // Icon for copy functionality

const FixedStakeComponent = ({ isConnected }) => {
  // State variables
  const [userBalance, setUserBalance] = useState("");
  const [allowance, setAllowance] = useState(0);
  const [poolTokenAddress, setPoolTokenAddress] = useState("");
  const [poolTokenDecimals, setPoolTokenDecimals] = useState(18); // Default to 18 decimals

  const [fixedAmount, setFixedAmount] = useState("");
  const [fixedStakes, setFixedStakes] = useState([]);
  const [fixedRewards, setFixedRewards] = useState({});
  const [selectedFixedStakeId, setSelectedFixedStakeId] = useState(null);
  const [isFixedStaking, setIsFixedStaking] = useState(false);
  const [fixedTxHash, setFixedTxHash] = useState("");
  const [fixedError, setFixedError] = useState("");

  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [stakeContract, setStakeContract] = useState(null);
  const [poolTokenContract, setPoolTokenContract] = useState(null);

  const [truncatedAddress, setTruncatedAddress] = useState("");

  // Constants (Adjust these based on your contract's parameters)
  const STAKING_DURATION_DAYS = 30; // Staking period in days
  const ANNUAL_REWARD_RATE = 0.3; // 10% annual reward rate

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
          setFixedError("Failed to connect to wallet.");
        }
      } else {
        // Reset state if not connected
        setProvider(null);
        setSigner(null);
        setStakeContract(null);
        setPoolTokenContract(null);
        setUserBalance("");
        setAllowance(0);
        setFixedStakes([]);
        setFixedRewards({});
        setSelectedFixedStakeId(null);
        setFixedTxHash("");
        setFixedError("");
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
          setFixedError("Please Connect Wallet");
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
          setFixedError("Please Connect Wallet.");
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
        setFixedError("Failed to fetch balance.");
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
        setFixedError("Failed to fetch token allowance.");
      }
    };
    fetchAllowance();
  }, [poolTokenContract, signer, stakeContract, poolTokenDecimals]);

  // Fetch User's Fixed Stakes and Rewards
  useEffect(() => {
    const fetchFixedStakes = async () => {
      if (stakeContract && signer && provider) {
        try {
          const address = await signer.getAddress();
          const stakeIds = await stakeContract.getUserFixedStakes(address);
          const stakes = await Promise.all(
            stakeIds.map(async (stakeId) => {
              const stake = await stakeContract.fixedStakes(stakeId);
              const startBlock = stake.startBlock.toNumber();
              const block = await provider.getBlock(startBlock);
              const startTime = new Date(block.timestamp * 1000); // Convert to milliseconds

              // Calculate end time
              const stakingDurationMs =
                STAKING_DURATION_DAYS * 24 * 60 * 60 * 1000; // 30 days
              const endTime = new Date(startTime.getTime() + stakingDurationMs);

              // Calculate expected total reward
              const expectedTotalReward =
                (stake.amount / Math.pow(10, poolTokenDecimals)) *
                ANNUAL_REWARD_RATE *
                (STAKING_DURATION_DAYS / 365);

              return {
                stakeId: stake.stakeId.toNumber(),
                amount: formatUnits(stake.amount, poolTokenDecimals),
                startBlock: startBlock,
                startTime: startTime.toLocaleString(),
                endTime: endTime.toLocaleString(),
                expectedTotalReward: expectedTotalReward.toFixed(2),
                withdrawn: stake.withdrawn,
              };
            })
          );
          setFixedStakes(stakes);

          // Fetch rewards for each fixed stake
          const rewards = {};
          for (const stake of stakes) {
            if (!stake.withdrawn) {
              const reward = await stakeContract.calculateFixedReward(
                ethers.utils.parseUnits(stake.amount, poolTokenDecimals),
                stake.startBlock
              );
              rewards[stake.stakeId] = formatUnits(reward, poolTokenDecimals);
            } else {
              rewards[stake.stakeId] = "0";
            }
          }
          setFixedRewards(rewards);
        } catch (err) {
          console.error("Error fetching fixed stakes:", err);
          setFixedError("Failed to fetch fixed stakes.");
        }
      }
    };
    fetchFixedStakes();
  }, [stakeContract, signer, poolTokenDecimals, provider]);

  // Approve tokens for Fixed staking
  const approveTokensFixed = async () => {
    setFixedError("");
    setFixedTxHash("");

    if (!poolTokenContract) {
      setFixedError("Pool token contract not initialized.");
      return;
    }

    try {
      setIsFixedStaking(true);

      const tokenAmount = ethers.utils.parseUnits(
        fixedAmount,
        poolTokenDecimals
      );

      const tx = await poolTokenContract.approve(
        SwineStakeAddress,
        tokenAmount
      );
      setFixedTxHash(tx.hash);

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

      setIsFixedStaking(false);
      alert("Token approval successful!");
    } catch (err) {
      console.error("Error during token approval:", err);
      setFixedError("An error occurred during token approval.");
      setIsFixedStaking(false);
    }
  };

  // Stake tokens in Fixed mode
  const stakeFixed = async () => {
    setFixedError("");
    setFixedTxHash("");

    if (!isConnected) {
      setFixedError("Please connect your wallet first.");
      return;
    }

    if (!fixedAmount) {
      setFixedError("Please enter an amount to stake.");
      return;
    }

    try {
      setIsFixedStaking(true);

      const tokenAmount = ethers.utils.parseUnits(
        fixedAmount,
        poolTokenDecimals
      );

      // Check allowance
      if (allowance < Number(fixedAmount)) {
        setFixedError("Insufficient allowance. Please approve tokens first.");
        setIsFixedStaking(false);
        return;
      }

      // Call the stakeFixed function
      const tx = await stakeContract.stakeFixed(tokenAmount);
      setFixedTxHash(tx.hash);

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

      // Refresh fixed stakes and rewards
      const stakeIds = await stakeContract.getUserFixedStakes(
        await signer.getAddress()
      );
      const stakes = await Promise.all(
        stakeIds.map(async (stakeId) => {
          const stake = await stakeContract.fixedStakes(stakeId);
          const startBlock = stake.startBlock.toNumber();
          const block = await provider.getBlock(startBlock);
          const startTime = new Date(block.timestamp * 1000); // Convert to milliseconds

          // Calculate end time
          const stakingDurationMs = STAKING_DURATION_DAYS * 24 * 60 * 60 * 1000; // 30 days
          const endTime = new Date(startTime.getTime() + stakingDurationMs);

          // Calculate expected total reward
          const expectedTotalReward =
            (stake.amount / Math.pow(10, poolTokenDecimals)) *
            ANNUAL_REWARD_RATE *
            (STAKING_DURATION_DAYS / 365);

          return {
            stakeId: stake.stakeId.toNumber(),
            amount: formatUnits(stake.amount, poolTokenDecimals),
            startBlock: startBlock,
            startTime: startTime.toLocaleString(),
            endTime: endTime.toLocaleString(),
            expectedTotalReward: expectedTotalReward.toFixed(2),
            withdrawn: stake.withdrawn,
          };
        })
      );
      setFixedStakes(stakes);

      const rewards = {};
      for (const stake of stakes) {
        if (!stake.withdrawn) {
          const reward = await stakeContract.calculateFixedReward(
            ethers.utils.parseUnits(stake.amount, poolTokenDecimals),
            stake.startBlock
          );
          rewards[stake.stakeId] = formatUnits(reward, poolTokenDecimals);
        } else {
          rewards[stake.stakeId] = "0";
        }
      }
      setFixedRewards(rewards);

      setFixedAmount("");
      setIsFixedStaking(false);
      alert("Fixed staking successful!");
    } catch (err) {
      console.error("Error during fixed staking:", err);
      setFixedError("An error occurred during fixed staking.");
      setIsFixedStaking(false);
    }
  };

  // Handle Fixed Unstaking
  const handleFixedUnstake = async () => {
    if (!selectedFixedStakeId) {
      setFixedError("Please select a stake to unstake.");
      return;
    }

    try {
      setFixedError("");
      setFixedTxHash("");
      setIsFixedStaking(true);

      const tx = await stakeContract.unstakeFixed(selectedFixedStakeId);
      setFixedTxHash(tx.hash);

      await tx.wait();

      // Refresh data
      const updatedStake = await stakeContract.fixedStakes(
        selectedFixedStakeId
      );
      if (updatedStake.withdrawn) {
        setFixedStakes((prevStakes) =>
          prevStakes.map((stake) =>
            stake.stakeId === selectedFixedStakeId
              ? { ...stake, withdrawn: true }
              : stake
          )
        );
        setFixedRewards((prevRewards) => ({
          ...prevRewards,
          [selectedFixedStakeId]: "0",
        }));
        setSelectedFixedStakeId(null);
      }

      setIsFixedStaking(false);
      alert("Fixed unstaking successful!");
    } catch (err) {
      console.error("Error during fixed unstaking:", err);
      setFixedError("Cannot Unstake yet.");
      setIsFixedStaking(false);
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

  return (
    <div className="bg-[#BB4938]/20 w-full p-6 rounded-xl shadow-lg">
      {/* Header */}
      {/* <h2 className="text-2xl font-semibold mb-10 text-center bg-white text-black w-fit px-5 mx-auto rounded-xl animate-pulse">
        Fixed
      </h2> */}

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
                <p className="text-gray-800 dark:text-gray-200 text-lg">
                  <strong>Wallet Balance:</strong> {userBalance} $SWINE
                </p>
                <div className="flex items-center mt-2">
                  <p className="text-gray-600 dark:text-gray-400 text-sm break-words">
                    <strong>Wallet Address:</strong> {truncatedAddress}
                  </p>
                  <button
                    onClick={copyWalletAddress}
                    className="ml-2 text-gray-600 dark:text-gray-400 hover:text-[#BB4938] dark:hover:text-[#BB4938] transition-colors duration-200"
                    aria-label="Copy Wallet Address">
                    <FiCopy size={18} />
                  </button>
                </div>
              </div>
            </div>
            {/* Pool Token Address */}
            {/* {poolTokenAddress && (
              <div className="flex items-center">
                <p className="text-gray-800 dark:text-gray-200 text-lg">
                  <strong>Pool Token:</strong>{" "}
                  <a
                    href={`https://airdao.io/explorer/address/${poolTokenAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline break-words">
                    {poolTokenAddress}
                  </a>
                </p>
              </div>
            )} */}
          </div>
        </div>
      )}

      {/* Staking Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (allowance < Number(fixedAmount)) {
            approveTokensFixed();
          } else {
            stakeFixed();
          }
        }}>
        {/* Amount Input */}
        <div className="mb-4">
          <label htmlFor="fixedAmount" className="block mb-2 mt-10 text-lg">
            Stake Swine:
          </label>
          <input
            id="fixedAmount"
            type="number"
            step="any"
            min="0"
            placeholder="Enter amount"
            value={fixedAmount}
            onChange={(e) => setFixedAmount(e.target.value)}
            className="w-full p-4 bg-black border border-[#BB4938] rounded-3xl text-right text-lg outline-none focus:border-[#ae3d2c] transition duration-150"
            required
          />
        </div>

        {/* Stake Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          className="mt-2 bg-[#BB4938] p-3 w-full rounded-2xl text-center font-semibold cursor-pointer hover:bg-[#ae3d2c] transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isFixedStaking}>
          {isFixedStaking ? (
            <div className="flex items-center justify-center">
              <LoadingSpinner />
              <span className="ml-2">Processing...</span>
            </div>
          ) : allowance < Number(fixedAmount) ? (
            "Approve & Stake"
          ) : (
            "Stake"
          )}
        </motion.button>
      </form>

      {/* Transaction Hash */}
      {fixedTxHash && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 p-2 bg-gray-800 rounded">
          <p className="text-lg">
            Transaction submitted.{" "}
            <a
              href={`https://airdao.io/explorer/tx/${fixedTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline">
              View on Explorer
            </a>
          </p>
        </motion.div>
      )}

      {/* Error Message */}
      {fixedError && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 p-2 bg-orange-600 rounded-xl">
          <p className="text-lg text-center">{fixedError}</p>
        </motion.div>
      )}

      {/* Display Fixed Stakes as Cards */}
      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4 mt-12">Your Stakes</h3>
        {fixedStakes.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {fixedStakes.map((stake) => (
              <div
                key={stake.stakeId}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 flex flex-col justify-between">
                <div>
                  <p className="text-gray-800 dark:text-gray-200 text-lg mb-2">
                    <strong>Stake ID:</strong> {stake.stakeId}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">
                    <strong>Amount:</strong> {stake.amount} Tokens
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">
                    <strong>Start Time:</strong> {stake.startTime}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">
                    <strong>End Time:</strong> {stake.endTime}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    <strong>Expected Reward:</strong>{" "}
                    {stake.expectedTotalReward} Tokens
                  </p>
                </div>
                <div className="mt-4">
                  <p
                    className={`text-sm font-semibold ${
                      stake.withdrawn ? "text-red-500" : "text-green-500"
                    } mb-2`}>
                    {stake.withdrawn ? "Unstaked" : "Active"}
                  </p>
                  {!stake.withdrawn && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="bg-red-600 px-4 py-2 rounded-md text-white hover:bg-red-700 transition-colors duration-300 w-full"
                      onClick={() => setSelectedFixedStakeId(stake.stakeId)}>
                      Unstake
                    </motion.button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-lg">You have no fixed stakes to unstake.</p>
        )}
      </div>

      {/* Confirm Unstake Modal for Fixed Staking */}
      <AnimatePresence>
        {selectedFixedStakeId && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}>
            <motion.div
              className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg w-11/12 max-w-md mx-auto"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.3 }}>
              <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                Confirm Unstake
              </h3>
              <p className="mb-6 text-gray-700 dark:text-gray-300">
                Are you sure you want to unstake?
              </p>
              <div className="flex justify-end space-x-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-gray-300 dark:bg-gray-600 px-4 py-2 rounded-md text-gray-800 dark:text-gray-200 hover:bg-gray-400 dark:hover:bg-gray-700 transition-colors duration-300"
                  onClick={() => setSelectedFixedStakeId(null)}
                  aria-label="Cancel Unstake">
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-red-600 dark:bg-red-700 px-4 py-2 rounded-md text-white hover:bg-red-700 dark:hover:bg-red-800 transition-colors duration-300"
                  onClick={handleFixedUnstake}
                  disabled={isFixedStaking}
                  aria-label="Confirm Unstake">
                  {isFixedStaking ? (
                    <div className="flex items-center justify-center">
                      <LoadingSpinner />
                      <span className="ml-2">Unstaking...</span>
                    </div>
                  ) : (
                    "Unstake"
                  )}
                </motion.button>
              </div>
              {/* Display Transaction Hash */}
              {/* {fixedTxHash && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 p-2 bg-gray-200 dark:bg-gray-700 rounded">
                  <p className="text-lg text-gray-800 dark:text-gray-200">
                    Transaction submitted.{" "}
                    <a
                      href={`https://airdao.io/explorer/tx/${fixedTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-blue-600 dark:text-blue-400">
                      View on Explorer
                    </a>
                  </p>
                </motion.div>
              )} */}
              {/* Display Error */}
              {fixedError && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 p-2 bg-orange-600 dark:bg-red-700 rounded-xl">
                  <p className="text-lg text-center text-white">{fixedError}</p>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FixedStakeComponent;
