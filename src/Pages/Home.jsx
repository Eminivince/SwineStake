// src/Pages/Home.jsx

import React from "react";
import Logo from "../Images/Logo.png";
import SitSwine from "../Images/sitswine.png";
import { FiArrowUpRight } from "react-icons/fi";
import BigSwine from "../Images/bigswine.png";
import SwineSpace from "../Images/maxispace.png";
import Winged from "../Images/spitCash.png";
import { Link } from "react-router-dom";
import Navbar from "../Components/Navbar";
import { motion, AnimatePresence } from "framer-motion"; // Added AnimatePresence for potential modals

const Home = () => {
  // Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0 },
  };

  const buttonVariants = {
    hover: {
      scale: 1.05,
      boxShadow: "0px 0px 8px rgb(255,255,255)",
    },
    tap: {
      scale: 0.95,
    },
  };

  return (
    <div className="relative bg-black text-white md:px-10 md:pt-10 pt-[180px] pb-10">
      {/* Gradient Overlay */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-full h-1/3 bg-gradient-radial from-red-500 via-transparent to-transparent pointer-events-none"></div>

      <Navbar />

      <motion.section
        className="mx-auto w-fit relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible">
        {/* Main Heading */}
        <motion.h1
          className="md:text-[70px] text-[30px] font-bold text-center leading-snug text-gradient"
          variants={itemVariants}>
          Earn Rewards by Staking
          <br /> Your Swine
        </motion.h1>

        {/* Subheading */}
        <motion.p
          className="md:text-[25px] text-[10px] text-center text-gradient mt-4"
          variants={itemVariants}>
          Stake your crypto and earn interest with minimal effort
        </motion.p>

        {/* Get Started Button */}
        <motion.div
          className="bg-gradient-to-r from-white to-black text-[#BB4938] w-fit mx-auto mt-10 md:py-3 md:px-10 py-2 px-5 rounded-3xl z-50 hover:scale-110 cursor-pointer"
          variants={itemVariants}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}>
          <Link to="/stake">Get Started</Link>
        </motion.div>

        {/* Decorative Images with pointer-events-none */}
        <motion.img
          src={SwineSpace}
          alt="Swine Space"
          className="absolute md:-top-16 top-[55px] z-0 w-[300px] md:w-[750px] pointer-events-none"
          variants={itemVariants}
        />
        <div>
            
        </div>
        <motion.img
          src={Winged}
          alt="Winged Swine"
          className="absolute md:right-10 right-2 z-0 w-[150px] md:w-[750px] pointer-events-none opacity-0"
          variants={itemVariants}
        />

        {/* How It Works Section */}
        <motion.section
          className="mt-72 mx-auto"
          variants={containerVariants}
          initial="hidden"
          animate="visible">
          <motion.h1
            className="text-center md:text-[50px] text-[30px] mb-4"
            variants={itemVariants}>
            How it works
          </motion.h1>
          <motion.p
            className="text-center md:text-[25px] mb-8"
            variants={itemVariants}>
            Staking involves holding and locking up your token to support a{" "}
            blockchain network, and earning rewards for contributing.
          </motion.p>

          {/* Steps */}
          <motion.div
            className="flex md:flex-row flex-col md:space-x-8 space-y-8 mt-12"
            variants={containerVariants}
            initial="hidden"
            animate="visible">
            {/* Step 1 */}
            <motion.div
              className="flex flex-col justify-between bg-[#BB4938] p-5 rounded-md md:w-[400px] h-[226px] w-[90%] mx-auto"
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}>
              <div className="flex justify-between items-center">
                <img src={Logo} alt="Logo" className="w-8 h-8" />
                <p className="border px-4 py-1 rounded-lg">Add +</p>
              </div>
              <p className="text-[28px] mt-4">
                Connect <br /> your wallet
              </p>
            </motion.div>

            {/* Step 2 */}
            <motion.div
              className="flex flex-col justify-between bg-slate-900 p-5 rounded-md md:w-[400px] w-[90%] mx-auto h-[226px]"
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}>
              <div className="flex justify-between items-center">
                <h1 className="text-white text-2xl">
                  1874.34 <span className="text-slate-500">$SWINE</span>
                </h1>
                {/* Empty space or icon can be added here */}
              </div>
              <p className="text-[28px] mt-4">
                Enter your <br /> stake amount
              </p>
            </motion.div>

            {/* Step 3 */}
            <motion.div
              className="flex flex-col justify-between bg-slate-900 p-5 rounded-md md:w-[400px] w-[90%] mx-auto h-[226px]"
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}>
              <div className="flex justify-between items-center">
                <div className="flex flex-col justify-between">
                  <h1 className="text-white text-2xl"></h1>
                  <p className="text-[20px]">
                    Receive income <br /> automatically
                  </p>
                </div>
                <img src={SitSwine} alt="Sit Swine" className="w-12 h-12" />
              </div>
            </motion.div>
          </motion.div>
        </motion.section>

        {/* Features Section */}
        <motion.section
          className="mx-auto w-[90%] mt-20"
          variants={containerVariants}
          initial="hidden"
          animate="visible">
          <motion.h1
            className="md:text-[50px] text-[25px] font-bold text-center mb-8"
            variants={itemVariants}>
            Features
          </motion.h1>

          <motion.div
            className="flex md:flex-row flex-col md:space-x-8 space-y-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible">
            {/* Feature 1 */}
            <motion.div
              className="bg-slate-700 p-5 md:w-[606px] md:h-[180px] rounded-lg flex flex-col justify-between"
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}>
              <div className="flex justify-between mb-4">
                <h1 className="text-white text-xl"></h1>
                <FiArrowUpRight className="text-white text-2xl" />
              </div>
              <div className="h-32">
                <h1 className="md:text-[40px] text-[20px]">
                  Stake <span className="text-[#BB4938]">$SWINE</span>
                </h1>
                <p className="md:text-[24px] text-[12px]">
                  Lockup your token & get rewarded
                </p>
              </div>
            </motion.div>

            {/* Feature 2 */}
            <motion.div
              className="bg-slate-700 p-5 md:w-[606px] opacity-50 md:h-[180px] rounded-lg flex flex-col justify-between"
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}>
              <div className="h-32">
                <h1 className="md:text-[40px] text-[20px]">
                  Tip <span className="text-[#BB4938]">$SWINE</span>
                </h1>
                <p className="md:text-[24px] text-[12px]">Coming soon!</p>
              </div>
            </motion.div>
          </motion.div>
        </motion.section>

        {/* Big Swine Image */}
        <motion.section
          className="w-fit mx-auto mt-10"
          variants={itemVariants}
          initial="hidden"
          animate="visible">
          <motion.img
            src={BigSwine}
            alt="Big Swine"
            className="md:w-[300px] w-[150px]"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          />
        </motion.section>
      </motion.section>
    </div>
  );
};

export default Home;
