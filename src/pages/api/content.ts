// API endpoint for content file operations - DISABLED due to Astro 5.x issues
// File operations now handled client-side with download workflow
import type { APIRoute } from 'astro'

export const GET: APIRoute = async () => {
	return new Response(JSON.stringify({
		message: 'LLMCMS Content API - Currently Disabled',
		reason: 'Astro 5.x has fundamental issues with request body parsing',
		workaround: 'File operations now handled client-side with download workflow',
		status: 'Working - files are generated and downloaded for manual saving to /content/',
		documentation: 'See context/0016__debug-and-fix-500-server-errors.md for details'
	}), {
		status: 200,
		headers: { 'Content-Type': 'application/json' }
	})
}

export const POST: APIRoute = async () => {
	return new Response(JSON.stringify({
		success: false,
		error: 'API endpoint disabled due to Astro 5.x request body parsing issues',
		workaround: 'File operations are now handled client-side with download workflow',
		instructions: 'Use the LLMCMS UI - files will be generated and downloaded automatically'
	}), {
		status: 501, // Not Implemented
		headers: { 'Content-Type': 'application/json' }
	})
} 