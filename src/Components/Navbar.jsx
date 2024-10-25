// src/Components/Navbar.jsx

import React, { useState } from "react";
import { Link } from "react-router-dom";
import Logo from "../Images/Logo.png";

import "@rainbow-me/rainbowkit/styles.css";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { IoMenu, IoCloseSharp } from "react-icons/io5";
import { motion, AnimatePresence } from "framer-motion";

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Close mobile menu when a link is clicked
  const handleLinkClick = () => {
    setIsMobileMenuOpen(false);
  };

  // Animation variants for the mobile menu
  const menuVariants = {
    hidden: { x: "100%" },
    visible: { x: 0 },
    exit: { x: "100%" },
  };

  return (
    <div className="w-screen fixed top-0 left-0 z-50 bg-black bg-opacity-70 backdrop-filter backdrop-blur-md">
      <nav className="flex justify-between items-center px-6 py-4">
        {/* Logo */}
        <Link to="/">
          <img src={Logo} alt="AirDAO Logo" className="h-10 w-auto" />
        </Link>

        {/* Desktop Navigation and ConnectButton */}
        <div className="hidden md:flex items-center space-x-6">
          <ul className="flex space-x-6 bg-[#BB4938] py-3 px-6 rounded-3xl opacity-90">
            <li className="font-semibold cursor-pointer hover:brightness-125 hover:bg-[#1c0a08]  hover:px-3 hover:rounded-xl transition duration-300">
              <Link to="/">Home</Link>
            </li>
            <li className="font-semibold cursor-pointer hover:brightness-125 hover:bg-[#1c0a08]  hover:px-3 hover:rounded-xl transition duration-300">
              <Link to="/how-it-works">How it Works</Link>
            </li>
            {/* <li className="font-semibold cursor-pointer hover:brightness-125 hover:bg-[#1c0a08]  hover:px-3 hover:rounded-xl transition duration-300">
              <Link to="/features">Features</Link>
            </li> */}
            <li className="font-semibold cursor-pointer hover:brightness-125 hover:bg-[#1c0a08]  hover:px-3 hover:rounded-xl transition duration-300">
              <Link to="/stake">Stake</Link>
            </li>
          </ul>
          {/* ConnectButton on desktop */}
          <div className="ml-4">
            <ConnectButton chainStatus="icon" />
          </div>
        </div>

        {/* Mobile Menu Toggle Icon */}
        <div className="md:hidden">
          <button
            className="text-white text-3xl focus:outline-none"
            onClick={toggleMobileMenu}
            aria-label="Toggle Mobile Menu"
            aria-expanded={isMobileMenuOpen}>
            {isMobileMenuOpen ? <IoCloseSharp /> : <IoMenu />}
          </button>
        </div>
      </nav>

      {/* Mobile Navigation Menu with AnimatePresence for smooth animations */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-80 backdrop-filter backdrop-blur-md flex justify-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            key="mobileMenu">
            <motion.div
              className="w-3/4 sm:w-1/2 md:w-1/3  h-screen bg-[#BB4938] text-white p-6 space-y-6 relative flex flex-col "
              variants={menuVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ type: "tween", duration: 0.3 }}
              key="menuContent">
              {/* Close Button inside the menu */}
              <button
                className="absolute top-4 right-4 text-2xl text-white focus:outline-none"
                onClick={toggleMobileMenu}
                aria-label="Close Mobile Menu">
                <IoCloseSharp />
              </button>

              {/* Navigation Links */}
              <ul className="flex flex-col space-y-4 mt-16">
                <li className="font-semibold text-lg hover:underline bg-black p-3 rounded-lg active:opacity-50">
                  <Link to="/" onClick={handleLinkClick}>
                    Home
                  </Link>
                </li>
                <li className="font-semibold text-lg hover:underline bg-black p-3 rounded-lg active:opacity-50">
                  <Link to="/how-it-works" onClick={handleLinkClick}>
                    How it Works
                  </Link>
                </li>
                {/* <li className="font-semibold text-lg hover:underline bg-black p-3 rounded-lg active:opacity-50">
                  <Link to="/features" onClick={handleLinkClick}>
                    Features
                  </Link>
                </li> */}
                <li className="font-semibold text-lg hover:underline bg-black p-3 rounded-lg active:opacity-50">
                  <Link to="/stake" onClick={handleLinkClick}>
                    Stake
                  </Link>
                </li>
              </ul>

              {/* ConnectButton inside mobile menu */}
              <div className="mt-auto">
                <ConnectButton chainStatus="full" showBalance="true" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Navbar;
