// src/Pages/HowItWorks.jsx

import React, { useState } from "react";
import { motion } from "framer-motion";
import { FaWallet, FaLock, FaCoins } from "react-icons/fa";
import Navbar from "../Components/Navbar";
import Footer from "../Components/Footer"; // Assume you have a Footer component
import SwineIllustration from "../Images/sitswine.png"; // Placeholder for an illustrative image

const HowItWorks = () => {
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

  // FAQ Item Component
  const FAQItem = ({ question, answer }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <motion.div className="border-b pb-4" variants={itemVariants}>
        <button
          className="flex justify-between items-center w-full text-left text-xl font-semibold text-gray-800 hover:text-primary focus:outline-none"
          onClick={() => setIsOpen(!isOpen)}>
          {question}
          <span className="text-2xl">{isOpen ? "-" : "+"}</span>
        </button>
        {isOpen && (
          <motion.p
            className="text-gray-600 mt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}>
            {answer}
          </motion.p>
        )}
      </motion.div>
    );
  };

  return (
    <div className="bg-black mt-24 min-h-screen flex flex-col">
      {/* Navbar */}
      <Navbar />

      {/* Hero Section */}
      <motion.section
        className="bg-primary text-white py-20 px-4 md:px-10 flex flex-col items-center justify-center text-center relative"
        variants={containerVariants}
        initial="hidden"
        animate="visible">
        <motion.h1
          className="text-4xl md:text-6xl font-bold mb-4"
          variants={itemVariants}>
          How It Works
        </motion.h1>
        <motion.p
          className="text-lg md:text-2xl max-w-2xl"
          variants={itemVariants}>
          Understand the simple steps to start staking your $SWINE tokens and
          earn rewards effortlessly.
        </motion.p>
        <motion.img
          src={SwineIllustration}
          alt="Swine Illustration"
          className="mt-10 w-40 h-40 md:w-60 md:h-60 animate-pulse"
          variants={itemVariants}
        />
      </motion.section>

      {/* Steps Section */}
      <motion.section
        className="py-20 px-4 md:px-10 bg-white"
        variants={containerVariants}
        initial="hidden"
        animate="visible">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            className="text-3xl md:text-4xl font-semibold text-center mb-12 text-gray-800"
            variants={itemVariants}>
            Staking Made Easy
          </motion.h2>
          <div className="flex flex-col md:flex-row justify-between space-y-12 md:space-y-0">
            {/* Step 1 */}
            <motion.div
              className="flex-1 flex flex-col items-center text-center"
              variants={itemVariants}>
              <div className="bg-primary text-white rounded-full p-6 mb-4">
                <FaWallet className="w-12 h-12" />
              </div>
              <h3 className="text-2xl font-semibold mb-2 text-gray-800">
                Connect Your Wallet
              </h3>
              <p className="text-gray-600">
                Use a compatible wallet to connect to our platform securely.
              </p>
            </motion.div>

            {/* Step 2 */}
            <motion.div
              className="flex-1 flex flex-col items-center text-center"
              variants={itemVariants}>
              <div className="bg-primary text-white rounded-full p-6 mb-4">
                <FaLock className="w-12 h-12" />
              </div>
              <h3 className="text-2xl font-semibold mb-2 text-gray-800">
                Lock Your Tokens
              </h3>
              <p className="text-gray-600">
                Decide the amount and duration for which you want to stake your
                $SWINE tokens.
              </p>
            </motion.div>

            {/* Step 3 */}
            <motion.div
              className="flex-1 flex flex-col items-center text-center"
              variants={itemVariants}>
              <div className="bg-primary text-white rounded-full p-6 mb-4">
                <FaCoins className="w-12 h-12" />
              </div>
              <h3 className="text-2xl font-semibold mb-2 text-gray-800">
                Earn Rewards
              </h3>
              <p className="text-gray-600">
                Start earning rewards proportionate to your staked amount and
                duration.
              </p>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Benefits Section */}
      <motion.section
        className="py-20 px-4 md:px-10 bg-gray-50"
        variants={containerVariants}
        initial="hidden"
        animate="visible">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            className="text-3xl md:text-4xl font-semibold text-center mb-12 text-gray-800"
            variants={itemVariants}>
            Why Stake Swine?
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Benefit 1 */}
            <motion.div
              className="bg-white rounded-lg shadow-md p-6 text-center"
              variants={itemVariants}>
              <div className="bg-primary text-white rounded-full p-4 inline-block mb-4">
                <FaCoins className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800">
                Competitive Rewards
              </h3>
              <p className="text-gray-600">
                Earn some of the highest rewards rates in the market.
              </p>
            </motion.div>

            {/* Benefit 2 */}
            <motion.div
              className="bg-white rounded-lg shadow-md p-6 text-center"
              variants={itemVariants}>
              <div className="bg-primary text-white rounded-full p-4 inline-block mb-4">
                <FaWallet className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800">
                Secure Platform
              </h3>
              <p className="text-gray-600">
                Your assets are protected with industry-leading security
                measures.
              </p>
            </motion.div>

            {/* Benefit 3 */}
            <motion.div
              className="bg-white rounded-lg shadow-md p-6 text-center"
              variants={itemVariants}>
              <div className="bg-primary text-white rounded-full p-4 inline-block mb-4">
                <FaLock className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800">
                Flexible Terms
              </h3>
              <p className="text-gray-600">
                Choose staking periods that best fit your investment strategy.
              </p>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* FAQ Section */}
      <motion.section
        className="py-20 px-4 md:px-10 bg-white"
        variants={containerVariants}
        initial="hidden"
        animate="visible">
        <div className="max-w-4xl mx-auto">
          <motion.h2
            className="text-3xl md:text-4xl font-semibold text-center mb-12 text-gray-800"
            variants={itemVariants}>
            Frequently Asked Questions
          </motion.h2>
          <div className="space-y-6">
            {/* FAQ Item 1 */}
            <FAQItem
              question="What is staking?"
              answer="Staking involves locking up your tokens to support the operations of a blockchain network. In return, you earn rewards proportional to your stake."
            />

            {/* FAQ Item 2 */}
            <FAQItem
              question="How do I stake my $SWINE tokens?"
              answer="Simply connect your wallet, choose the amount of $SWINE you want to stake, select the staking period, and confirm the transaction."
            />

            {/* FAQ Item 3 */}
            <FAQItem
              question="What are the rewards?"
              answer="Rewards are distributed based on the amount you stake and the duration of your stake. The longer and more you stake, the higher your rewards."
            />
          </div>
        </div>
      </motion.section>

      {/* CTA Section */}
      <motion.section
        className="py-20 px-4 md:px-10 bg-primary text-white text-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible">
        <motion.h2
          className="text-3xl md:text-4xl font-semibold mb-6"
          variants={itemVariants}>
          Ready to Start Staking?
        </motion.h2>
        <motion.p className="text-lg md:text-xl mb-8" variants={itemVariants}>
          Join the cult today and begin earning rewards on your $SWINE
          tokens.
        </motion.p>
        <motion.a
          href="/stake"
          className="bg-orange-700 text-primary font-semibold py-3 px-6 rounded-full inline-block"
          variants={itemVariants}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}>
          Get Started
        </motion.a>
      </motion.section>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default HowItWorks;
