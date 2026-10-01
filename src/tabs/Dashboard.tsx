import { Icon } from "@iconify/react"
import { useEffect, useState } from "react"
import { useAuth } from "@clerk/clerk-react"

const WORKER_URL =
    "https://arcticfiles.poopeating1234.workers.dev"

interface FileItem {
    key: string
    name: string
    size: number
}

export default function Dashboard() {
    const { getToken } = useAuth()

    const [files, setFiles] =
        useState<FileItem[]>([])

    const [loading, setLoading] =
        useState(true)

    const [message, setMessage] =
        useState("")

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

    const loadFiles = async () => {
        try {
            setLoading(true)
            setMessage("")

            const token =
                await getToken()

            if (!token) {
                throw new Error(
                    "You are not signed in"
                )
            }

            const response =
                await fetch(
                    `${WORKER_URL}/files`,
                    {
                        headers: {
                            Authorization:
                                `Bearer ${token}`
                        }
                    }
                )

            const data =
                await response.json()

            if (!response.ok) {
                throw new Error(
                    data.error ||
                    "Failed to load files"
                )
            }

            const loadedFiles =
                (data.files || []).map(
                    (file: any) => ({
                        key:
                            file.fileKey ??
                            file.file_key ??
                            file.key ??
                            file.keyName ??
                            file.objectKey ??
                            file.object_key ??
                            "",
                        name:
                            file.fileName ??
                            file.file_name ??
                            file.name ??
                            "",
                        size:
                            file.fileSize ??
                            file.file_size ??
                            file.size ??
                            0
                    })
                )

            setFiles(
                loadedFiles
            )
        } catch (error) {
            console.error(
                "FILES ERROR:",
                error
            )

            setMessage(
                error instanceof Error
                    ? error.message
                    : "Failed to load files"
            )
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadFiles()
    }, [])

    const downloadOwnFile = async (
        file: FileItem
    ) => {
        try {
            const token =
                await getToken()

            if (!token) {
                throw new Error(
                    "You are not signed in"
                )
            }

            if (!file.key) {
                throw new Error(
                    "File key is missing"
                )
            }

            setMessage(
                `Downloading ${file.name}...`
            )

            const response =
                await fetch(
                    `${WORKER_URL}/download-own?key=${encodeURIComponent(file.key)}`,
                    {
                        headers: {
                            Authorization:
                                `Bearer ${token}`
                        }
                    }
                )

            if (!response.ok) {
                let errorMessage =
                    "Download failed"

                try {
                    const data =
                        await response.json()

                    if (data.error) {
                        errorMessage =
                            data.error
                    }
                } catch {}

                throw new Error(
                    errorMessage
                )
            }

            const blob =
                await response.blob()

            const url =
                URL.createObjectURL(
                    blob
                )

            const anchor =
                document.createElement(
                    "a"
                )

            anchor.href = url
            anchor.download =
                file.name

            document.body.appendChild(
                anchor
            )

            anchor.click()

            anchor.remove()

            URL.revokeObjectURL(url)

            setMessage("")
        } catch (error) {
            console.error(
                "DOWNLOAD ERROR:",
                error
            )

            setMessage(
                error instanceof Error
                    ? error.message
                    : "Download failed"
            )
        }
    }

    const createShareCode = async (
        file: FileItem
    ) => {
        try {
            const token =
                await getToken()

            if (!token) {
                throw new Error(
                    "You are not signed in"
                )
            }

            if (!file.key) {
                throw new Error(
                    "File key is missing"
                )
            }

            const response =
                await fetch(
                    `${WORKER_URL}/share`,
                    {
                        method: "POST",
                        headers: {
                            Authorization:
                                `Bearer ${token}`,
                            "Content-Type":
                                "application/json"
                        },
                        body: JSON.stringify({
                            fileKey:
                            file.key
                        })
                    }
                )

            const data =
                await response.json()

            if (!response.ok) {
                throw new Error(
                    data.error ||
                    "Failed to create code"
                )
            }

            window.alert(
                `Download code:\n\n${data.code}`
            )
        } catch (error) {
            console.error(
                "SHARE ERROR:",
                error
            )

            setMessage(
                error instanceof Error
                    ? error.message
                    : "Failed to create code"
            )
        }
    }

    const downloadWithCode = async () => {
        const enteredCode =
            window.prompt(
                "Enter download code:"
            )

        if (!enteredCode) {
            return
        }

        const code =
            enteredCode
                .trim()
                .toUpperCase()

        try {
            setMessage(
                "Downloading..."
            )

            const response =
                await fetch(
                    `${WORKER_URL}/download/${encodeURIComponent(code)}`
                )

            if (!response.ok) {
                let errorMessage =
                    "Invalid download code"

                try {
                    const data =
                        await response.json()

                    if (data.error) {
                        errorMessage =
                            data.error
                    }
                } catch {}

                throw new Error(
                    errorMessage
                )
            }

            const blob =
                await response.blob()

            const contentDisposition =
                response.headers.get(
                    "Content-Disposition"
                )

            let fileName =
                "download"

            const fileNameMatch =
                contentDisposition?.match(
                    /filename="([^"]+)"/
                )

            if (fileNameMatch) {
                fileName =
                    fileNameMatch[1]
            }

            const url =
                URL.createObjectURL(
                    blob
                )

            const anchor =
                document.createElement(
                    "a"
                )

            anchor.href = url
            anchor.download =
                fileName

            document.body.appendChild(
                anchor
            )

            anchor.click()

            anchor.remove()

            URL.revokeObjectURL(url)

            setMessage("")
        } catch (error) {
            console.error(
                "CODE DOWNLOAD ERROR:",
                error
            )

            setMessage(
                error instanceof Error
                    ? error.message
                    : "Download failed"
            )
        }
    }

    return (
        <div className="w-full h-full flex flex-col p-6 gap-5">
            <div className="w-full flex flex-row items-center justify-between">
                <h2 className="text-white font-medium text-2xl">
                    Dashboard
                </h2>

                <button
                    onClick={
                        downloadWithCode
                    }
                    className="flex flex-row items-center gap-2 bg-[#101010] border border-white/5 hover:bg-[#151515] rounded-lg px-3 py-2 text-white transition"
                >
                    <Icon
                        icon="solar:key-outline"
                        width={18}
                        height={18}
                    />

                    <span>
                        Code
                    </span>
                </button>
            </div>

            {loading ? (
                <p className="text-white/50 text-sm">
                    Loading files...
                </p>
            ) : files.length === 0 ? (
                <p className="text-white/50 text-sm">
                    No files uploaded.
                </p>
            ) : (
                <div className="w-full flex flex-col gap-3">
                    {files.map(
                        (file) => (
                            <div
                                key={
                                    file.key ||
                                    file.name
                                }
                                className="w-full flex flex-row items-center justify-between gap-4 p-3 bg-[#101010] border border-white/5 rounded-xl"
                            >
                                <div className="min-w-0">
                                    <h3 className="text-white truncate">
                                        {
                                            file.name
                                        }
                                    </h3>

                                    <p className="text-white/40 text-sm">
                                        {formatSize(
                                            file.size
                                        )}
                                    </p>
                                </div>

                                <div className="flex flex-row items-center gap-2 shrink-0">
                                    <button
                                        onClick={() =>
                                            createShareCode(
                                                file
                                            )
                                        }
                                        title="Create download code"
                                        className="w-9 h-9 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-lg text-white transition"
                                    >
                                        <Icon
                                            icon="solar:key-outline"
                                            width={
                                                18
                                            }
                                            height={
                                                18
                                            }
                                        />
                                    </button>

                                    <button
                                        onClick={() =>
                                            downloadOwnFile(
                                                file
                                            )
                                        }
                                        className="flex flex-row items-center gap-2 bg-white/10 hover:bg-white/15 rounded-lg px-3 py-2 text-white transition"
                                    >
                                        <Icon
                                            icon="cuida:download-outline"
                                            width={
                                                18
                                            }
                                            height={
                                                18
                                            }
                                        />

                                        <span>
                                            Download
                                        </span>
                                    </button>
                                </div>
                            </div>
                        )
                    )}
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