// File System Access API manager for LLMCMS
// Handles persistent access to /content/ directory

import { 
	storeDirectoryHandle as storeHandle, 
	getStoredDirectoryHandle as getHandle, 
	clearStoredDirectoryHandle 
} from './indexedDB.js'

let contentDirectoryHandle = null

// Check if File System Access API is supported
export function isFileSystemAccessSupported() {
	return 'showDirectoryPicker' in window && 'showOpenFilePicker' in window
}

// Store directory handle using IndexedDB utility
async function storeDirectoryHandle(handle) {
	return await storeHandle(handle)
}

// Retrieve directory handle using IndexedDB utility
async function getStoredDirectoryHandle() {
	return await getHandle()
}

// Check if we have permission to access the directory
async function checkDirectoryPermission(handle) {
	try {
		const permission = await handle.queryPermission({ mode: 'readwrite' })
		if (permission === 'granted') {
			return true
		}
		
		// Try to request permission
		const requestedPermission = await handle.requestPermission({ mode: 'readwrite' })
		return requestedPermission === 'granted'
	} catch (error) {
		console.error('Permission check failed:', error)
		return false
	}
}

// Validate that the handle is actually a directory
async function validateDirectoryHandle(handle) {
	try {
		if (!handle || handle.kind !== 'directory') {
			throw new Error('Selected item is not a directory')
		}
		
		// Test if we can iterate over directory entries
		const entries = handle.entries()
		await entries.next() // Just test the first iteration
		
		return true
	} catch (error) {
		console.error('Directory validation failed:', error)
		return false
	}
}

// Clean up IndexedDB if permissions are revoked
async function cleanupRevokedPermissions() {
	try {
		await clearStoredDirectoryHandle()
		console.log('🧹 Directory permissions cleaned up')
	} catch (error) {
		console.error('Error cleaning up permissions:', error)
	}
}

// Initialize or get the content directory handle
export async function getContentDirectoryHandle() {
	// Return cached handle if available and still valid
	if (contentDirectoryHandle) {
		const hasPermission = await checkDirectoryPermission(contentDirectoryHandle)
		if (hasPermission) {
			const isValid = await validateDirectoryHandle(contentDirectoryHandle)
			if (isValid) {
				return contentDirectoryHandle
			} else {
				console.warn('Cached directory handle is no longer valid')
				contentDirectoryHandle = null
			}
		} else {
			console.warn('Cached directory handle lost permissions')
			contentDirectoryHandle = null
			await cleanupRevokedPermissions()
		}
	}

	// Try to get stored handle
	const storedHandle = await getStoredDirectoryHandle()
	if (storedHandle) {
		const hasPermission = await checkDirectoryPermission(storedHandle)
		if (hasPermission) {
			const isValid = await validateDirectoryHandle(storedHandle)
			if (isValid) {
				contentDirectoryHandle = storedHandle
				return contentDirectoryHandle
			} else {
				console.warn('Stored directory handle is no longer valid')
				await cleanupRevokedPermissions()
			}
		} else {
			console.warn('Stored directory handle lost permissions')
			await cleanupRevokedPermissions()
		}
	}

	// Prompt user to select directory
	try {
		console.log('📁 Prompting user to select /content/ directory...')
		
		const handle = await window.showDirectoryPicker({
			mode: 'readwrite',
			startIn: 'documents'
		})

		// Validate it's actually a directory
		const isValid = await validateDirectoryHandle(handle)
		if (!isValid) {
			throw new Error('Selected item is not a valid directory')
		}

		// Verify permission
		const hasPermission = await checkDirectoryPermission(handle)
		if (!hasPermission) {
			throw new Error('Permission denied for directory access')
		}

		// Store the handle for future use
		await storeDirectoryHandle(handle)
		contentDirectoryHandle = handle
		
		console.log('✅ Content directory selected and stored:', handle.name)
		return contentDirectoryHandle

	} catch (error) {
		if (error.name === 'AbortError') {
			throw new Error('Directory selection cancelled by user')
		}
		console.error('Failed to get directory handle:', error)
		throw new Error(`Failed to access directory: ${error.message}`)
	}
}

