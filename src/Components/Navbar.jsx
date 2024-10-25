// src/Components/Navbar.jsx

import React, { useState } from "react";
import { Link } from "react-router-dom";
import Logo from "../Images/Logo.png";

import "@rainbow-me/rainbowkit/styles.css";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { IoMenu, IoCloseSharp } from "react-icons/io5";

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

  return (
    <div className="w-screen fixed top-0 left-0 z-50 bg-black bg-opacity-70 backdrop-blur-md">
      <nav className="flex justify-between items-center px-6 py-4">
        {/* Logo */}
        <Link to="/">
          <img src={Logo} alt="AirDAO Logo" className="h-10 w-auto" />
        </Link>

        {/* Desktop Navigation and ConnectButton */}
        <div className="hidden md:flex items-center space-x-6">
          <ul className="flex space-x-6 bg-slate-400 py-3 px-6 rounded-3xl opacity-80">
            <li className="font-semibold cursor-pointer hover:brightness-125 hover:bg-black hover:p-1 hover:px-3 hover:rounded-xl duration-300">
              <Link to="/">Home</Link>
            </li>
            <li className="font-semibold cursor-pointer hover:brightness-125 hover:bg-black hover:p-1 hover:px-3 hover:rounded-xl duration-300">
              <Link to="/how-it-works">How it Works</Link>
            </li>
            <li className="font-semibold cursor-pointer hover:brightness-125 hover:bg-black hover:p-1 hover:px-3 hover:rounded-xl duration-300">
              <Link to="/features">Features</Link>
            </li>
            <li className="font-semibold cursor-pointer hover:brightness-125 hover:bg-black hover:p-1 hover:px-3 hover:rounded-xl duration-300">
              <Link to="/stake">Stake</Link>
            </li>
          </ul>
          {/* ConnectButton on desktop */}
          <div className="ml-4">
            <ConnectButton />
          </div>
        </div>

        {/* Mobile Menu Toggle Icon */}
        <div className="md:hidden">
          <button
            className="text-white text-2xl focus:outline-none"
            onClick={toggleMobileMenu}
            aria-label="Toggle Mobile Menu"
            aria-expanded={isMobileMenuOpen}>
            {isMobileMenuOpen ? <IoCloseSharp /> : <IoMenu />}
          </button>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div>
            
            <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-md flex justify-end">
              <div className="w-3/4 sm:w-1/2 md:w-1/3 bg-slate-800 text-white p-6 space-y-6 transform transition-transform duration-300 ease-in-out">
                <ul className="flex flex-col space-y-4">
                  <li className="font-semibold text-lg hover:underline">
                    <Link to="/" onClick={handleLinkClick}>
                      Home
                    </Link>
                  </li>
                  <li className="font-semibold text-lg hover:underline">
                    <Link to="/how-it-works" onClick={handleLinkClick}>
                      How it Works
                    </Link>
                  </li>
                  <li className="font-semibold text-lg hover:underline">
                    <Link to="/features" onClick={handleLinkClick}>
                      Features
                    </Link>
                  </li>
                  <li className="font-semibold text-lg hover:underline">
                    <Link to="/stake" onClick={handleLinkClick}>
                      Stake
                    </Link>
                  </li>
                </ul>

                {/* ConnectButton inside mobile menu */}
                <div className="mt-4">
                  <ConnectButton />
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>
    </div>
  );
};

export default Navbar;
