import { verifyToken } from "@clerk/backend"
import { AwsClient } from "aws4fetch"

interface Env {
	B2_APPLICATION_KEY_ID: string
	B2_APPLICATION_KEY: string
	B2_ENDPOINT: string
	B2_BUCKET_NAME: string
	CLERK_SECRET_KEY: string
	DB: D1Database
}

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type, Authorization"
}

async function authenticate(
	request: Request,
	env: Env
): Promise<string | null> {
	const authorization =
		request.headers.get("Authorization")

	if (!authorization?.startsWith("Bearer ")) {
		return null
	}

	const token =
		authorization.slice(7)

	try {
		const verifiedToken =
			await verifyToken(token, {
				secretKey:
				env.CLERK_SECRET_KEY
			})

		return verifiedToken.sub
	} catch {
		return null
	}
}

function createB2Client(env: Env) {
	return new AwsClient({
		accessKeyId:
		env.B2_APPLICATION_KEY_ID,
		secretAccessKey:
		env.B2_APPLICATION_KEY,
		service: "s3",
		region: "ca-east-006"
	})
}

function decodeXml(value: string) {
	return value
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
}

function generateCode() {
	const chars =
		"ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

	const bytes =
		crypto.getRandomValues(
			new Uint8Array(8)
		)

	let code = ""

	for (const byte of bytes) {
		code +=
			chars[
			byte % chars.length
				]
	}

	return `${code.slice(0, 4)}-${code.slice(4)}`
}

function getFileNameFromKey(key: string) {
	const decoded =
		decodeURIComponent(key)

	const slashIndex =
		decoded.lastIndexOf("/")

	if (slashIndex === -1) {
		return decoded
	}

	return decoded.slice(
		slashIndex + 1
	)
}

function createDownloadResponse(
	b2Response: Response,
	fileName: string
) {
	if (!b2Response.ok) {
		return new Response(
			JSON.stringify({
				error: "File not found"
			}),
			{
				status: 404,
				headers: {
					...corsHeaders,
					"Content-Type":
						"application/json"
				}
			}
		)
	}

	const headers =
		new Headers(corsHeaders)

	headers.set(
		"Content-Type",
		b2Response.headers.get(
			"Content-Type"
		) || "application/octet-stream"
	)

	const contentLength =
		b2Response.headers.get(
			"Content-Length"
		)

	if (contentLength) {
		headers.set(
			"Content-Length",
			contentLength
		)
	}

	headers.set(
		"Content-Disposition",
		`attachment; filename="${fileName.replace(/"/g, "")}"; filename*=UTF-8''${encodeURIComponent(fileName)}`
	)

	return new Response(
		b2Response.body,
		{
			status: 200,
			headers
		}
	)
}

async function downloadB2File(
	env: Env,
	key: string
) {
	const client =
		createB2Client(env)

	const b2Url =
		`${env.B2_ENDPOINT}/${env.B2_BUCKET_NAME}/${key}`

	return client.fetch(
		b2Url,
		{
			method: "GET"
		}
	)
}

