// src/Pages/Stake.jsx

import React, { useState } from "react";
import Navbar from "../Components/Navbar";
import { motion, AnimatePresence } from "framer-motion";
import FixedStakeComponent from "../Components/FixedStakeComponent";
import FlexibleStakeComponent from "../Components/FlexibleStakeComponent";
import { useAccount } from "wagmi";

const Stake = () => {
  const [stakingMode, setStakingMode] = useState("fixed"); // 'fixed' or 'flexible'
  const { isConnected } = useAccount();

  return (
    <div className="min-h-screen bg-black text-white px-4 pt-24 pb-10 bg-custom-radial">
      <Navbar />
      <div className="w-full max-w-6xl mx-auto space-y-8">
        {/* Mode Toggle */}
        <div className="flex justify-center mb-8 space-x-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`px-6 py-2 rounded-l-xl transition-colors duration-300 ${
              stakingMode === "fixed"
                ? "bg-[#BB4938] text-black font-bold shadow-lg"
                : "bg-slate-600 hover:bg-slate-700"
            }`}
            onClick={() => setStakingMode("fixed")}>
            Fixed
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`px-6 py-2 rounded-r-xl transition-colors duration-300 ${
              stakingMode === "flexible"
                ? "bg-[#BB4938] text-black font-bold shadow-lg"
                : "bg-slate-600 hover:bg-slate-700"
            }`}
            onClick={() => setStakingMode("flexible")}>
            Flexible
          </motion.button>
        </div>

        {/* Staking Sections */}
        <AnimatePresence mode="wait">
          {stakingMode === "fixed" ? (
            <motion.div
              key="fixed"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ duration: 0.5 }}>
              <FixedStakeComponent isConnected={isConnected} />
            </motion.div>
          ) : (
            <motion.div
              key="flexible"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.5 }}>
              <FlexibleStakeComponent isConnected={isConnected} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Stake;
