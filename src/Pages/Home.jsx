import React from "react";
import Logo from "../Images/Logo.png";
import SitSwine from "../Images/sitswine.png";
import { FiArrowUpRight } from "react-icons/fi";
import BigSwine from "../Images/bigswine.png";
import SwineSpace from "../Images/maxispace.png";
import Winged from "../Images/spitCash.png";
import { Link } from "react-router-dom";
import Navbar from "../Components/Navbar";

const Home = () => {
  return (
    <div className="bg-black text-white md:px-10 md:pt-10 pt-[180px] pb-10 md:bg-custom-radial">
      <Navbar />
      <section className="mx-auto w-fit relative">
        <h1 className="md:text-[70px] text-[30px] font-bold text-center leading-snug text-gradient">
          Earn Rewards by Staking
          <br /> Your Swine
        </h1>
        <p className="md:text-[25px] text-[10px] text-center text-gradient">
          Stake your crypto and earn interest with minimal effort
        </p>
        <div className="bg-gradient-to-r font-bold from-white to-black text-[#BB4938] w-fit mx-auto mt-10 md:py-3 md:px-10 py-2 px-5 rounded-3xl z-50 hover:scale-110 cursor-pointer">
          <Link to="/stake">Get Started</Link>
        </div>

        <img
          src={SwineSpace}
          alt=""
          className="absolute md:-top-16 top-[55px] z-0 w-[300px] md:w-[750px]"
        />
        <img
          src={Winged}
          alt=""
          className="absolute opacity-20 md:right-10 right-2 z-0 w-[150px] md:w-[750px]"
        />

        <section className="mt-72 mx-auto">
          <h1 className="text-center md:text-[50px] text-[30px]">
            How it works
          </h1>
          <p className="text-center md:text-[25px]">
            Staking involves holding and locking up your token to support a{" "}
            blockchain network, and earning rewards for contributing.
          </p>
          <div className="flex md:flex-row flex-col md:space-x-8 space-y-8 mt-12">
            <div className="flex flex-col justify-between bg-[#BB4938] p-5 rounded-md md:w-[400px] h-[226px] w-[90%] mx-auto">
              <div className="flex justify-between items-center">
                <img src={Logo} alt="" />
                <p className="border px-8 py-2 rounded-lg">Add +</p>
              </div>
              <p className="text-[28px]">
                Connect <br /> your wallet
              </p>
            </div>
            <div className="flex flex-col justify-between bg-slate-900 p-5 rounded-md md:w-[400px] w-[90%] mx-auto h-[226px]">
              <div className="flex justify-between items-center">
                <h1>
                  1874.34 <span className="text-slate-500">$SWINE</span>
                </h1>
                <p className=" px-8 py-2 rounded-lg"></p>
              </div>
              <p className="text-[28px]">
                Enter your <br /> stake amount
              </p>
            </div>
            <div className="flex flex-col justify-between bg-slate-900 p-5 rounded-md md:w-[400px] w-[90%] mx-auto h-[226px]">
              <div className="flex justify-between ">
                <div className="flex flex-col justify-between">
                  <h1></h1>
                  <p className="text-[20px]">
                    Receive income <br /> automatically
                  </p>
                </div>
                <img src={SitSwine} alt="" />
              </div>
            </div>
          </div>
        </section>
        <section className="mx-auto w-[90%] mt-20">
          <h1 className="md:text-[50px] text-[25px] font-bold text-center">
            Features
          </h1>
          <div className="flex md:flex-row flex-col md:space-x-8 space-y-8">
            <div className="bg-slate-700 p-5 md:w-[606px] md:h-[180px] rounded-lg">
              <div className="flex justify-between mb-4">
                {" "}
                <h1></h1>
                <FiArrowUpRight />{" "}
              </div>

              <div className="h-32">
                <h1 className="md:text-[40px] text-[20px]">
                  Stake <span className="text-[#BB4938]">$SWINE</span>
                </h1>
                <p className="md:text-[24px] text-[12px]">
                  Lockup your token & get rewarded
                </p>
              </div>
            </div>
            <div className="bg-slate-700 p-5 md:w-[606px] opacity-50 md:h-[180px] rounded-lg">
              <div className="h-32">
                <h1 className="md:text-[40px] text-[20px]">
                  Tip <span className="text-[#BB4938]">$SWINE</span>
                </h1>
                <p className="md:text-[24px] text-[12px]">Coming soon!</p>
              </div>
            </div>
          </div>
        </section>
        <section className="w-fit mx-auto mt-10">
          <img src={BigSwine} alt="" className="md:w-[300px]" />
        </section>
      </section>
    </div>
  );
};

export default Home;