export default {
	async fetch(
		request: Request,
		env: Env
	): Promise<Response> {
		if (
			request.method === "OPTIONS"
		) {
			return new Response(
				null,
				{
					status: 204,
					headers:
					corsHeaders
				}
			)
		}

		const url =
			new URL(request.url)

		try {
			if (
				request.method === "POST" &&
				url.pathname === "/upload"
			) {
				const ownerId =
					await authenticate(
						request,
						env
					)

				if (!ownerId) {
					return new Response(
						JSON.stringify({
							error:
								"Unauthorized"
						}),
						{
							status: 401,
							headers: {
								...corsHeaders,
								"Content-Type":
									"application/json"
							}
						}
					)
				}

				const formData =
					await request.formData()

				const file =
					formData.get("file")

				if (
					!file ||
					!(file instanceof File)
				) {
					return new Response(
						JSON.stringify({
							error:
								"No file provided"
						}),
						{
							status: 400,
							headers: {
								...corsHeaders,
								"Content-Type":
									"application/json"
							}
						}
					)
				}

				const safeName =
					encodeURIComponent(
						file.name
					)

				const key =
					`${ownerId}/${safeName}`

				const body =
					await file.arrayBuffer()

				const client =
					createB2Client(env)

				const response =
					await client.fetch(
						`${env.B2_ENDPOINT}/${env.B2_BUCKET_NAME}/${key}`,
						{
							method: "PUT",
							headers: {
								"Content-Type":
									file.type ||
									"application/octet-stream"
							},
							body
						}
					)

				if (!response.ok) {
					const errorText =
						await response.text()

					return new Response(
						JSON.stringify({
							error:
								errorText ||
								"B2 upload failed"
						}),
						{
							status: 500,
							headers: {
								...corsHeaders,
								"Content-Type":
									"application/json"
							}
						}
					)
				}

				return new Response(
					JSON.stringify({
						success: true,
						name: file.name
					}),
					{
						status: 200,
						headers: {
							...corsHeaders,
							"Content-Type":
								"application/json"
						}
					}
				)
			}

			if (
				request.method === "GET" &&
				url.pathname === "/files"
			) {
				const ownerId =
					await authenticate(
						request,
						env
					)

				if (!ownerId) {
					return new Response(
						JSON.stringify({
							error:
								"Unauthorized"
						}),
						{
							status: 401,
							headers: {
								...corsHeaders,
								"Content-Type":
									"application/json"
							}
						}
					)
				}

				const client =
					createB2Client(env)

				const prefix =
					`${ownerId}/`

				const b2Url =
					`${env.B2_ENDPOINT}/${env.B2_BUCKET_NAME}?list-type=2&prefix=${encodeURIComponent(prefix)}`

				const response =
					await client.fetch(
						b2Url,
						{
							method: "GET"
						}
					)

				if (!response.ok) {
					const errorText =
						await response.text()

					return new Response(
						JSON.stringify({
							error:
								errorText ||
								"Failed to list files"
						}),
						{
							status: 500,
							headers: {
								...corsHeaders,
								"Content-Type":
									"application/json"
							}
						}
					)
				}

				const xml =
					await response.text()

				const files: {
					key: string
					name: string
					size: number
				}[] = []

				const contents =
					xml.match(
						/<Contents>[\s\S]*?<\/Contents>/g
					) || []

				for (const content of contents) {
					const keyMatch =
						content.match(
							/<Key>([\s\S]*?)<\/Key>/
						)

					const sizeMatch =
						content.match(
							/<Size>([\s\S]*?)<\/Size>/
						)

					if (!keyMatch) {
						continue
					}

					const key =
						decodeXml(
							keyMatch[1]
						)

					const size =
						sizeMatch
							? Number(
								sizeMatch[1]
							)
							: 0

					files.push({
						key,
						name:
							getFileNameFromKey(
								key
							),
						size
					})
				}

				return new Response(
					JSON.stringify({
						files
					}),
					{
						status: 200,
						headers: {
							...corsHeaders,
							"Content-Type":
								"application/json"
						}
					}
				)
			}

			if (
				request.method === "POST" &&
				url.pathname === "/share"
			) {
				const ownerId =
					await authenticate(
						request,
						env
					)

				if (!ownerId) {
					return new Response(
						JSON.stringify({
							error:
								"Unauthorized"
						}),
						{
							status: 401,
							headers: {
								...corsHeaders,
								"Content-Type":
									"application/json"
							}
						}
					)
				}

				const body =
					await request.json<{
						key?: string
					}>()

				const key =
					body.key

				if (
					!key ||
					!key.startsWith(
						`${ownerId}/`
					)
				) {
					return new Response(
						JSON.stringify({
							error:
								"Invalid file"
						}),
						{
							status: 403,
							headers: {
								...corsHeaders,
								"Content-Type":
									"application/json"
							}
						}
					)
				}

				const existing =
					await env.DB
						.prepare(
							"SELECT code FROM shares WHERE file_key = ? AND owner_id = ? LIMIT 1"
						)
						.bind(
							key,
							ownerId
						)
						.first<{
							code: string
						}>()

				if (existing) {
					return new Response(
						JSON.stringify({
							success: true,
							code:
							existing.code
						}),
						{
							status: 200,
							headers: {
								...corsHeaders,
								"Content-Type":
									"application/json"
							}
						}
					)
				}

				let code = ""

				for (;;) {
					code =
						generateCode()

					const exists =
						await env.DB
							.prepare(
								"SELECT code FROM shares WHERE code = ? LIMIT 1"
							)
							.bind(code)
							.first()

					if (!exists) {
						break
					}
				}

				await env.DB
					.prepare(
						"INSERT INTO shares (code, file_key, owner_id, created_at) VALUES (?, ?, ?, ?)"
					)
					.bind(
						code,
						key,
						ownerId,
						Date.now()
					)
					.run()

				return new Response(
					JSON.stringify({
						success: true,
						code
					}),
					{
						status: 200,
						headers: {
							...corsHeaders,
							"Content-Type":
								"application/json"
						}
					}
				)
			}

			if (
				request.method === "GET" &&
				url.pathname ===
				"/download-own"
			) {
				const ownerId =
					await authenticate(
						request,
						env
					)

				if (!ownerId) {
					return new Response(
						JSON.stringify({
							error:
								"Unauthorized"
						}),
						{
							status: 401,
							headers: {
								...corsHeaders,
								"Content-Type":
									"application/json"
							}
						}
					)
				}

				const key =
					url.searchParams.get(
						"key"
					)

				if (
					!key ||
					!key.startsWith(
						`${ownerId}/`
					)
				) {
					return new Response(
						JSON.stringify({
							error:
								"Forbidden"
						}),
						{
							status: 403,
							headers: {
								...corsHeaders,
								"Content-Type":
									"application/json"
							}
						}
					)
				}

				const response =
					await downloadB2File(
						env,
						key
					)

				return createDownloadResponse(
					response,
					getFileNameFromKey(key)
				)
			}

			if (
				request.method === "GET" &&
				url.pathname.startsWith(
					"/download/"
				)
			) {
				const code =
					decodeURIComponent(
						url.pathname.slice(
							"/download/".length
						)
					).toUpperCase()

				if (!code) {
					return new Response(
						JSON.stringify({
							error:
								"Missing code"
						}),
						{
							status: 400,
							headers: {
								...corsHeaders,
								"Content-Type":
									"application/json"
							}
						}
					)
				}

				const share =
					await env.DB
						.prepare(
							"SELECT file_key FROM shares WHERE code = ? LIMIT 1"
						)
						.bind(code)
						.first<{
							file_key: string
						}>()

				if (!share) {
					return new Response(
						JSON.stringify({
							error:
								"Invalid download code"
						}),
						{
							status: 404,
							headers: {
								...corsHeaders,
								"Content-Type":
									"application/json"
							}
						}
					)
				}

				const response =
					await downloadB2File(
						env,
						share.file_key
					)

				return createDownloadResponse(
					response,
					getFileNameFromKey(
						share.file_key
					)
				)
			}

			return new Response(
				JSON.stringify({
					error:
						"Not found"
				}),
				{
					status: 404,
					headers: {
						...corsHeaders,
						"Content-Type":
							"application/json"
					}
				}
			)
		} catch (error) {
			console.error(
				"WORKER ERROR:",
				error
			)

			return new Response(
				JSON.stringify({
					error:
						error instanceof Error
							? error.message
							: "Internal server error"
				}),
				{
					status: 500,
					headers: {
						...corsHeaders,
						"Content-Type":
							"application/json"
					}
				}
			)
		}
	}
}
