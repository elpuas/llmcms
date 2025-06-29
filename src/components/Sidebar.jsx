import { useState, useEffect } from 'react'
import './Sidebar.css'
import { createContentFile, generateMarkdown, saveContentFile } from '../utils/contentManager.js'
import { 
	isFileSystemAccessSupported, 
	listContentFiles, 
	isDirectoryAccessConfigured,
	writeContentFile,
	readContentFile,
	resetDirectoryAccess
} from '../utils/fileSystemManager.js'
import JSZip from 'jszip'

export default function Sidebar() {
	const [showNewDocumentModal, setShowNewDocumentModal] = useState(false)
	const [isCreating, setIsCreating] = useState(false)
	const [isExporting, setIsExporting] = useState(false)
	const [status, setStatus] = useState('')
	const [contentFiles, setContentFiles] = useState([])
	const [isFileSystemSupported, setIsFileSystemSupported] = useState(null)
	const [isLoadingFiles, setIsLoadingFiles] = useState(false)
	const [showBrowserWarning, setShowBrowserWarning] = useState(false)

	// Check browser support and load files on mount
	useEffect(() => {
		checkBrowserSupport()
		loadContentFiles()
		
		// Listen for directory configuration events
		const handleDirectoryConfigured = () => {
			console.log('🎯 Directory configured, refreshing file list...')
			loadContentFiles()
		}
		
		window.addEventListener('llmcms:directory-configured', handleDirectoryConfigured)
		
		return () => {
			window.removeEventListener('llmcms:directory-configured', handleDirectoryConfigured)
		}
	}, [])

	// Check if File System Access API is supported
	const checkBrowserSupport = async () => {
		try {
			const isSupported = isFileSystemAccessSupported()
			setIsFileSystemSupported(isSupported)
			setShowBrowserWarning(!isSupported)
		} catch (error) {
			console.error('Error checking browser support:', error)
			setIsFileSystemSupported(false)
			setShowBrowserWarning(true)
		}
	}

	// Load content files from directory (only if already configured)
	const loadContentFiles = async () => {
		if (isFileSystemSupported === false) return
		
		setIsLoadingFiles(true)
		try {
			// Only try to list files if directory access is already configured
			// This prevents triggering directory picker on page load
			const isConfigured = await isDirectoryAccessConfigured()
			if (isConfigured) {
				const result = await listContentFiles()
				if (result.success) {
					setContentFiles(result.files)
				}
			} else {
				// Clear any existing file list if no directory configured
				setContentFiles([])
			}
		} catch (error) {
			console.error('Error loading content files:', error)
			// Don't show error for this - it's expected if no directory is configured
			setContentFiles([])
		} finally {
			setIsLoadingFiles(false)
		}
	}

	// Refresh file list after operations
	const refreshFileList = async () => {
		if (isFileSystemSupported) {
			await loadContentFiles()
		}
	}

	const handleNewDocument = () => {
		setShowNewDocumentModal(true)
	}

	const handleSaveCurrent = async () => {
		setStatus('💾 Saving current document...')
		
		try {
			if (!isFileSystemAccessSupported()) {
				setStatus('❌ File System Access API not supported. Please use Chrome, Edge, or another Chromium-based browser.')
				setTimeout(() => setStatus(''), 8000)
				return
			}

			// Check if directory access is already configured
			const isConfigured = await isDirectoryAccessConfigured()
			if (!isConfigured) {
				setStatus('📁 Please select your /content/ directory in the next dialog...')
				// Give user time to read the message
				await new Promise(resolve => setTimeout(resolve, 1000))
			}

			// Get current content from editor
			const contentPromise = new Promise((resolve) => {
				const handleContentResponse = (event) => {
					window.removeEventListener('llmcms:current-content-response', handleContentResponse)
					resolve(event.detail)
				}
				window.addEventListener('llmcms:current-content-response', handleContentResponse)
				
				// Timeout after 5 seconds
				setTimeout(() => {
					window.removeEventListener('llmcms:current-content-response', handleContentResponse)
					resolve({ error: 'Timeout waiting for editor response' })
				}, 5000)
			})
			
			// Request current content
			window.dispatchEvent(new CustomEvent('llmcms:get-current-content'))
			const currentContent = await contentPromise

			if (currentContent.error) {
				setStatus(`❌ ${currentContent.error}`)
				setTimeout(() => setStatus(''), 5000)
				return
			}

			if (!currentContent.slug) {
				setStatus('❌ No document loaded in editor. Create a new document first.')
				setTimeout(() => setStatus(''), 5000)
				return
			}

			// Generate markdown content with frontmatter
			const markdownContent = generateMarkdown(currentContent.frontmatter, currentContent.content)
			
			// Save directly using File System Access API
			const result = await writeContentFile(currentContent.slug + '.md', markdownContent)

			if (result.success) {
				setStatus(`✅ Document saved: ${result.fileName}`)
				setTimeout(() => setStatus(''), 5000)
				// Refresh file list after successful save
				await refreshFileList()
			} else {
				setStatus(`❌ Failed to save: ${result.error}`)
				setTimeout(() => setStatus(''), 8000)
			}
		} catch (error) {
			console.error('Error in handleSaveCurrent:', error)
			setStatus(`❌ Error: ${error.message}`)
			setTimeout(() => setStatus(''), 6000)
		}
	}

	const handleExportSite = async () => {
		setIsExporting(true)
		setStatus('📦 Creating export...')

		try {
			const zip = new JSZip()
			const contentFolder = zip.folder('content')

			// Set up listener for current content response
			let currentContent = null
			const handleContentResponse = (event) => {
				if (event.detail?.content && event.detail?.slug) {
					currentContent = event.detail
				}
			}
			
			window.addEventListener('llmcms:current-content-response', handleContentResponse)

			// Request current editor content via custom event
			const exportEvent = new CustomEvent('llmcms:get-current-content')
			window.dispatchEvent(exportEvent)

			// Wait for response
			await new Promise(resolve => setTimeout(resolve, 200))
			
			// Clean up listener
			window.removeEventListener('llmcms:current-content-response', handleContentResponse)

			// Add current editor content to zip if available
			if (currentContent) {
				contentFolder.file(`${currentContent.slug}.md`, currentContent.content)
			}

			// Include the welcome file from the server
			try {
				const welcomeResponse = await fetch('/content/welcome-to-llmcms.md')
				if (welcomeResponse.ok) {
					const welcomeContent = await welcomeResponse.text()
					contentFolder.file('welcome-to-llmcms.md', welcomeContent)
				}
			} catch (error) {
				console.warn('Could not fetch welcome file for export:', error)
			}

			// Generate filename with timestamp
			const now = new Date()
			const timestamp = now.toISOString()
				.replace(/[-:]/g, '')
				.replace(/\..+/, '')
				.replace('T', '-')
				.slice(0, 13) // YYYYMMDD-HHMM
			
			const filename = `llmcms-export-${timestamp}.zip`

			// Generate ZIP and trigger download
			const zipBlob = await zip.generateAsync({ type: 'blob' })
			
			// Create download link
			const url = URL.createObjectURL(zipBlob)
			const link = document.createElement('a')
			link.href = url
			link.download = filename
			document.body.appendChild(link)
			link.click()
			document.body.removeChild(link)
			URL.revokeObjectURL(url)

			setStatus(`✅ Exported ${filename}`)
			setTimeout(() => setStatus(''), 5000)
		} catch (error) {
			console.error('Export error:', error)
			setStatus('❌ Export failed')
			setTimeout(() => setStatus(''), 3000)
		} finally {
			setIsExporting(false)
		}
	}

	const handleCreateDocument = async (formData) => {
		setIsCreating(true)
		setStatus('📝 Creating document...')

		try {
			const { title, slug, author } = formData
			
			// Validate required fields
			if (!title?.trim()) {
				setStatus('❌ Title is required')
				setTimeout(() => setStatus(''), 3000)
				return
			}

			if (!isFileSystemAccessSupported()) {
				setStatus('❌ File System Access API not supported. Please use Chrome, Edge, or another Chromium-based browser.')
				setTimeout(() => setStatus(''), 8000)
				return
			}

			// Check if directory access is already configured
			const isConfigured = await isDirectoryAccessConfigured()
			if (!isConfigured) {
				setStatus('📁 Please select your /content/ directory in the next dialog...')
				// Give user time to read the message
				await new Promise(resolve => setTimeout(resolve, 1000))
			}
			
			// Generate file slug from title if not provided
			const finalSlug = slug?.trim() || title.trim()
				.toLowerCase()
				.replace(/[^a-z0-9\s-]/g, '')
				.replace(/\s+/g, '-')
				.slice(0, 50)
			
			// Create frontmatter object
			const frontmatter = {
				title: title.trim(),
				date: new Date().toISOString().split('T')[0],
				slug: finalSlug,
				...(author?.trim() && { author: author.trim() })
			}
			
			// Generate initial content
			const content = `# ${title}\n\nStart writing your content here...`
			
			// Generate complete markdown with frontmatter
			const markdownContent = generateMarkdown(frontmatter, content)
			
			// Write the file directly using File System Access API
			const result = await writeContentFile(`${finalSlug}.md`, markdownContent)

			if (result.success) {
				setShowNewDocumentModal(false)
				
				// Show success message
				setStatus(`✅ Document created: ${result.fileName}`)
				
				// Refresh file list after successful creation
				await refreshFileList()
				
				// Load the new file in the editor
				setTimeout(() => {
					const loadEvent = new CustomEvent('llmcms:load-file', {
						detail: { filename: finalSlug }
					})
					window.dispatchEvent(loadEvent)
				}, 300)
				setTimeout(() => setStatus(''), 5000)
			} else {
				setStatus(`❌ Failed to create document: ${result.error}`)
				setTimeout(() => setStatus(''), 8000)
			}
		} catch (error) {
			console.error('Create document error:', error)
			setStatus(`❌ ${error.message || 'Failed to create document'}`)
			setTimeout(() => setStatus(''), 6000)
		} finally {
			setIsCreating(false)
		}
	}

	const handleFileSelect = async (slug) => {
		try {
			setStatus(`📖 Loading ${slug}...`)
			
			// Handle welcome file specially - it's served from the public directory
			if (slug === 'welcome-to-llmcms') {
				const response = await fetch('/content/welcome-to-llmcms.md')
				if (response.ok) {
					const content = await response.text()
					// Tell the editor to load the content directly
					const loadEvent = new CustomEvent('llmcms:load-content', {
						detail: { 
							slug: 'welcome-to-llmcms',
							content: content,
							isWelcomeFile: true
						}
					})
					window.dispatchEvent(loadEvent)
					setStatus('✅ Welcome file loaded')
					setTimeout(() => setStatus(''), 3000)
				} else {
					throw new Error(`Failed to fetch welcome file: ${response.status}`)
				}
			} else {
				// For user files, use File System Access API
				const isConfigured = await isDirectoryAccessConfigured()
				
				if (!isConfigured) {
					setStatus('📁 Directory access not configured. Please create a new document first.')
					setTimeout(() => setStatus(''), 5000)
					return
				}
				
				// Read the file directly using File System Access API
				const result = await readContentFile(`${slug}.md`)
				
				if (result.success) {
					// Parse the file content and send to editor
					const loadEvent = new CustomEvent('llmcms:load-content', {
						detail: { 
							slug: slug,
							content: result.content
						}
					})
					window.dispatchEvent(loadEvent)
					setStatus(`✅ ${slug} loaded`)
					setTimeout(() => setStatus(''), 3000)
				} else {
					throw new Error(result.error || 'Failed to read file')
				}
			}
		} catch (error) {
			console.error('Error loading file:', error)
			setStatus(`❌ Failed to load ${slug}: ${error.message}`)
			setTimeout(() => setStatus(''), 5000)
		}
	}

	const handleResetDirectory = async () => {
		try {
			setStatus('🔄 Resetting directory access...')
			await resetDirectoryAccess()
			setContentFiles([])
			setStatus('✅ Directory access reset. Select folder when creating new documents.')
			setTimeout(() => setStatus(''), 5000)
		} catch (error) {
			console.error('Error resetting directory access:', error)
			setStatus(`❌ Failed to reset directory access: ${error.message}`)
			setTimeout(() => setStatus(''), 5000)
		}
	}

	return (
		<div className="sidebar">
			{showBrowserWarning && (
				<div className="browser-warning">
					<h4>⚠️ Browser Not Supported</h4>
					<p>LLMCMS requires the File System Access API. Please use:</p>
					<ul>
						<li>✅ Chrome 86+</li>
						<li>✅ Edge 86+</li>
						<li>✅ Other Chromium browsers</li>
					</ul>
					<p>❌ Firefox and Safari are not supported.</p>
					<button 
						onClick={() => setShowBrowserWarning(false)}
						className="dismiss-warning"
					>
						Dismiss
					</button>
				</div>
			)}

			{status && (
				<div className="sidebar-status">
					{status}
				</div>
			)}

			<h3>Content Files</h3>
			{isLoadingFiles ? (
				<div className="loading-files">
					<span>📁 Loading files...</span>
				</div>
			) : (
				<ul className="file-list">
					{/* Always show welcome file first */}
					<li>
						<button 
							className="file-link"
							onClick={() => handleFileSelect('welcome-to-llmcms')}
						>
							📄 Welcome to LLMCMS
						</button>
					</li>
					
					{/* Show user files if any exist */}
					{contentFiles.length > 0 && (
						contentFiles.map((file) => (
							<li key={file.name}>
								<button 
									className="file-link"
									onClick={() => handleFileSelect(file.slug)}
								>
									📄 {file.name}
								</button>
							</li>
						))
					)}
					
					{/* Show helpful message if no user files */}
					{contentFiles.length === 0 && (
						<li className="no-files">
							{isFileSystemSupported === false ? (
								<span>Browser not supported - welcome file only</span>
							) : (
								<span>Create a new document to add more files</span>
							)}
						</li>
					)}
				</ul>
			)}
			
			<h3>Quick Actions</h3>
			<ul className="action-list">
				<li>
					<button 
						className="action-button new-document"
						onClick={handleNewDocument}
						disabled={isCreating || isFileSystemSupported === false}
					>
						📝 New Document
					</button>
				</li>
				<li>
					<button 
						className="action-button save-current"
						onClick={handleSaveCurrent}
						disabled={isFileSystemSupported === false}
					>
						💾 Save Current
					</button>
				</li>
				<li>
					<button 
						className="action-button export-site"
						onClick={handleExportSite}
						disabled={isExporting}
					>
						{isExporting ? '⏳' : '📦'} Export Site
					</button>
				</li>
				{isFileSystemSupported && (
					<li>
						<button 
							className="action-button reset-directory"
							onClick={handleResetDirectory}
							disabled={isExporting}
						>
							🔄 Reset Directory
						</button>
					</li>
				)}
			</ul>

			{showNewDocumentModal && (
				<NewDocumentModal
					onSubmit={handleCreateDocument}
					onCancel={() => setShowNewDocumentModal(false)}
					isCreating={isCreating}
				/>
			)}
		</div>
	)
}

