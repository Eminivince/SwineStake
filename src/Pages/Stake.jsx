// src/Pages/Stake.jsx

import React, { useEffect, useState } from "react";
import Navbar from "../Components/Navbar";
import { IoIosArrowDroprightCircle } from "react-icons/io";
import { ethers } from "ethers";
import { SwineStakeAddress, SwineABI } from "../Utils/Contract";
import { ERC20ABI } from "../Utils/Contract"; // Ensure you have this ABI defined
import { useAccount } from "wagmi";

const Stake = () => {
  // State variables for user inputs
  // For fixed staking
  const [fixedAmount, setFixedAmount] = useState("");

  // For flexible staking
  const [flexibleAmount, setFlexibleAmount] = useState("");

  // State variables for wallet and transactions
  const [userBalance, setUserBalance] = useState("");
  // For fixed staking
  const [isFixedStaking, setIsFixedStaking] = useState(false);
  const [fixedTxHash, setFixedTxHash] = useState("");
  const [fixedError, setFixedError] = useState("");

  // For flexible staking
  const [isFlexibleStaking, setIsFlexibleStaking] = useState(false);
  const [flexibleTxHash, setFlexibleTxHash] = useState("");
  const [flexibleError, setFlexibleError] = useState("");

  // Wagmi hook to get account data
  const { address, isConnected } = useAccount();

  // Initialize provider and signer
  const [signer, setSigner] = useState(null);
  const [provider, setProvider] = useState(null);

  // Shared allowance
  const [allowance, setAllowance] = useState(0);
  const [poolTokenDecimals, setPoolTokenDecimals] = useState(18); // Default to 18 decimals

  useEffect(() => {
    if (isConnected) {
      const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
      setProvider(web3Provider);
      const signerInstance = web3Provider.getSigner();
      setSigner(signerInstance);
    } else {
      setSigner(null);
      setProvider(null);
      setUserBalance("");
      setAllowance(0);
    }
  }, [isConnected]);

  // Initialize contract instances
  const stakeContract = signer
    ? new ethers.Contract(SwineStakeAddress, SwineABI, signer)
    : null;

  // State for poolToken address
  const [poolTokenAddress, setPoolTokenAddress] = useState("");

  // Initialize poolToken contract
  const poolTokenContract = poolTokenAddress
    ? new ethers.Contract(poolTokenAddress, ERC20ABI, signer)
    : null;

  // Fetch poolToken address from SwineStake contract
  const fetchPoolToken = async () => {
    try {
      if (isConnected && address && stakeContract) {
        const tokenAddress = await stakeContract.stakingToken();
        setPoolTokenAddress(tokenAddress);
      }
    } catch (err) {
      console.error("Error fetching poolToken address:", err);
      setFixedError("Failed to fetch pool token information.");
      setFlexibleError("Failed to fetch pool token information.");
    }
  };

  // Fetch token decimals
  const fetchTokenDecimals = async () => {
    try {
      if (poolTokenContract) {
        const decimals = await poolTokenContract.decimals();
        setPoolTokenDecimals(decimals);
      }
    } catch (err) {
      console.error("Error fetching token decimals:", err);
      setFixedError("Failed to fetch token decimals.");
      setFlexibleError("Failed to fetch token decimals.");
    }
  };

  // Fetch user's token balance
  const getUserBalance = async () => {
    try {
      if (poolTokenContract && address) {
        console.log(poolTokenContract);
        console.log(address);
        const balance = await poolTokenContract.balanceOf(address);
        setUserBalance(ethers.utils.formatUnits(balance, poolTokenDecimals));
      }
    } catch (err) {
      console.error("Error getting user balance:", err);
      setFixedError("Failed to fetch balance.");
      setFlexibleError("Failed to fetch balance.");
    }
  };

  // Fetch token allowance
  const fetchAllowance = async () => {
    try {
      if (poolTokenContract && address && stakeContract) {
        const currentAllowance = await poolTokenContract.allowance(
          address,
          SwineStakeAddress
        );
        setAllowance(
          Number(ethers.utils.formatUnits(currentAllowance, poolTokenDecimals))
        );
      }
    } catch (err) {
      console.error("Error fetching allowance:", err);
      setFixedError("Failed to fetch token allowance.");
      setFlexibleError("Failed to fetch token allowance.");
    }
  };

  // Fetch poolToken address and balance when connected
  useEffect(() => {
    if (isConnected) {
      fetchPoolToken();
      getUserBalance();
    } else {
      setPoolTokenAddress("");
      setUserBalance("");
      setAllowance(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address, stakeContract]);

  // Fetch token decimals whenever poolTokenAddress changes
  useEffect(() => {
    if (poolTokenContract) {
      fetchTokenDecimals();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poolTokenAddress]);

  // Fetch allowance whenever poolTokenContract, address, stakeContract, or amount changes
  useEffect(() => {
    if (
      poolTokenContract &&
      address &&
      stakeContract &&
      (fixedAmount || flexibleAmount)
    ) {
      fetchAllowance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poolTokenContract, address, stakeContract, fixedAmount, flexibleAmount]);

  // Approve tokens for fixed staking
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
      fetchAllowance();

      setIsFixedStaking(false);
      alert("Token approval successful!");
    } catch (err) {
      console.error("Error during token approval:", err);
      setFixedError("An error occurred during token approval.");
      setIsFixedStaking(false);
    }
  };

  // Stake tokens in fixed mode
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
      getUserBalance();
      fetchAllowance();

      setIsFixedStaking(false);
      alert("Fixed staking successful!");
    } catch (err) {
      console.error("Error during fixed staking:", err);
      setFixedError("An error occurred during fixed staking.");
      setIsFixedStaking(false);
    }
  };

  // Approve tokens for flexible staking
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
      fetchAllowance();

      setIsFlexibleStaking(false);
      alert("Token approval successful!");
    } catch (err) {
      console.error("Error during token approval:", err);
      setFlexibleError("An error occurred during token approval.");
      setIsFlexibleStaking(false);
    }
  };

  // Stake tokens in flexible mode
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
      getUserBalance();
      fetchAllowance();

      setIsFlexibleStaking(false);
      alert("Flexible staking successful!");
    } catch (err) {
      console.error("Error during flexible staking:", err);
      setFlexibleError("An error occurred during flexible staking.");
      setIsFlexibleStaking(false);
    }
  };

  // Claim rewards in flexible mode
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

      setIsFlexibleStaking(false);
      alert("Flexible rewards claimed successfully!");
    } catch (err) {
      console.error("Error during claiming flexible rewards:", err);
      setFlexibleError("An error occurred during claiming flexible rewards.");
      setIsFlexibleStaking(false);
    }
  };

  return (
    <div className="bg-black text-white px-10 pt-10 pb-10 bg-custom-radial">
      <Navbar />
      <div className="flex flex-col lg:flex-row md:w-fit mx-auto mt-20 space-y-14 lg:space-y-0 lg:space-x-14">
        {/* Fixed Staking Card */}
        <div className="bg-[#BB4938]/20 w-full lg:w-[500px] p-10 rounded-xl shadow ">
          <div className="flex justify-between">
            <h1></h1>
            <div className="bg-white w-fit py-3 px-6 text-black font-bold rounded-2xl animate-pulse origin-bottom -rotate-12">
              FIXED
            </div>
          </div>

          <h1 className="pt-7 text-[23px]">Fixed Stake</h1>

          {/* Display User Balance */}
          {isConnected && (
            <div className="mt-4">
              <p>Your Balance: {userBalance} Tokens</p>
              {poolTokenAddress && (
                <p>
                  Pool Token Address:{" "}
                  <a
                    href={`https://airdao.io/explorer/address/${poolTokenAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline break-words">
                    {poolTokenAddress}
                  </a>
                </p>
              )}
              {allowance < Number(fixedAmount) && (
                <p className="text-yellow-500">
                  Current Allowance: {allowance} Tokens
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
            <input
              type="number"
              step="any"
              min="0"
              placeholder="$0.00"
              value={fixedAmount}
              onChange={(e) => setFixedAmount(e.target.value)}
              className="w-full p-4 bg-black border border-[#BB4938] rounded-xl mt-4 text-right outline-none active:border-[#ae3d2c] duration-150"
              required
            />

            {/* Stake Button */}
            <button
              type="submit"
              className="mt-8 bg-[#BB4938] p-3 w-full rounded-xl text-center font-semibold cursor-pointer hover:brightness-125 duration-300 hover:text-black ring-0"
              disabled={isFixedStaking}>
              {isFixedStaking
                ? "Processing..."
                : allowance < Number(fixedAmount)
                ? "Approve & Stake"
                : "Stake"}
            </button>
          </form>

          {/* Transaction Hash */}
          {fixedTxHash && (
            <div className="mt-4 p-2 bg-gray-800 rounded">
              <p>
                Transaction submitted.{" "}
                <a
                  href={`https://airdao.io/explorer/tx/${fixedTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline break-words">
                  View on Explorer
                </a>
              </p>
            </div>
          )}

          {/* Error Message */}
          {fixedError && (
            <div className="mt-4 p-2 bg-red-600 rounded">
              <p>{fixedError}</p>
            </div>
          )}

          {/* Additional Info */}
          <div className="mt-14 text-[20px]">
            <div className="flex justify-between">
              <h1 className="opacity-50">Duration</h1>
              <div className="flex items-center space-x-3 cursor-pointer hover:brightness-75 duration-150">
                <h1>30 Days</h1>
                <IoIosArrowDroprightCircle />
              </div>
            </div>
            <hr className="opacity-50 mt-3" />
          </div>
          <div className="mt-8 text-[20px]">
            <div className="flex justify-between">
              <h1 className="opacity-50">Transaction Fee</h1>
              <h1>0 AMB</h1>
            </div>
            <hr className="opacity-50 mt-3" />
          </div>

          <div className="bg-black mt-10 p-3 rounded-xl flex justify-between">
            <div>
              <h1>RECEIVE</h1>
              <h1 className="mt-1">
                0.00 <span className="text-[#BB4938]">$SWINE</span>
              </h1>
            </div>
            <div>
              <h1>REWARD</h1>
              <h1 className="mt-1">
                0.00 <span className="text-[#BB4938]">30%</span>
              </h1>
            </div>
          </div>
        </div>

        {/* Flexible Staking Card */}
        <div className="bg-[#BB4938]/20 w-full lg:w-[500px] p-10 rounded-xl shadow">
          <div className="flex justify-between">
            <h1></h1>
            <div className=" w-fit py-3 px-6 text-black font-bold rounded-2xl animate-pulse origin-bottom -rotate-12">
              FLEXIBLE
            </div>
          </div>

          <h1 className="pt-7 text-[23px]">Flexible Stake</h1>

          {/* Display User Balance */}
          {isConnected && (
            <div className="mt-4">
              <p>Your Balance: {userBalance} Tokens</p>
              {poolTokenAddress && (
                <p>
                  Pool Token Address:{" "}
                  <a
                    href={`https://airdao.io/explorer/address/${poolTokenAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline break-words">
                    {poolTokenAddress}
                  </a>
                </p>
              )}
              {allowance < Number(flexibleAmount) && (
                <p className="text-yellow-500">
                  Current Allowance: {allowance} Tokens
                </p>
              )}
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
            <input
              type="number"
              step="any"
              min="0"
              placeholder="$0.00"
              value={flexibleAmount}
              onChange={(e) => setFlexibleAmount(e.target.value)}
              className="w-full p-4 bg-black border border-[#BB4938] rounded-xl mt-4 text-right outline-none active:border-[#ae3d2c] duration-150"
              required
            />

            {/* Stake Button */}
            <button
              type="submit"
              className="mt-8 bg-[#BB4938] p-3 w-full rounded-xl text-center font-semibold cursor-pointer hover:brightness-125 duration-300 hover:text-black ring-0"
              disabled={isFlexibleStaking}>
              {isFlexibleStaking
                ? "Processing..."
                : allowance < Number(flexibleAmount)
                ? "Approve & Stake"
                : "Stake"}
            </button>
          </form>

          {/* Claim Rewards Button */}
          <button
            onClick={claimFlexibleRewards}
            className="mt-4 bg-[#BB4938] p-3 w-full rounded-xl text-center font-semibold cursor-pointer hover:brightness-125 duration-300 hover:text-black ring-0"
            disabled={isFlexibleStaking}>
            {isFlexibleStaking ? "Processing..." : "Claim Rewards"}
          </button>

          {/* Transaction Hash */}
          {flexibleTxHash && (
            <div className="mt-4 p-2 bg-gray-800 rounded">
              <p>
                Transaction submitted.{" "}
                <a
                  href={`https://airdao.io/explorer/tx/${flexibleTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline">
                  View on Explorer
                </a>
              </p>
            </div>
          )}

          {/* Error Message */}
          {flexibleError && (
            <div className="mt-4 p-2 bg-red-600 rounded">
              <p>{flexibleError}</p>
            </div>
          )}

          {/* Additional Info */}
          <div className="mt-14 text-[20px]">
            <div className="flex justify-between">
              <h1 className="opacity-50">Rewards</h1>
              <div className="flex items-center space-x-3 cursor-pointer hover:brightness-75 duration-150">
                <h1>Earn rewards every 6 hours</h1>
                <IoIosArrowDroprightCircle />
              </div>
            </div>
            <hr className="opacity-50 mt-3" />
          </div>
          <div className="mt-8 text-[20px]">
            <div className="flex justify-between">
              <h1 className="opacity-50">Transaction Fee</h1>
              <h1>0 AMB</h1>
            </div>
            <hr className="opacity-50 mt-3" />
          </div>

          <div className="bg-black mt-10 p-3 rounded-xl flex justify-between">
            <div>
              <h1>RECEIVE</h1>
              <h1 className="mt-1">
                0.00 <span className="text-[#BB4938]">$SWINE</span>
              </h1>
            </div>
            <div>
              <h1>REWARD</h1>
              <h1 className="mt-1">
                0.00 <span className="text-[#BB4938]">10%</span>
              </h1>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Stake;
