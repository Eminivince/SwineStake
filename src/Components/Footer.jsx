// src/Components/Footer.jsx

import React from "react";
import { Link } from "react-router-dom";
import { FaTwitter, FaTelegramPlane, FaDiscord } from "react-icons/fa";

const Footer = () => {
  return (
    <footer className="bg-gray-800 text-white py-10 px-4 md:px-10">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center">
        {/* Logo and Description */}
        <div className="mb-6 md:mb-0">
          <Link to="/" className="text-2xl font-bold text-primary">
            $Swine
          </Link>
          <p className="text-gray-400 mt-2">
            Rewarding staking for your $SWINE tokens.
          </p>
        </div>

        {/* Social Media Links */}
        <div className="flex space-x-6">
          <a
            href="https://x.com/swine_c?s=11"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-primary transition-colors duration-200">
            <FaTwitter size={24} />
          </a>
          <a
            href="https://t.me/swine_coin"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-primary transition-colors duration-200">
            <FaTelegramPlane size={24} />
          </a>
        </div>
      </div>

      {/* Footer Bottom */}
      <div className="mt-8 text-center text-gray-500">
        &copy; {new Date().getFullYear()} $Swine
      </div>
    </footer>
  );
};

export default Footer;