function NewDocumentModal({ onSubmit, onCancel, isCreating }) {
	const [formData, setFormData] = useState({
		title: '',
		slug: '',
		author: ''
	})
	const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)

	const handleSubmit = (e) => {
		e.preventDefault()
		if (!formData.title.trim()) return
		onSubmit(formData)
	}

	const handleTitleChange = (e) => {
		const title = e.target.value
		setFormData(prev => ({
			...prev,
			title,
			// Auto-generate slug from title only if user hasn't manually edited it
			slug: slugManuallyEdited ? prev.slug : title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
		}))
	}

	const handleSlugChange = (e) => {
		const slug = e.target.value
		setFormData(prev => ({ ...prev, slug }))
		setSlugManuallyEdited(true)
	}

	return (
		<div className="modal-overlay">
			<div className="modal">
				<div className="modal-header">
					<h3>Create New Document</h3>
					<button 
						className="modal-close"
						onClick={onCancel}
						disabled={isCreating}
					>
						✕
					</button>
				</div>
				
				<form onSubmit={handleSubmit} className="modal-form">
					<div className="form-group">
						<label htmlFor="title">Title *</label>
						<input
							type="text"
							id="title"
							value={formData.title}
							onChange={handleTitleChange}
							placeholder="Enter document title"
							required
							disabled={isCreating}
							autoFocus
						/>
					</div>
					
					<div className="form-group">
						<label htmlFor="slug">Slug</label>
						<input
							type="text"
							id="slug"
							value={formData.slug}
							onChange={handleSlugChange}
							placeholder="auto-generated-from-title"
							disabled={isCreating}
						/>
						<small>Used for filename: {formData.slug || 'auto-generated'}.md</small>
					</div>
					
					<div className="form-group">
						<label htmlFor="author">Author</label>
						<input
							type="text"
							id="author"
							value={formData.author}
							onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
							placeholder="Optional author name"
							disabled={isCreating}
						/>
					</div>
					
					<div className="modal-actions">
						<button 
							type="button" 
							onClick={onCancel}
							disabled={isCreating}
							className="button-secondary"
						>
							Cancel
						</button>
						<button 
							type="submit"
							disabled={!formData.title.trim() || isCreating}
							className="button-primary"
						>
							{isCreating ? '⏳ Creating...' : '📝 Create Document'}
						</button>
					</div>
				</form>
			</div>
		</div>
	)
} 