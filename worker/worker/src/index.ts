import { AwsClient } from "aws4fetch"
import { verifyToken } from "@clerk/backend"

interface Env {
	B2_APPLICATION_KEY_ID: string
	B2_APPLICATION_KEY: string
	B2_ENDPOINT: string
	B2_BUCKET_NAME: string
	CLERK_SECRET_KEY: string
	DB: D1Database
}

const corsHeaders = {
	"Access-Control-Allow-Origin":
		"https://arcticfiles-cloud.poopeating1234.workers.dev",
	"Access-Control-Allow-Methods":
		"GET, POST, OPTIONS",
	"Access-Control-Allow-Headers":
		"Content-Type, Authorization"
}

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			...corsHeaders,
			"Content-Type": "application/json"
		}
	})
}

function createB2Client(env: Env) {
	return new AwsClient({
		accessKeyId: env.B2_APPLICATION_KEY_ID,
		secretAccessKey: env.B2_APPLICATION_KEY,
		service: "s3",
		region: "ca-east-006"
	})
}

function getB2ObjectUrl(env: Env, key: string) {
	const encodedKey = key
		.split("/")
		.map(part => encodeURIComponent(part))
		.join("/")

	return `${env.B2_ENDPOINT}/${env.B2_BUCKET_NAME}/${encodedKey}`
}

async function getUserId(
	request: Request,
	env: Env
): Promise<string | null> {
	const authorization =
		request.headers.get("Authorization")

	if (!authorization?.startsWith("Bearer ")) {
		return null
	}

	const token = authorization.slice(7)

	try {
		const result = await verifyToken(token, {
			secretKey: env.CLERK_SECRET_KEY
		})

		return result.sub
	} catch {
		return null
	}
}

function generateDownloadKey() {
	const bytes = new Uint8Array(12)

	crypto.getRandomValues(bytes)

	return Array.from(bytes)
		.map(byte =>
			byte.toString(16).padStart(2, "0")
		)
		.join("")
		.toUpperCase()
}