// Ensure filename has .md extension
function ensureMarkdownExtension(filename) {
	if (!filename || typeof filename !== 'string') {
		throw new Error('Invalid filename provided')
	}
	
	const cleanFilename = filename.trim()
	if (!cleanFilename) {
		throw new Error('Filename cannot be empty')
	}
	
	// Add .md extension if not present
	return cleanFilename.endsWith('.md') ? cleanFilename : `${cleanFilename}.md`
}

// Check if file exists in directory
async function checkFileExists(directoryHandle, filename) {
	try {
		await directoryHandle.getFileHandle(filename)
		return true
	} catch (error) {
		if (error.name === 'NotFoundError') {
			return false
		}
		throw error
	}
}

// Show confirmation dialog for file overwrite
async function confirmFileOverwrite(filename) {
	return new Promise((resolve) => {
		const modal = document.createElement('div')
		modal.style.cssText = `
			position: fixed;
			top: 0;
			left: 0;
			right: 0;
			bottom: 0;
			background: rgba(0, 0, 0, 0.7);
			display: flex;
			align-items: center;
			justify-content: center;
			z-index: 10000;
			font-family: system-ui, -apple-system, sans-serif;
		`
		
		modal.innerHTML = `
			<div style="
				background: white;
				padding: 24px;
				border-radius: 8px;
				max-width: 400px;
				box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
			">
				<h3 style="margin: 0 0 16px 0; color: #d97706;">⚠️ File Already Exists</h3>
				<p style="margin: 0 0 20px 0; color: #374151;">
					The file <strong>${filename}</strong> already exists. Do you want to overwrite it?
				</p>
				<div style="display: flex; gap: 12px; justify-content: flex-end;">
					<button id="cancel-btn" style="
						padding: 8px 16px;
						border: 1px solid #d1d5db;
						background: white;
						border-radius: 4px;
						cursor: pointer;
					">Cancel</button>
					<button id="overwrite-btn" style="
						padding: 8px 16px;
						border: none;
						background: #dc2626;
						color: white;
						border-radius: 4px;
						cursor: pointer;
					">Overwrite</button>
				</div>
			</div>
		`
		
		document.body.appendChild(modal)
		
		const cleanup = () => {
			if (modal.parentElement) {
				document.body.removeChild(modal)
			}
		}
		
		modal.querySelector('#cancel-btn').onclick = () => {
			cleanup()
			resolve(false)
		}
		
		modal.querySelector('#overwrite-btn').onclick = () => {
			cleanup()
			resolve(true)
		}
		
		// Close on outside click
		modal.onclick = (e) => {
			if (e.target === modal) {
				cleanup()
				resolve(false)
			}
		}
	})
}

// Write a file to the content directory
export async function writeContentFile(filename, content, options = {}) {
	try {
		// Validate inputs
		if (!content || typeof content !== 'string') {
			throw new Error('Content must be a non-empty string')
		}
		
		const directoryHandle = await getContentDirectoryHandle()
		const validFilename = ensureMarkdownExtension(filename)
		
		// Check if file exists and get user confirmation for overwrite
		const fileExists = await checkFileExists(directoryHandle, validFilename)
		if (fileExists && !options.force) {
			const shouldOverwrite = await confirmFileOverwrite(validFilename)
			if (!shouldOverwrite) {
				throw new Error('File write cancelled by user')
			}
		}
		
		// Create or get file handle
		const fileHandle = await directoryHandle.getFileHandle(validFilename, { create: true })
		
		// Create writable stream
		const writable = await fileHandle.createWritable()
		
		// Write content
		await writable.write(content)
		await writable.close()
		
		console.log(`✅ File written successfully: ${validFilename}`)
		return { 
			success: true, 
			filename: validFilename, 
			path: `${directoryHandle.name}/${validFilename}`,
			wasOverwritten: fileExists
		}

	} catch (error) {
		console.error(`Failed to write file ${filename}:`, error)
		const errorMessage = error.message.includes('cancelled') 
			? 'File write cancelled by user'
			: `Failed to write file: ${error.message}`
		throw new Error(errorMessage)
	}
}

