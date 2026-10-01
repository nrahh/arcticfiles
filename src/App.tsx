import logo from "./assets/logo.svg"
import temp_pfp from "./assets/temp_pfp.png"
import { useState } from "react"
import { Icon } from "@iconify/react"
import { motion } from "motion/react"
import Account from "./tabs/Account.tsx"
import { useAuth, useClerk } from "@clerk/clerk-react"
import Dashboard from "./tabs/Dashboard.tsx"
import Upload from "./tabs/Upload.tsx"
import Settings from "./tabs/Settings.tsx"

export default function App() {
    const [selected, setSelected] =
        useState<string>("dashboard")

    const { isSignedIn } =
        useAuth()

    const { signOut } =
        useClerk()

    return (
        <div className="w-full h-screen flex flex-row">
            <div className="w-fit min-w-65 h-full flex flex-col p-6 gap-5 bg-[#101010] border-r border-[#1C1C1C]">
                <div className="w-full h-fit flex flex-row items-center gap-2.5">
                    <img
                        onClick={() =>
                            setSelected(
                                "dashboard"
                            )
                        }
                        src={logo}
                        alt="logo"
                        className="w-7 h-7 cursor-pointer"
                    />

                    <div className="w-fit h-full flex flex-col gap-0">
                        <h2 className="w-full text-left text-white text-lg">
                            Arcticfiles
                        </h2>

                        <h5 className="w-full text-left text-white/50 text-sm -mt-1.25">
                            Your go-to cloud storage
                        </h5>
                    </div>
                </div>

                <hr className="text-white/10" />

                <div className="w-full h-fit flex flex-col gap-2">
                    <motion.button
                        onClick={() =>
                            setSelected(
                                "dashboard"
                            )
                        }
                        initial={{
                            opacity: 1
                        }}
                        whileHover={{
                            opacity: 0.7
                        }}
                        className={`w-full h-fit flex flex-row p-2.5 rounded-xl gap-2 items-center justify-start ${
                            selected ===
                            "dashboard"
                                ? "bg-[#1C1C1C] border-t border-l-[0.5px] border-r-[0.5px] border-b-0 border-white/5"
                                : ""
                        }`}
                    >
                        <Icon
                            icon="bxs:layout"
                            width={23}
                            height={23}
                            color="white"
                            opacity={
                                selected ===
                                "dashboard"
                                    ? "1"
                                    : "0.3"
                            }
                        />

                        <h3
                            className={`text-left ${
                                selected ===
                                "dashboard"
                                    ? "text-white"
                                    : "text-white/50"
                            }`}
                        >
                            Dashboard
                        </h3>
                    </motion.button>

                    <motion.button
                        onClick={() =>
                            setSelected(
                                "upload"
                            )
                        }
                        initial={{
                            opacity: 1
                        }}
                        whileHover={{
                            opacity: 0.7
                        }}
                        className={`w-full h-fit flex flex-row p-2.5 rounded-xl gap-2 items-center justify-start ${
                            selected ===
                            "upload"
                                ? "bg-[#1C1C1C] border-t border-l-[0.5px] border-r-[0.5px] border-b-0 border-white/5"
                                : ""
                        }`}
                    >
                        <Icon
                            icon="cuida:upload-outline"
                            width={23}
                            height={23}
                            color="white"
                            opacity={
                                selected ===
                                "upload"
                                    ? "1"
                                    : "0.3"
                            }
                        />

                        <h3
                            className={`text-left ${
                                selected ===
                                "upload"
                                    ? "text-white"
                                    : "text-white/50"
                            }`}
                        >
                            Upload
                        </h3>
                    </motion.button>

                    <motion.button
                        onClick={() =>
                            setSelected(
                                "settings"
                            )
                        }
                        initial={{
                            opacity: 1
                        }}
                        whileHover={{
                            opacity: 0.7
                        }}
                        className={`w-full h-fit flex flex-row p-2.5 rounded-xl gap-2 items-center justify-start ${
                            selected ===
                            "settings"
                                ? "bg-[#1C1C1C] border-t border-l-[0.5px] border-r-[0.5px] border-b-0 border-white/5"
                                : ""
                        }`}
                    >
                        <Icon
                            icon="boxicons:gear"
                            width={23}
                            height={23}
                            color="white"
                            opacity={
                                selected ===
                                "settings"
                                    ? "1"
                                    : "0.3"
                            }
                        />

                        <h3
                            className={`text-left ${
                                selected ===
                                "settings"
                                    ? "text-white"
                                    : "text-white/50"
                            }`}
                        >
                            Settings
                        </h3>
                    </motion.button>
                </div>
            </div>

            <div className="w-full h-full flex flex-col gap-3">
                <div className="w-full h-fit flex flex-col p-3 bg-[#101010] border-b items-end justify-center border-[#1C1C1C]">
                    <img
                        onClick={() =>
                            signOut()
                        }
                        src={temp_pfp}
                        alt="temp_pfp"
                        className="w-8 h-8 rounded-lg cursor-pointer"
                    />
                </div>

                <div className="w-full h-full">
                    {!isSignedIn ? (
                        <Account />
                    ) : (
                        <div className="w-full h-full">
                            {selected ===
                                "dashboard" && (
                                    <Dashboard />
                                )}

                            {selected ===
                                "upload" && (
                                    <Upload />
                                )}

                            {selected ===
                                "settings" && (
                                    <Settings />
                                )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}