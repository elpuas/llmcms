// contentManager.js - Local content/ folder management for LLMCMS
import matter from 'gray-matter'

// Generate slug from title
function generateSlug(title) {
	return title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
}

// Extract title from content (first heading)
function extractTitle(content) {
	const headingMatch = content.match(/^#\s+(.+)$/m)
	return headingMatch ? headingMatch[1] : 'Untitled Document'
}

// Generate default frontmatter
function generateFrontmatter(content, slug = null) {
	const title = extractTitle(content)
	const generatedSlug = slug || generateSlug(title)
	
	return {
		title,
		date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
		slug: generatedSlug
	}
}

// Parse markdown file with frontmatter
export function parseMarkdown(fileContent) {
	try {
		const { data, content } = matter(fileContent)
		return {
			frontmatter: data,
			content,
			raw: fileContent
		}
	} catch (error) {
		console.error('Error parsing markdown:', error)
		return {
			frontmatter: {},
			content: fileContent,
			raw: fileContent
		}
	}
}

// Generate markdown file with frontmatter
export function generateMarkdown(content, frontmatter = {}) {
	try {
		// Ensure we have required frontmatter fields
		const title = frontmatter.title || extractTitle(content)
		const completeFrontmatter = {
			title,
			date: frontmatter.date || new Date().toISOString().split('T')[0],
			slug: frontmatter.slug || generateSlug(title),
			...frontmatter
		}

		return matter.stringify(content, completeFrontmatter)
	} catch (error) {
		console.error('Error generating markdown:', error)
		return content
	}
}

// List all markdown files in content/ directory
export async function listContentFiles() {
	try {
		// In a browser environment, we need to use fetch to get file listings
		// This is a limitation - in a real implementation, this would need a file system API
		// For now, we'll return a mock list or implement this differently
		console.warn('listContentFiles: Browser environment detected - file listing not available')
		return []
	} catch (error) {
		console.error('Error listing content files:', error)
		return []
	}
}

// Load content file by slug
export async function loadContentFile(slug) {
	try {
		const response = await fetch(`/content/${slug}.md`)
		
		if (!response.ok) {
			throw new Error(`File not found: ${slug}.md`)
		}
		
		const fileContent = await response.text()
		const parsed = parseMarkdown(fileContent)
		
		return {
			success: true,
			slug,
			...parsed
		}
	} catch (error) {
		console.error(`Error loading content file ${slug}:`, error)
		return {
			success: false,
			error: error.message
		}
	}
}

// Save content file
export async function saveContentFile(slug, content, frontmatter = {}) {
	try {
		const markdownContent = generateMarkdown(content, frontmatter)
		
		// In a browser environment, we can't directly write to the file system
		// This would need to be handled by the server or through a file system API
		// For now, we'll simulate the save operation
		console.log(`Saving content to ${slug}.md:`, markdownContent)
		
		// In a real implementation, this would make a POST request to a server endpoint
		// or use the File System Access API (which we're avoiding per requirements)
		// For development, we'll just log the content
		
		return {
			success: true,
			slug,
			fileName: `${slug}.md`,
			content: markdownContent
		}
	} catch (error) {
		console.error(`Error saving content file ${slug}:`, error)
		return {
			success: false,
			error: error.message
		}
	}
}

// Create new content file
export async function createContentFile(content, options = {}) {
	try {
		const title = options.title || extractTitle(content)
		const slug = options.slug || generateSlug(title)
		const frontmatter = {
			...generateFrontmatter(content, slug),
			...options.frontmatter
		}
		
		return await saveContentFile(slug, content, frontmatter)
	} catch (error) {
		console.error('Error creating content file:', error)
		return {
			success: false,
			error: error.message
		}
	}
}

// Validate frontmatter
export function validateFrontmatter(frontmatter) {
	const errors = []
	
	if (!frontmatter.title) {
		errors.push('Title is required')
	}
	
	if (!frontmatter.slug) {
		errors.push('Slug is required')
	}
	
	if (!frontmatter.date) {
		errors.push('Date is required')
	} else {
		const dateRegex = /^\d{4}-\d{2}-\d{2}$/
		if (!dateRegex.test(frontmatter.date)) {
			errors.push('Date must be in YYYY-MM-DD format')
		}
	}
	
	return {
		isValid: errors.length === 0,
		errors
	}
}

// Get file metadata from frontmatter
export function getFileMetadata(frontmatter) {
	return {
		title: frontmatter.title || 'Untitled',
		slug: frontmatter.slug || 'untitled',
		date: frontmatter.date || new Date().toISOString().split('T')[0],
		tags: frontmatter.tags || [],
		description: frontmatter.description || '',
		author: frontmatter.author || '',
		draft: frontmatter.draft || false
	}
} 