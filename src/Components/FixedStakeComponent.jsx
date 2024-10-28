// src/Components/FixedStakeComponent.jsx

import React, { useEffect, useState } from "react";

import { ethers } from "ethers";
import {
  SwineStakeAddress,
  SwineABI,
  ERC20ABI,
  SWINE_TOKEN_ABI,
  UNISWAP_V2_PAIR_ABI,
} from "../Utils/Contract";
import { formatUnits } from "ethers/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import LoadingSpinner from "./LoadingSpinner";
import { FiCopy, FiTrendingUp, FiPercent } from "react-icons/fi"; // Icons for TVL and APY
import { IoMdRefresh } from "react-icons/io";
import axios from "axios";

const FixedStakeComponent = ({ isConnected }) => {
  // State variables
  const [userBalance, setUserBalance] = useState("");
  const [totalStaked, setTotalStaked] = useState("0");
  const [AMBToUSD, setAMBUSDPrice] = useState("0");

  const [swinePrice, setSwinePrice] = useState("");
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

  // New State Variables for TVL and APY
  const [tvl, setTvl] = useState("");
  const [apy, setApy] = useState("");

  // Constants (Adjust these based on your contract's parameters)
  const STAKING_DURATION_DAYS = 30; // Staking period in days
  const ANNUAL_REWARD_RATE = 0.3; // 30% annual reward rate

  useEffect(() => {
    const getPriceUSD = async () => {
      calculateSwinePriceAndMc();
    };
    getPriceUSD();
  }, [AMBToUSD]);

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
        setTvl("");
        setApy("");
      }
    };
    initializeProvider();
  }, [isConnected]);

  // Calculate Total Staked Balance
  useEffect(() => {
    const calculateTotalStaked = () => {
      if (fixedStakes.length === 0) {
        setTotalStaked("0");
        return;
      }

      const total = fixedStakes.reduce((acc, stake) => {
        return acc + parseFloat(stake.amount);
      }, 0);

      setTotalStaked(total.toFixed(2));
    };

    calculateTotalStaked();
  }, [fixedStakes]);

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
    handleRefresh();
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
          const currentAPY = await stakeContract.fixedAPY();
          // Assuming APY is returned in basis points (e.g., 300 for 3%)
          const formattedAPY = (currentAPY.toNumber() / 100).toFixed(2);
          setApy(formattedAPY);
        } catch (err) {
          console.error("Error fetching TVL and APY:", err);
          setFixedError("Failed to fetch TVL and APY.");
        }
      }
    };
    fetchTVLAndAPY();
  }, [stakeContract, poolTokenContract, poolTokenDecimals]);

  // Approve tokens for Fixed staking
  const approveTokensFixed = async () => {
    setFixedError("");
    setFixedTxHash("");

    if (!poolTokenContract) {
      setFixedError("Please Connect Wallet.");
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

  // Handle TVL and APY Refresh
  const handleRefresh = async () => {
    setFixedError("");
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
        const currentAPY = await stakeContract.fixedAPY();
        const formattedAPY = (currentAPY.toNumber() / 100).toFixed(2); // Assuming APY is in basis points
        setApy(formattedAPY);
      }
    } catch (err) {
      console.error("Error refreshing TVL and APY:", err);
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

      if (response.data.amber.usd) {
        setAMBUSDPrice(response.data.amber.usd);
      }
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

      setSwinePrice(swinePriceInUsd);

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

  return (
    <div className="bg-[#BB4938]/20 md:w-[600px] mx-auto p-6 rounded-xl shadow-lg">
      {/* Header */}

      {/* TVL and APY Information */}
      <div className="flex space-x-6 justify-between items-center mb-6">
        {/* TVL Card */}
        <div className="flex items-center  px-5 bg-gray-800 rounded-xl shadow-md p-3 sm:mb-0">
          <FiTrendingUp size={12} className="text-green-500 mr-3" />
          <div className="">
            <p className="text-gray-300 text-center">TVL</p>
            <p className="font-semibold text-white">
              {tvl && swinePrice ? (
                `$${Number(tvl * swinePrice).toFixed(3)}`
              ) : (
                <LoadingSpinner />
              )}
            </p>
          </div>
        </div>

        {/* APY Card */}
        <div className="flex items-center px-5  bg-gray-800 rounded-xl shadow-md p-3 text-center">
          <FiPercent size={12} className="text-blue-500 mr-3" />
          <div>
            <p className="text-gray-300">APY</p>
            <p className="font-semibold text-white">
              {apy ? `${apy}%` : "30.00%"}
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
          <div className="bg-gray-800 rounded-xl shadow-md p-6 flex flex-col sm:flex-row items-center justify-between">
            {/* Wallet Information */}
            <div className="flex items-center sm:mb-0 md: w-fit mx-auto">
              <div className="bg-gray-700 p-3 rounded-full mr-4">
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
                <p className="text-gray-200">
                  <strong>Bal:</strong> {userBalance} $SWINE
                </p>
                {/* New Total Staked Balance Display */}
                <p className="text-gray-200 mt-2">
                  <strong>Staked:</strong> {totalStaked} $SWINE
                </p>
                <div className="flex items-center mt-2">
                  <p className="text-gray-400 text-sm break-words">
                    <strong>Wallet Address:</strong> {truncatedAddress}
                  </p>
                  <button
                    onClick={copyWalletAddress}
                    className="ml-2 text-gray-400 hover:text-[#BB4938] transition-colors duration-200"
                    aria-label="Copy Wallet Address">
                    <FiCopy size={18} />
                  </button>
                </div>
              </div>
            </div>
            {/* Pool Token Address */}
            {/* Uncomment if you want to display pool token address
            {poolTokenAddress && (
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
            )}
            */}
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
        {/* Amount Input with Max Button */}
        <div className="mb-4">
          <label htmlFor="fixedAmount" className="block mb-2 mt-10 text-lg">
            Stake Swine:
          </label>
          <div className="flex">
            <input
              id="fixedAmount"
              type="number"
              step="any"
              min="0"
              placeholder="Enter amount"
              value={fixedAmount}
              onChange={(e) => setFixedAmount(e.target.value)}
              className="flex-1 p-4 bg-black border border-[#BB4938] rounded-l-2xl text-right text-lg outline-none focus:border-[#ae3d2c] transition duration-150"
              required
            />
            <button
              type="button"
              onClick={() => setFixedAmount(userBalance)}
              className={`bg-[#BB4938] text-white px-4 py-4 rounded-r-2xl hover:bg-[#ae3d2c] transition-colors duration-200 ${
                Number(userBalance) === 0 ? "opacity-50 cursor-not-allowed" : ""
              }`}
              aria-label="Set maximum staking amount"
              disabled={Number(userBalance) === 0}>
              Max
            </button>
          </div>
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
              className="underline text-blue-400">
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
      <div className="mt-8 text-center">
        <h3 className="text-xl font-semibold mb-4 mt-12">Your Stakes</h3>
        {fixedStakes.length > 0 ? (
          <div className="grid md:flex md:flex-col grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {fixedStakes.map((stake) => (
              <div
                key={stake.stakeId}
                className="bg-gray-800 rounded-xl shadow-md p-6 flex flex-col justify-between">
                <div>
                  <p className="text-gray-200 text-lg mb-2">
                    <strong>Stake:</strong> {stake.stakeId}
                  </p>
                  <p className="text-gray-400 text-sm mb-1">
                    <strong>Amount:</strong> {stake.amount} Tokens
                  </p>
                  <p className="text-gray-400 text-sm mb-1">
                    <strong>Start Time:</strong> {stake.startTime}
                  </p>
                  <p className="text-gray-400 text-sm mb-1">
                    <strong>End Time:</strong> {stake.endTime}
                  </p>
                  <p className="text-gray-400 text-sm">
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
          <p className="text-lg">You have no stake at the moment.</p>
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
              className="bg-gray-800 p-6 rounded-xl shadow-lg w-11/12 max-w-md mx-auto"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.3 }}>
              <h3 className="text-xl font-semibold mb-4 text-white">
                Confirm Unstake
              </h3>
              <p className="mb-6 text-gray-300">
                Are you sure you want to unstake?
              </p>
              <div className="flex justify-end space-x-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-gray-600 px-4 py-2 rounded-md text-gray-200 hover:bg-gray-700 transition-colors duration-300"
                  onClick={() => setSelectedFixedStakeId(null)}
                  aria-label="Cancel Unstake">
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-red-700 px-4 py-2 rounded-md text-white hover:bg-red-800 transition-colors duration-300"
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
              {/* Display Error */}
              {fixedError && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 p-2 bg-red-700 rounded-xl">
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
