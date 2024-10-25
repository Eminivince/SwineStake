// src/Components/FixedStakeComponent.jsx

import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { SwineStakeAddress, SwineABI, ERC20ABI } from "../Utils/Contract";
import { formatUnits } from "ethers/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import LoadingSpinner from "./LoadingSpinner";

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

  // Initialize provider and signer
  useEffect(() => {
    if (isConnected && window.ethereum) {
      const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
      setProvider(web3Provider);
      const signerInstance = web3Provider.getSigner();
      setSigner(signerInstance);
      const contractInstance = new ethers.Contract(
        SwineStakeAddress,
        SwineABI,
        signerInstance
      );
      setStakeContract(contractInstance);
    } else {
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
    }
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
          setFixedError("Failed to fetch pool token information.");
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
          setFixedError("Failed to initialize pool token contract.");
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
      if (stakeContract && signer) {
        try {
          const address = await signer.getAddress();
          const stakeIds = await stakeContract.getUserFixedStakes(address);
          const stakes = await Promise.all(
            stakeIds.map(async (stakeId) => {
              const stake = await stakeContract.fixedStakes(stakeId);
              return {
                stakeId: stake.stakeId.toNumber(),
                amount: formatUnits(stake.amount, poolTokenDecimals),
                startBlock: stake.startBlock.toNumber(),
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
  }, [stakeContract, signer, poolTokenDecimals]);

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
          return {
            stakeId: stake.stakeId.toNumber(),
            amount: formatUnits(stake.amount, poolTokenDecimals),
            startBlock: stake.startBlock.toNumber(),
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
      setFixedError("An error occurred during fixed unstaking.");
      setIsFixedStaking(false);
    }
  };

  return (
    <div className="bg-[#BB4938]/20 w-full p-6 rounded-xl shadow-lg">
      <h2 className="text-2xl font-semibold mb-10 text-center bg-white text-black w-fit px-5 mx-auto rounded-xl animate-pulse ">Fixed</h2>

      {/* Display User Balance and Allowance */}
      {isConnected && (
        <div className="mb-6">
          <p className="text-lg">
            <strong>Wallet:</strong> {userBalance} $SWINE
          </p>
          
          {allowance < Number(fixedAmount) && (
            <p className="text-yellow-500 text-lg mt-2">
              <strong>Current Allowance:</strong> {allowance} Tokens
            </p>
          )}
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
          <label htmlFor="fixedAmount" className="block mb-2 text-lg">
            Amount to Stake:
          </label>
          <input
            id="fixedAmount"
            type="number"
            step="any"
            min="0"
            placeholder="Enter amount"
            value={fixedAmount}
            onChange={(e) => setFixedAmount(e.target.value)}
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
          className="mt-4 p-2 bg-red-600 rounded">
          <p className="text-lg">{fixedError}</p>
        </motion.div>
      )}

      {/* Display Fixed Stakes */}
      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4">Your Fixed Stakes</h3>
        {fixedStakes.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-transparent">
              <thead>
                <tr>
                  <th className="px-4 py-2 border-b border-gray-700">
                    Stake ID
                  </th>
                  <th className="px-4 py-2 border-b border-gray-700">Amount</th>
                  <th className="px-4 py-2 border-b border-gray-700">
                    Start Block
                  </th>
                  <th className="px-4 py-2 border-b border-gray-700">
                    Accumulated Reward
                  </th>
                  <th className="px-4 py-2 border-b border-gray-700">Status</th>
                  <th className="px-4 py-2 border-b border-gray-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {fixedStakes.map((stake) => (
                  <tr key={stake.stakeId} className="text-center">
                    <td className="px-4 py-2 border-b border-gray-700">
                      {stake.stakeId}
                    </td>
                    <td className="px-4 py-2 border-b border-gray-700">
                      {stake.amount} Tokens
                    </td>
                    <td className="px-4 py-2 border-b border-gray-700">
                      {stake.startBlock}
                    </td>
                    <td className="px-4 py-2 border-b border-gray-700">
                      {fixedRewards[stake.stakeId] || "0"} Tokens
                    </td>
                    <td className="px-4 py-2 border-b border-gray-700">
                      {stake.withdrawn ? (
                        <span className="text-red-500">Unstaked</span>
                      ) : (
                        <span className="text-green-500">Active</span>
                      )}
                    </td>
                    <td className="px-4 py-2 border-b border-gray-700">
                      {!stake.withdrawn && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="bg-red-600 px-3 py-1 rounded-md text-white hover:bg-red-700 transition-colors duration-300"
                          onClick={() =>
                            setSelectedFixedStakeId(stake.stakeId)
                          }>
                          Unstake
                        </motion.button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-lg">You have no fixed stakes to unstake.</p>
        )}
      </div>

      {/* Confirm Unstake Modal for Fixed Staking */}
      <AnimatePresence>
        {selectedFixedStakeId && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
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
                Are you sure you want to unstake Stake ID:{" "}
                <strong>{selectedFixedStakeId}</strong>?
              </p>
              <div className="flex justify-end space-x-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-gray-300 dark:bg-gray-600 px-4 py-2 rounded-md text-gray-800 dark:text-gray-200 hover:bg-gray-400 dark:hover:bg-gray-700 transition-colors duration-300"
                  onClick={() => setSelectedFixedStakeId(null)}>
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-red-600 dark:bg-red-700 px-4 py-2 rounded-md text-white hover:bg-red-700 dark:hover:bg-red-800 transition-colors duration-300"
                  onClick={handleFixedUnstake}
                  disabled={isFixedStaking}>
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
              {fixedTxHash && (
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
              )}
              {/* Display Error */}
              {fixedError && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 p-2 bg-red-600 dark:bg-red-700 rounded">
                  <p className="text-lg text-white">{fixedError}</p>
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
