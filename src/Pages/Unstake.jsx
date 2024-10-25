// src/Pages/Unstake.jsx

import React, { useEffect, useState } from "react";
import Navbar from "../Components/Navbar";
import { IoIosArrowDroprightCircle } from "react-icons/io";
import { ethers } from "ethers";
import { SwineStakeAddress, SwineABI, ERC20ABI } from "../Utils/Contract"; // Ensure ERC20ABI is defined
import { useAccount } from "wagmi";
import { formatUnits, parseUnits } from "ethers/lib/utils";

const Unstake = () => {
  // State variables for toggling between Fixed and Flexible
  const [unstakeMode, setUnstakeMode] = useState("fixed"); // 'fixed' or 'flexible'

  // State variables for Fixed Staking
  const [fixedStakes, setFixedStakes] = useState([]);
  const [fixedRewards, setFixedRewards] = useState({});
  const [selectedFixedStakeId, setSelectedFixedStakeId] = useState(null);
  const [isFixedUnstaking, setIsFixedUnstaking] = useState(false);
  const [fixedTxHash, setFixedTxHash] = useState("");
  const [fixedError, setFixedError] = useState("");

  // State variables for Flexible Staking
  const [flexibleStake, setFlexibleStake] = useState(null);
  const [flexibleRewards, setFlexibleRewards] = useState(0);
  const [flexibleTimeLeft, setFlexibleTimeLeft] = useState(0); // Blocks left
  const [flexibleUnstakeAmount, setFlexibleUnstakeAmount] = useState("");
  const [isFlexibleUnstaking, setIsFlexibleUnstaking] = useState(false);
  const [flexibleTxHash, setFlexibleTxHash] = useState("");
  const [flexibleError, setFlexibleError] = useState("");
  const [flexibleWarning, setFlexibleWarning] = useState(false);

  // General State Variables
  const [userBalance, setUserBalance] = useState("");
  const [allowance, setAllowance] = useState(0);
  const [poolTokenAddress, setPoolTokenAddress] = useState("");
  const [poolTokenDecimals, setPoolTokenDecimals] = useState(18); // Default to 18 decimals

  // Wagmi hook to get account data
  const { address, isConnected } = useAccount();

  // Initialize provider and signer
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);

  // Initialize contract instances
  const [stakeContract, setStakeContract] = useState(null);
  const [poolTokenContract, setPoolTokenContract] = useState(null);

  // Initialize ethers provider and signer when connected
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
      setFixedStakes([]);
      setFixedRewards({});
      setFlexibleStake(null);
      setFlexibleRewards(0);
      setFlexibleTimeLeft(0);
      setUserBalance("");
      setAllowance(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  // Fetch Pool Token Address
  useEffect(() => {
    const fetchPoolTokenAddress = async () => {
      if (stakeContract) {
        try {
          const tokenAddress = await stakeContract.stakingToken();
          setPoolTokenAddress(tokenAddress);
        } catch (err) {
          console.error("Error fetching pool token address:", err);
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
        }
      }
    };
    initPoolTokenContract();
  }, [poolTokenAddress, signer]);

  // Fetch User's Token Balance
  useEffect(() => {
    const fetchUserBalance = async () => {
      if (poolTokenContract && address) {
        try {
          const balance = await poolTokenContract.balanceOf(address);
          setUserBalance(formatUnits(balance, poolTokenDecimals));
        } catch (err) {
          console.error("Error fetching user balance:", err);
        }
      }
    };
    fetchUserBalance();
  }, [poolTokenContract, address, poolTokenDecimals]);

  // Fetch Allowance
  useEffect(() => {
    const fetchAllowance = async () => {
      if (poolTokenContract && address && stakeContract) {
        try {
          const currentAllowance = await poolTokenContract.allowance(
            address,
            SwineStakeAddress
          );
          setAllowance(
            Number(formatUnits(currentAllowance, poolTokenDecimals))
          );
        } catch (err) {
          console.error("Error fetching allowance:", err);
        }
      }
    };
    fetchAllowance();
  }, [poolTokenContract, address, stakeContract, poolTokenDecimals]);

  // Fetch User's Fixed Stakes and Rewards
  useEffect(() => {
    const fetchFixedStakes = async () => {
      if (stakeContract && address) {
        try {
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
        }
      }
    };
    fetchFixedStakes();
  }, [stakeContract, address, poolTokenDecimals]);

  // Fetch User's Flexible Stake, Rewards, and Time Left
  useEffect(() => {
    const fetchFlexibleStakeData = async () => {
      if (stakeContract && address) {
        try {
          const stake = await stakeContract.flexibleStakes(address);
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

          // Calculate blocks left to complete the next interval
          const blocksLeft =
            stakeContract.flexibleRewardInterval() - blocksSinceLastClaim;

          setFlexibleTimeLeft(blocksLeft > 0 ? blocksLeft : 0);
        } catch (err) {
          console.error("Error fetching flexible stake data:", err);
        }
      }
    };
    fetchFlexibleStakeData();
  }, [stakeContract, address, provider, poolTokenDecimals]);

  // Function to handle Fixed Unstaking
  const handleFixedUnstake = async () => {
    if (!selectedFixedStakeId) {
      setFixedError("Please select a stake to unstake.");
      return;
    }

    try {
      setFixedError("");
      setFixedTxHash("");
      setIsFixedUnstaking(true);

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

      setIsFixedUnstaking(false);
      alert("Fixed unstaking successful!");
    } catch (err) {
      console.error("Error during fixed unstaking:", err);
      setFixedError("An error occurred during fixed unstaking.");
      setIsFixedUnstaking(false);
    }
  };

  // Function to handle Flexible Unstaking
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
      setIsFlexibleUnstaking(true);

      const amount = parseUnits(flexibleUnstakeAmount, poolTokenDecimals);

      const tx = await stakeContract.unstakeFlexible(amount);
      setFlexibleTxHash(tx.hash);

      await tx.wait();

      // Refresh data
      const updatedFlexibleStake = await stakeContract.flexibleStakes(address);
      setFlexibleStake({
        amount: formatUnits(updatedFlexibleStake.amount, poolTokenDecimals),
        lastClaimBlock: updatedFlexibleStake.lastClaimBlock.toNumber(),
      });

      // Reset rewards and time left
      const updatedReward = await stakeContract.calculateFlexibleReward(
        address
      );
      setFlexibleRewards(formatUnits(updatedReward, poolTokenDecimals));

      const currentBlock = await provider.getBlockNumber();
      const blocksSinceLastClaim =
        currentBlock - updatedFlexibleStake.lastClaimBlock.toNumber();
      const blocksLeft =
        stakeContract.flexibleRewardInterval() - blocksSinceLastClaim;
      setFlexibleTimeLeft(blocksLeft > 0 ? blocksLeft : 0);

      setFlexibleUnstakeAmount("");
      setIsFlexibleUnstaking(false);
      alert("Flexible unstaking successful!");
    } catch (err) {
      console.error("Error during flexible unstaking:", err);
      setFlexibleError("An error occurred during flexible unstaking.");
      setIsFlexibleUnstaking(false);
    }
  };

  // Function to confirm Flexible Unstaking with forfeited rewards
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
      setIsFlexibleUnstaking(true);

      const amount = parseUnits(flexibleUnstakeAmount, poolTokenDecimals);

      const tx = await stakeContract.unstakeFlexible(amount);
      setFlexibleTxHash(tx.hash);

      await tx.wait();

      // Refresh data
      const updatedFlexibleStake = await stakeContract.flexibleStakes(address);
      setFlexibleStake({
        amount: formatUnits(updatedFlexibleStake.amount, poolTokenDecimals),
        lastClaimBlock: updatedFlexibleStake.lastClaimBlock.toNumber(),
      });

      // Reset rewards and time left
      const updatedReward = await stakeContract.calculateFlexibleReward(
        address
      );
      setFlexibleRewards(formatUnits(updatedReward, poolTokenDecimals));

      const currentBlock = await provider.getBlockNumber();
      const blocksSinceLastClaim =
        currentBlock - updatedFlexibleStake.lastClaimBlock.toNumber();
      const blocksLeft =
        stakeContract.flexibleRewardInterval() - blocksSinceLastClaim;
      setFlexibleTimeLeft(blocksLeft > 0 ? blocksLeft : 0);

      setFlexibleUnstakeAmount("");
      setIsFlexibleUnstaking(false);
      alert(
        "Flexible unstaking successful! Note: Accumulated rewards have been forfeited."
      );
    } catch (err) {
      console.error("Error during flexible unstaking:", err);
      setFlexibleError("An error occurred during flexible unstaking.");
      setIsFlexibleUnstaking(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white px-4 pt-24 pb-10 bg-custom-radial">
      <Navbar />
      <div className="w-full max-w-4xl mx-auto space-y-8">
        {/* Mode Toggle */}
        <div className="flex justify-center mb-8">
          <button
            className={`px-6 py-2 rounded-l-xl ${
              unstakeMode === "fixed"
                ? "bg-[#BB4938] text-black font-bold"
                : "bg-slate-600"
            }`}
            onClick={() => setUnstakeMode("fixed")}>
            Fixed
          </button>
          <button
            className={`px-6 py-2 rounded-r-xl ${
              unstakeMode === "flexible"
                ? "bg-[#BB4938] text-black font-bold"
                : "bg-slate-600"
            }`}
            onClick={() => setUnstakeMode("flexible")}>
            Flexible
          </button>
        </div>

        {/* Fixed Unstaking Section */}
        {unstakeMode === "fixed" && (
          <div className="bg-[#BB4938]/20 w-full p-6 rounded-xl shadow">
            <h2 className="text-2xl font-semibold mb-4">Fixed Unstake</h2>

            {/* Display Fixed Stakes */}
            {fixedStakes.length > 0 ? (
              <div>
                <table className="w-full text-left">
                  <thead>
                    <tr>
                      <th className="px-4 py-2">Stake ID</th>
                      <th className="px-4 py-2">Amount</th>
                      <th className="px-4 py-2">Start Block</th>
                      <th className="px-4 py-2">Accumulated Reward</th>
                      <th className="px-4 py-2">Status</th>
                      <th className="px-4 py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fixedStakes.map((stake) => (
                      <tr key={stake.stakeId} className="border-t">
                        <td className="px-4 py-2">{stake.stakeId}</td>
                        <td className="px-4 py-2">{stake.amount} Tokens</td>
                        <td className="px-4 py-2">{stake.startBlock}</td>
                        <td className="px-4 py-2">
                          {fixedRewards[stake.stakeId] || "0"} Tokens
                        </td>
                        <td className="px-4 py-2">
                          {stake.withdrawn ? "Unstaked" : "Active"}
                        </td>
                        <td className="px-4 py-2">
                          {!stake.withdrawn && (
                            <button
                              className="bg-red-600 px-3 py-1 rounded-md hover:bg-red-700 duration-300"
                              onClick={() =>
                                setSelectedFixedStakeId(stake.stakeId)
                              }>
                              Unstake
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Confirm Unstake Modal */}
                {selectedFixedStakeId && (
                  <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-slate-800 p-6 rounded-xl w-11/12 max-w-md">
                      <h3 className="text-xl font-semibold mb-4">
                        Confirm Unstake
                      </h3>
                      <p>
                        Are you sure you want to unstake Stake ID:{" "}
                        <strong>{selectedFixedStakeId}</strong>?
                      </p>
                      <div className="flex justify-end mt-6 space-x-4">
                        <button
                          className="bg-gray-600 px-4 py-2 rounded-md hover:bg-gray-700 duration-300"
                          onClick={() => setSelectedFixedStakeId(null)}>
                          Cancel
                        </button>
                        <button
                          className="bg-red-600 px-4 py-2 rounded-md hover:bg-red-700 duration-300"
                          onClick={handleFixedUnstake}
                          disabled={isFixedUnstaking}>
                          {isFixedUnstaking ? "Unstaking..." : "Unstake"}
                        </button>
                      </div>
                      {/* Display Transaction Hash */}
                      {fixedTxHash && (
                        <div className="mt-4 p-2 bg-gray-700 rounded">
                          <p>
                            Transaction submitted.{" "}
                            <a
                              href={`https://airdao.io/explorer/tx/${fixedTxHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline">
                              View on Explorer
                            </a>
                          </p>
                        </div>
                      )}
                      {/* Display Error */}
                      {fixedError && (
                        <div className="mt-4 p-2 bg-red-600 rounded">
                          <p>{fixedError}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p>You have no fixed stakes to unstake.</p>
            )}
          </div>
        )}

        {/* Flexible Unstaking Section */}
        {unstakeMode === "flexible" && (
          <div className="bg-[#BB4938]/20 w-full p-6 rounded-xl shadow">
            <h2 className="text-2xl font-semibold mb-4">Flexible Unstake</h2>

            {/* Display Flexible Stake */}
            {flexibleStake ? (
              <div>
                <p className="mb-2">
                  <strong>Staked Amount:</strong> {flexibleStake.amount} Tokens
                </p>
                <p className="mb-4">
                  <strong>Accumulated Rewards:</strong> {flexibleRewards} Tokens
                </p>
                <p className="mb-4">
                  <strong>
                    Time Left to Unstake Without Forfeiting Rewards:
                  </strong>{" "}
                  {flexibleTimeLeft > 0
                    ? `${flexibleTimeLeft} blocks left`
                    : "You can unstake now without forfeiting rewards."}
                </p>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleFlexibleUnstake();
                  }}>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="Amount to Unstake"
                    value={flexibleUnstakeAmount}
                    onChange={(e) => setFlexibleUnstakeAmount(e.target.value)}
                    className="w-full p-4 bg-black border border-[#BB4938] rounded-xl mt-4 text-right outline-none active:border-[#ae3d2c] duration-150"
                    required
                  />
                  <button
                    type="submit"
                    className="mt-6 bg-red-600 p-3 w-full rounded-xl text-center font-semibold cursor-pointer hover:bg-red-700 duration-300"
                    disabled={isFlexibleUnstaking}>
                    {isFlexibleUnstaking ? "Unstaking..." : "Unstake"}
                  </button>
                </form>

                {/* Display Warning if Attempting Early Unstake */}
                {flexibleWarning && (
                  <div className="mt-4 p-4 bg-yellow-600 rounded">
                    <p className="text-black">
                      Warning: Unstaking now will forfeit your accumulated
                      rewards. Do you wish to proceed?
                    </p>
                    <div className="flex justify-end mt-2 space-x-2">
                      <button
                        className="bg-gray-600 px-4 py-2 rounded-md hover:bg-gray-700 duration-300"
                        onClick={() => setFlexibleWarning(false)}>
                        Cancel
                      </button>
                      <button
                        className="bg-red-600 px-4 py-2 rounded-md hover:bg-red-700 duration-300"
                        onClick={confirmFlexibleUnstake}
                        disabled={isFlexibleUnstaking}>
                        {isFlexibleUnstaking ? "Unstaking..." : "Proceed"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Display Transaction Hash */}
                {flexibleTxHash && (
                  <div className="mt-4 p-2 bg-gray-700 rounded">
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
                {/* Display Error */}
                {flexibleError && (
                  <div className="mt-4 p-2 bg-red-600 rounded">
                    <p>{flexibleError}</p>
                  </div>
                )}
              </div>
            ) : (
              <p>You have no flexible stake to unstake.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Unstake;
