import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./Pages/Home";
import Stake from "./Pages/Stake";
import Unstake from "./Pages/Unstake";
import {} from "@rainbow-me/rainbowkit";
import React from "react";
import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { http } from "wagmi";
import { defineChain } from "viem";

const AirDAO = /*#__PURE__*/ defineChain({
  id: 16718,
  name: "AirDAO",
  nativeCurrency: { name: "AirDAO", symbol: "AMB", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://network.ambrosus.io"],
    },
  },
  blockExplorers: {
    default: {
      name: "AirDAO Explorer",
      url: "https://airdao.io/explorer",
      apiUrl: "https://airdao.io/explorer/api",
    },
  },
});

const config = getDefaultConfig({
  appName: "SwineStake",
  projectId: "38ebfa02e2cdd0cf665eb297366c9f84",
  chains: [AirDAO],
  transports: {
    // [mainnet.id]: http("https://eth-mainnet.g.alchemy.com/v2/..."),
    [AirDAO.id]: http("https://network.ambrosus.io"),
  },
});

const queryClient = new QueryClient();

const App = () => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="stake" element={<Stake />} />
              <Route path="unstake" element={<Unstake />} />
            </Routes>
          </BrowserRouter>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);

export default App;
