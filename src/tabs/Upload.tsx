import { Icon } from "@iconify/react"
import { useRef, useState } from "react"
import { useAuth } from "@clerk/clerk-react"

const WORKER_URL = "https://worker.poopeating1234.workers.dev"

export default function Upload() {
    const inputRef =
        useRef<HTMLInputElement>(null)

    const { getToken } = useAuth()

    const [file, setFile] =
        useState<File | null>(null)

    const [uploading, setUploading] =
        useState(false)

    const [message, setMessage] =
        useState("")

    const handleFile = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const selectedFile =
            event.target.files?.[0]

        if (!selectedFile) {
            return
        }

        setFile(selectedFile)
        setMessage("")
    }

    const formatSize = (
        bytes: number
    ) => {
        if (bytes < 1024) {
            return `${bytes} B`
        }

        if (bytes < 1024 * 1024) {
            return `${(
                bytes / 1024
            ).toFixed(1)} KB`
        }

        if (
            bytes <
            1024 * 1024 * 1024
        ) {
            return `${(
                bytes /
                (1024 * 1024)
            ).toFixed(1)} MB`
        }

        return `${(
            bytes /
            (1024 * 1024 * 1024)
        ).toFixed(1)} GB`
    }

    const uploadFile = async () => {
        if (!file || uploading) {
            return
        }

        setUploading(true)
        setMessage("Uploading...")

        try {
            const token =
                await getToken()

            if (!token) {
                throw new Error(
                    "You are not signed in"
                )
            }

            const formData =
                new FormData()

            formData.append(
                "file",
                file
            )

            const response =
                await fetch(
                    `${WORKER_URL}/upload`,
                    {
                        method: "POST",
                        headers: {
                            Authorization:
                                `Bearer ${token}`
                        },
                        body: formData
                    }
                )

            const text =
                await response.text()

            let data: {
                error?: string
                success?: boolean
                name?: string
            }

            try {
                data =
                    JSON.parse(text)
            } catch {
                data = {
                    error: text
                }
            }

            if (!response.ok) {
                throw new Error(
                    data.error ||
                    "Upload failed"
                )
            }

            setMessage(
                "Uploaded successfully"
            )

            setFile(null)

            if (inputRef.current) {
                inputRef.current.value =
                    ""
            }
        } catch (error) {
            console.error(
                "UPLOAD ERROR:",
                error
            )

            setMessage(
                error instanceof Error
                    ? error.message
                    : "Upload failed"
            )
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className="w-full h-full flex flex-col p-6 gap-5">
            <h2 className="w-full text-left text-white font-medium text-2xl">
                Upload
            </h2>

            <input
                ref={inputRef}
                type="file"
                className="hidden"
                onChange={handleFile}
            />

            <button
                onClick={() =>
                    inputRef.current?.click()
                }
                className="w-full h-fit flex flex-col items-center justify-center cursor-pointer bg-[#101010] border border-white/5 rounded-lg p-3"
            >
                <Icon
                    icon="akar-icons:plus"
                    width={20}
                    height={20}
                    color="white"
                />
            </button>

            <hr className="border-white/10" />

            {file && (
                <div className="w-full h-fit flex flex-row gap-4 p-3 bg-[#101010] border border-white/5 rounded-xl">
                    <div className="w-full h-fit flex flex-col min-w-0">
                        <h2 className="text-white text-lg truncate">
                            {file.name}
                        </h2>

                        <h5 className="text-white/50 text-sm">
                            Size -{" "}
                            {formatSize(
                                file.size
                            )}
                        </h5>

                        <h5 className="text-white/50 text-sm">
                            Format -{" "}
                            {file.type ||
                                "Unknown"}
                        </h5>
                    </div>

                    <div className="w-32 flex flex-col justify-center shrink-0">
                        <button
                            onClick={
                                uploadFile
                            }
                            disabled={
                                uploading
                            }
                            className="w-full h-fit bg-white/10 hover:bg-white/15 disabled:opacity-50 rounded-md text-white py-2 transition"
                        >
                            {uploading
                                ? "Uploading..."
                                : "Upload"}
                        </button>
                    </div>
                </div>
            )}

            {message && (
                <p className="text-white/50 text-sm">
                    {message}
                </p>
            )}
        </div>
    )
}