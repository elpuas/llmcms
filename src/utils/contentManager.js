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
		// Handle empty or null content
		if (!fileContent || typeof fileContent !== 'string') {
			console.warn('parseMarkdown: Empty or invalid content provided')
			return {
				frontmatter: {},
				content: '',
				raw: fileContent || ''
			}
		}
		
		// Handle content without frontmatter
		if (!fileContent.startsWith('---')) {
			console.info('parseMarkdown: No frontmatter found, treating as plain content')
			return {
				frontmatter: {},
				content: fileContent,
				raw: fileContent
			}
		}
		
		const { data, content } = matter(fileContent)
		
		// Ensure frontmatter is an object
		const frontmatter = data && typeof data === 'object' ? data : {}
		
		return {
			frontmatter,
			content: content || '',
			raw: fileContent
		}
	} catch (error) {
		console.error('Error parsing markdown:', error)
		console.error('Content preview:', fileContent?.substring(0, 100) + '...')
		
		// Return safe fallback
		return {
			frontmatter: {},
			content: fileContent || '',
			raw: fileContent || ''
		}
	}
}

// Generate markdown file with frontmatter
export function generateMarkdown(content, frontmatter = {}) {
	try {
		// Validate inputs
		if (typeof content !== 'string') {
			console.warn('generateMarkdown: Content must be a string')
			content = String(content || '')
		}
		
		if (!frontmatter || typeof frontmatter !== 'object') {
			console.warn('generateMarkdown: Frontmatter must be an object')
			frontmatter = {}
		}
		
		// Ensure we have required frontmatter fields
		const title = frontmatter.title || extractTitle(content) || 'Untitled Document'
		const completeFrontmatter = {
			title,
			date: frontmatter.date || new Date().toISOString().split('T')[0],
			slug: frontmatter.slug || generateSlug(title),
			...frontmatter
		}

		// Validate the generated frontmatter
		if (!completeFrontmatter.title || !completeFrontmatter.slug) {
			throw new Error('Invalid frontmatter: title and slug are required')
		}

		const result = matter.stringify(content, completeFrontmatter)
		
		// Validate the result is not empty
		if (!result || result.trim() === '') {
			throw new Error('Generated markdown is empty')
		}
		
		return result
	} catch (error) {
		console.error('Error generating markdown:', error)
		console.error('Content:', content?.substring(0, 50) + '...')
		console.error('Frontmatter:', frontmatter)
		
		// Create a basic fallback with minimal frontmatter
		const fallbackTitle = extractTitle(content) || 'Untitled Document'
		const fallbackFrontmatter = {
			title: fallbackTitle,
			date: new Date().toISOString().split('T')[0],
			slug: generateSlug(fallbackTitle)
		}
		
		try {
			return matter.stringify(content || '', fallbackFrontmatter)
		} catch (fallbackError) {
			console.error('Fallback generation also failed:', fallbackError)
			// Last resort: manual creation
			return `---
title: ${fallbackTitle}
date: ${fallbackFrontmatter.date}
slug: ${fallbackFrontmatter.slug}
---

${content || ''}`.trim()
		}
	}
}

// Load content file using File System Access API
export async function loadContentFile(filename) {
	try {
		const { isFileSystemAccessSupported, readContentFile } = await import('./fileSystemManager.js')
		
		// Check if File System Access API is supported
		if (!isFileSystemAccessSupported()) {
			throw new Error('File System Access API not supported in this browser. Please use Chrome, Edge, or another Chromium-based browser.')
		}
		
		console.log('📖 Loading content file with File System Access API:', filename)
		
		// Ensure filename has .md extension
		const fileName = filename.endsWith('.md') ? filename : `${filename}.md`
		
		// Read file directly from /content/ directory using File System Access API
		const readResult = await readContentFile(fileName)
		
		// Parse the markdown content with frontmatter
		const parsed = parseFrontmatter(readResult.content)
		
		const result = {
			success: true,
			filename: fileName,
			slug: fileName.replace('.md', ''),
			content: readResult.content,
			body: parsed.content,
			frontmatter: parsed.data,
			path: `content/${fileName}`,
			method: 'File System Access API'
		}
		
		console.log('✅ Content file loaded successfully:', result)
		return result
		
	} catch (error) {
		console.error(`Error loading content file ${filename}:`, error)
		return {
			success: false,
			error: error.message,
			suggestion: error.message.includes('not supported') 
				? 'Please use Chrome, Edge, or another Chromium-based browser that supports the File System Access API.'
				: error.message.includes('not found')
				? 'Make sure the file exists in your selected /content/ directory.'
				: 'Check that you have granted directory access permissions.'
		}
	}
}

