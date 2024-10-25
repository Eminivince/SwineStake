// src/Components/LoadingSpinner.jsx

import React from "react";
import { motion } from "framer-motion";

const LoadingSpinner = () => {
  return (
    <motion.div
      className="w-6 h-6 border-4 border-t-4 border-gray-300 rounded-full"
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
    />
  );
};

export default LoadingSpinner;