// Read a file from the content directory
export async function readContentFile(filename) {
	try {
		const directoryHandle = await getContentDirectoryHandle()
		const validFilename = ensureMarkdownExtension(filename)
		
		// Get file handle
		const fileHandle = await directoryHandle.getFileHandle(validFilename)
		
		// Read file content
		const file = await fileHandle.getFile()
		const content = await file.text()
		
		// Validate content
		if (typeof content !== 'string') {
			throw new Error('File content is not valid text')
		}
		
		console.log(`✅ File read successfully: ${validFilename}`)
		return { success: true, filename: validFilename, content }

	} catch (error) {
		if (error.name === 'NotFoundError') {
			throw new Error(`File not found: ${filename}`)
		}
		console.error(`Failed to read file ${filename}:`, error)
		throw new Error(`Failed to read file: ${error.message}`)
	}
}

// List all .md files in the content directory
export async function listContentFiles() {
	try {
		const directoryHandle = await getContentDirectoryHandle()
		
		const files = []
		for await (const [name, handle] of directoryHandle.entries()) {
			if (handle.kind === 'file' && name.endsWith('.md')) {
				files.push({
					name,
					slug: name.replace('.md', ''),
					handle
				})
			}
		}
		
		console.log(`✅ Found ${files.length} content files`)
		return { success: true, files }

	} catch (error) {
		console.error('Failed to list content files:', error)
		throw new Error(`Failed to list files: ${error.message}`)
	}
}

// Check if directory access is available and configured (non-interactive)
export async function isDirectoryAccessConfigured() {
	try {
		if (!isFileSystemAccessSupported()) {
			return false
		}

		// Check if we have a cached handle first (fastest)
		if (contentDirectoryHandle) {
			const hasPermission = await checkDirectoryPermission(contentDirectoryHandle)
			if (hasPermission) {
				const isValid = await validateDirectoryHandle(contentDirectoryHandle)
				return isValid
			} else {
				// Permission lost, clear cache
				contentDirectoryHandle = null
				await cleanupRevokedPermissions()
				return false
			}
		}

		// Check stored handle without triggering directory picker
		const storedHandle = await getStoredDirectoryHandle()
		if (!storedHandle) {
			return false
		}

		const hasPermission = await checkDirectoryPermission(storedHandle)
		if (hasPermission) {
			const isValid = await validateDirectoryHandle(storedHandle)
			if (isValid) {
				// Cache for future use
				contentDirectoryHandle = storedHandle
				return true
			} else {
				// Handle is invalid, clean up
				await cleanupRevokedPermissions()
				return false
			}
		} else {
			// Permission lost, clean up
			await cleanupRevokedPermissions()
			return false
		}
	} catch (error) {
		console.error('Error checking directory access:', error)
		return false
	}
}

// Reset directory access (for troubleshooting)
export async function resetDirectoryAccess() {
	try {
		contentDirectoryHandle = null
		
		// Clear from IndexedDB
		const request = indexedDB.open('llmcms-storage', 1)
		return new Promise((resolve) => {
			request.onsuccess = () => {
				const db = request.result
				if (db.objectStoreNames.contains('handles')) {
					const transaction = db.transaction(['handles'], 'readwrite')
					const store = transaction.objectStore('handles')
					store.delete(STORAGE_KEY)
					transaction.oncomplete = () => {
						console.log('✅ Directory access reset')
						resolve()
					}
				} else {
					resolve()
				}
			}
			request.onerror = () => resolve() // Fail silently
		})
	} catch (error) {
		console.error('Error resetting directory access:', error)
	}
} 