// List all content files using File System Access API
export async function listContentFiles() {
	try {
		const { isFileSystemAccessSupported, listContentFiles: listFiles } = await import('./fileSystemManager.js')
		
		// Check if File System Access API is supported
		if (!isFileSystemAccessSupported()) {
			throw new Error('File System Access API not supported in this browser. Please use Chrome, Edge, or another Chromium-based browser.')
		}
		
		console.log('📋 Listing content files with File System Access API')
		
		// Get file list directly from /content/ directory using File System Access API
		const listResult = await listFiles()
		
		const result = {
			success: true,
			files: listResult.files,
			count: listResult.files.length,
			method: 'File System Access API'
		}
		
		console.log('✅ Content files listed successfully:', result)
		return result
		
	} catch (error) {
		console.error('Error listing content files:', error)
		return {
			success: false,
			error: error.message,
			suggestion: error.message.includes('not supported') 
				? 'Please use Chrome, Edge, or another Chromium-based browser that supports the File System Access API.'
				: 'Check that you have granted directory access permissions and selected a valid /content/ directory.'
		}
	}
}

// Create new content file using File System Access API
export async function createContentFile(content, options = {}) {
	try {
		const { isFileSystemAccessSupported, writeContentFile } = await import('./fileSystemManager.js')
		
		// Check if File System Access API is supported
		if (!isFileSystemAccessSupported()) {
			throw new Error('File System Access API not supported in this browser. Please use Chrome, Edge, or another Chromium-based browser.')
		}
		
		const title = options.frontmatter?.title || options.title || extractTitle(content)
		const slug = options.frontmatter?.slug || options.slug || generateSlug(title)
		const author = options.frontmatter?.author || options.author
		
		// Validate required fields
		if (!title || title.trim() === '') {
			throw new Error('Title is required')
		}
		
		if (!content || content.trim() === '') {
			throw new Error('Content cannot be empty')
		}
		
		console.log('📝 Creating content file with File System Access API:', { title, slug, author })
		
		// Generate complete frontmatter
		const frontmatter = {
			title: title.trim(),
			date: new Date().toISOString().split('T')[0],
			slug: slug.trim(),
			...(author && author.trim() && { author: author.trim() }),
			...options.frontmatter
		}
		
		// Generate the complete markdown content with frontmatter
		const markdownContent = generateMarkdown(content, frontmatter)
		const fileName = `${slug}.md`
		
		console.log('📄 Generated markdown content:', markdownContent.substring(0, 200) + '...')
		
		// Write file directly to /content/ directory using File System Access API
		const writeResult = await writeContentFile(fileName, markdownContent)
		
		// Return success response compatible with existing UI
		const result = {
			success: true,
			slug: slug,
			fileName: fileName,
			content: markdownContent,
			path: writeResult.path,
			note: `File saved to ${writeResult.path}`,
			method: 'File System Access API'
		}
		
		console.log('✅ Content file created successfully:', result)
		return result
		
	} catch (error) {
		console.error(`Error creating content file:`, error)
		return {
			success: false,
			error: error.message,
			suggestion: error.message.includes('not supported') 
				? 'Please use Chrome, Edge, or another Chromium-based browser that supports the File System Access API.'
				: 'Check that you have granted directory access permissions.'
		}
	}
}