export default {
	async fetch(
		request: Request,
		env: Env
	): Promise<Response> {
		if (request.method === "OPTIONS") {
			return new Response(null, {
				status: 204,
				headers: corsHeaders
			})
		}

		const url = new URL(request.url)
		const path = url.pathname

		try {
			/*
			 * UPLOAD
			 */
			if (
				path === "/upload" &&
				request.method === "POST"
			) {
				const userId =
					await getUserId(request, env)

				if (!userId) {
					return json(
						{ error: "Unauthorized" },
						401
					)
				}

				const formData =
					await request.formData()

				const file = formData.get("file")

				if (!(file instanceof File)) {
					return json(
						{
							error:
								"No file provided"
						},
						400
					)
				}

				const originalName =
					file.name || "file"

				const safeName =
					originalName
						.replace(/[\/\\]/g, "_")
						.replace(/\.\./g, "_")

				const fileKey =
					`${Date.now()}_${crypto.randomUUID()}_${safeName}`

				const client =
					createB2Client(env)

				const b2Response =
					await client.fetch(
						getB2ObjectUrl(
							env,
							fileKey
						),
						{
							method: "PUT",
							headers: {
								"Content-Type":
									file.type ||
									"application/octet-stream"
							},
							body: file.stream()
						}
					)

				const b2Text =
					await b2Response.text()

				if (!b2Response.ok) {
					return json(
						{
							error:
								"B2 upload failed",
							status:
							b2Response.status,
							details:
							b2Text
						},
						500
					)
				}

				await env.DB.prepare(`
                    INSERT INTO files (
                        user_id,
                        file_key,
                        file_name,
                        file_size,
                        content_type,
                        created_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?)
                `)
					.bind(
						userId,
						fileKey,
						originalName,
						file.size,
						file.type ||
						"application/octet-stream",
						Date.now()
					)
					.run()

				return json({
					success: true,
					file: {
						key: fileKey,
						name: originalName,
						size: file.size,
						type:
							file.type ||
							"application/octet-stream"
					}
				})
			}

			/*
			 * GET MY FILES
			 *
			 * Only returns files owned by the
			 * currently logged-in Clerk account.
			 */
			if (
				path === "/files" &&
				request.method === "GET"
			) {
				const userId =
					await getUserId(request, env)

				if (!userId) {
					return json(
						{ error: "Unauthorized" },
						401
					)
				}

				const result =
					await env.DB.prepare(`
                        SELECT
                            id,
                            file_key,
                            file_name,
                            file_size,
                            content_type,
                            created_at
                        FROM files
                        WHERE user_id = ?
                        ORDER BY created_at DESC
                    `)
						.bind(userId)
						.all()

				return json({
					files: result.results.map(
						(file: any) => ({
							id: file.id,
							key: file.file_key,
							name: file.file_name,
							size: file.file_size,
							type:
							file.content_type,
							createdAt:
							file.created_at
						})
					)
				})
			}

			/*
			 * GENERATE DOWNLOAD KEY
			 *
			 * Only the owner of a file can generate
			 * a download key for that file.
			 */
			if (
				path === "/share" &&
				request.method === "POST"
			) {
				const userId =
					await getUserId(request, env)

				if (!userId) {
					return json(
						{ error: "Unauthorized" },
						401
					)
				}

				const body =
					await request.json<{
						fileKey?: string
					}>()

				if (!body.fileKey) {
					return json(
						{
							error:
								"fileKey is required"
						},
						400
					)
				}

				const ownedFile =
					await env.DB.prepare(`
                        SELECT file_key
                        FROM files
                        WHERE file_key = ?
                        AND user_id = ?
                        LIMIT 1
                    `)
						.bind(
							body.fileKey,
							userId
						)
						.first()

				if (!ownedFile) {
					return json(
						{
							error:
								"File not found"
						},
						404
					)
				}

				const code =
					generateDownloadKey()

				await env.DB.prepare(`
                    INSERT INTO shares (
                        code,
                        owner_id,
                        file_key,
                        created_at
                    )
                    VALUES (?, ?, ?, ?)
                `)
					.bind(
						code,
						userId,
						body.fileKey,
						Date.now()
					)
					.run()

				return json({
					success: true,
					code,
					fileKey: body.fileKey
				})
			}

			/*
			 * DOWNLOAD USING DOWNLOAD KEY
			 *
			 * The person entering the key does NOT
			 * need to own the file.
			 */
			if (
				path.startsWith("/download/") &&
				request.method === "GET"
			) {
				const code =
					path.slice(
						"/download/".length
					)

				if (!code) {
					return json(
						{
							error:
								"Download key required"
						},
						400
					)
				}

				const share =
					await env.DB.prepare(`
                        SELECT
                            file_key
                        FROM shares
                        WHERE code = ?
                        LIMIT 1
                    `)
						.bind(code)
						.first<{
							file_key: string
						}>()

				if (!share) {
					return json(
						{
							error:
								"Invalid download key"
						},
						404
					)
				}

				const file =
					await env.DB.prepare(`
                        SELECT
                            file_name,
                            content_type
                        FROM files
                        WHERE file_key = ?
                        LIMIT 1
                    `)
						.bind(share.file_key)
						.first<{
							file_name: string
							content_type: string
						}>()

				if (!file) {
					return json(
						{
							error:
								"File no longer exists"
						},
						404
					)
				}

				const client =
					createB2Client(env)

				const b2Response =
					await client.fetch(
						getB2ObjectUrl(
							env,
							share.file_key
						),
						{
							method: "GET"
						}
					)

				if (!b2Response.ok) {
					const errorText =
						await b2Response.text()

					return json(
						{
							error:
								"B2 download failed",
							status:
							b2Response.status,
							details:
							errorText
						},
						500
					)
				}

				const headers =
					new Headers(corsHeaders)

				headers.set(
					"Content-Type",
					file.content_type ||
					"application/octet-stream"
				)

				headers.set(
					"Content-Disposition",
					`attachment; filename="${file.file_name.replace(/"/g, "")}"`
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

				return new Response(
					b2Response.body,
					{
						status: 200,
						headers
					}
				)
			}

			/*
			 * DOWNLOAD OWN FILE
			 */
			if (
				path === "/download-own" &&
				request.method === "GET"
			) {
				const userId =
					await getUserId(request, env)

				if (!userId) {
					return json(
						{ error: "Unauthorized" },
						401
					)
				}

				const fileKey =
					url.searchParams.get("file")

				if (!fileKey) {
					return json(
						{
							error:
								"file is required"
						},
						400
					)
				}

				const file =
					await env.DB.prepare(`
                        SELECT
                            file_key,
                            file_name,
                            content_type
                        FROM files
                        WHERE file_key = ?
                        AND user_id = ?
                        LIMIT 1
                    `)
						.bind(
							fileKey,
							userId
						)
						.first<{
							file_key: string
							file_name: string
							content_type: string
						}>()

				if (!file) {
					return json(
						{
							error:
								"File not found"
						},
						404
					)
				}

				const client =
					createB2Client(env)

				const b2Response =
					await client.fetch(
						getB2ObjectUrl(
							env,
							file.file_key
						),
						{
							method: "GET"
						}
					)

				if (!b2Response.ok) {
					const errorText =
						await b2Response.text()

					return json(
						{
							error:
								"B2 download failed",
							status:
							b2Response.status,
							details:
							errorText
						},
						500
					)
				}

				const headers =
					new Headers(corsHeaders)

				headers.set(
					"Content-Type",
					file.content_type ||
					"application/octet-stream"
				)

				headers.set(
					"Content-Disposition",
					`attachment; filename="${file.file_name.replace(/"/g, "")}"`
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

				return new Response(
					b2Response.body,
					{
						status: 200,
						headers
					}
				)
			}

			return json(
				{
					error: "Not found"
				},
				404
			)
		} catch (error) {
			console.error(
				"WORKER ERROR:",
				error
			)

			return json(
				{
					error:
						"Internal server error",
					message:
						error instanceof Error
							? error.message
							: String(error)
				},
				500
			)
		}
	}
}