// Save content file using File System Access API  
export async function saveContentFile(slug, content, frontmatter = {}) {
	try {
		const { isFileSystemAccessSupported, writeContentFile } = await import('./fileSystemManager.js')
		
		// Check if File System Access API is supported
		if (!isFileSystemAccessSupported()) {
			throw new Error('File System Access API not supported in this browser. Please use Chrome, Edge, or another Chromium-based browser.')
		}
		
		console.log('💾 Saving content file with File System Access API:', { slug })
		
		// Ensure we have required fields
		if (!slug || slug.trim() === '') {
			throw new Error('Slug is required for saving')
		}
		
		// Ensure frontmatter has required fields
		const completeFrontmatter = {
			title: frontmatter.title || extractTitle(content) || 'Untitled',
			date: frontmatter.date || new Date().toISOString().split('T')[0],
			slug: slug.trim(),
			...frontmatter
		}
		
		// Generate the complete markdown content with frontmatter
		const markdownContent = generateMarkdown(content, completeFrontmatter)
		const fileName = `${slug}.md`
		
		console.log('📄 Generated updated markdown content:', markdownContent.substring(0, 200) + '...')
		
		// Write file directly to /content/ directory using File System Access API
		const writeResult = await writeContentFile(fileName, markdownContent)
		
		// Return success response compatible with existing UI
		const result = {
			success: true,
			slug: slug,
			fileName: fileName,
			content: markdownContent,
			path: writeResult.path,
			note: `File saved to ${writeResult.path}`,
			method: 'File System Access API'
		}
		
		console.log('✅ Content file saved successfully:', result)
		return result
		
	} catch (error) {
		console.error(`Error saving content file ${slug}:`, error)
		return {
			success: false,
			error: error.message,
			suggestion: error.message.includes('not supported') 
				? 'Please use Chrome, Edge, or another Chromium-based browser that supports the File System Access API.'
				: 'Check that you have granted directory access permissions.'
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

// Simple test function to validate core functionality
export function testContentManager() {
	console.log('🧪 Testing LLMCMS Content Manager...')
	
	const tests = []
	
	// Test 1: Parse valid markdown with frontmatter
	try {
		const validMarkdown = `---
title: Test Document
date: 2025-01-29
slug: test-document
---

# Test Document

This is a test.`
		
		const parsed = parseMarkdown(validMarkdown)
		if (parsed.frontmatter.title === 'Test Document' && parsed.content.includes('This is a test.')) {
			tests.push('✅ Parse valid markdown: PASSED')
		} else {
			tests.push('❌ Parse valid markdown: FAILED')
		}
	} catch (error) {
		tests.push('❌ Parse valid markdown: ERROR - ' + error.message)
	}
	
	// Test 2: Parse markdown without frontmatter
	try {
		const plainMarkdown = '# Plain Document\n\nJust content here.'
		const parsed = parseMarkdown(plainMarkdown)
		if (parsed.content.includes('Plain Document') && typeof parsed.frontmatter === 'object') {
			tests.push('✅ Parse plain markdown: PASSED')
		} else {
			tests.push('❌ Parse plain markdown: FAILED')
		}
	} catch (error) {
		tests.push('❌ Parse plain markdown: ERROR - ' + error.message)
	}
	
	// Test 3: Parse empty content
	try {
		const empty = parseMarkdown('')
		if (empty.content === '' && typeof empty.frontmatter === 'object') {
			tests.push('✅ Parse empty content: PASSED')
		} else {
			tests.push('❌ Parse empty content: FAILED')
		}
	} catch (error) {
		tests.push('❌ Parse empty content: ERROR - ' + error.message)
	}
	
	// Test 4: Generate markdown
	try {
		const content = '# Generated Document\n\nGenerated content.'
		const frontmatter = { title: 'Generated', slug: 'generated' }
		const generated = generateMarkdown(content, frontmatter)
		if (generated.includes('---') && generated.includes('title: Generated') && generated.includes('Generated content.')) {
			tests.push('✅ Generate markdown: PASSED')
		} else {
			tests.push('❌ Generate markdown: FAILED')
		}
	} catch (error) {
		tests.push('❌ Generate markdown: ERROR - ' + error.message)
	}
	
	// Test 5: Round-trip test (parse then generate)
	try {
		const original = `---
title: Round Trip Test
date: 2025-01-29
slug: round-trip
---

# Round Trip Test

Content that goes round trip.`
		
		const parsed = parseMarkdown(original)
		const regenerated = generateMarkdown(parsed.content, parsed.frontmatter)
		const reparsed = parseMarkdown(regenerated)
		
		if (reparsed.frontmatter.title === 'Round Trip Test' && reparsed.content.includes('Content that goes round trip.')) {
			tests.push('✅ Round-trip test: PASSED')
		} else {
			tests.push('❌ Round-trip test: FAILED')
		}
	} catch (error) {
		tests.push('❌ Round-trip test: ERROR - ' + error.message)
	}
	
	// Test 6: Validate frontmatter
	try {
		const validFrontmatter = { title: 'Valid', slug: 'valid', date: '2025-01-29' }
		const validation = validateFrontmatter(validFrontmatter)
		if (validation.isValid === true && validation.errors.length === 0) {
			tests.push('✅ Validate frontmatter: PASSED')
		} else {
			tests.push('❌ Validate frontmatter: FAILED')
		}
	} catch (error) {
		tests.push('❌ Validate frontmatter: ERROR - ' + error.message)
	}
	
	// Log results
	tests.forEach(test => console.log(test))
	
	const passed = tests.filter(t => t.includes('✅')).length
	const total = tests.length
	
	console.log(`🧪 Content Manager Tests: ${passed}/${total} passed`)
	
	if (passed === total) {
		console.log('🎉 All tests passed! Content Manager is working correctly.')
		return true
	} else {
		console.error('⚠️ Some tests failed. Check the implementation.')
		return false
	}
}

// Auto-run tests in development
if (typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
	// Run tests after a short delay to avoid blocking
	setTimeout(() => {
		try {
			testContentManager()
		} catch (error) {
			console.error('❌ Content Manager test failed:', error)
		}
	}, 1000)
} 