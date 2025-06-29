import { useState } from 'react'
import './Sidebar.css'
import { createContentFile, generateMarkdown } from '../utils/contentManager.js'
import JSZip from 'jszip'

export default function Sidebar() {
	const [showNewDocumentModal, setShowNewDocumentModal] = useState(false)
	const [isCreating, setIsCreating] = useState(false)
	const [isExporting, setIsExporting] = useState(false)
	const [status, setStatus] = useState('')

	const handleNewDocument = () => {
		setShowNewDocumentModal(true)
	}

	const handleSaveCurrent = async () => {
		try {
			// Dispatch custom event to tell the editor to save
			const saveEvent = new CustomEvent('llmcms:save-current')
			window.dispatchEvent(saveEvent)
			
			setStatus('✅ Save requested')
			setTimeout(() => setStatus(''), 3000)
		} catch (error) {
			console.error('Save error:', error)
			setStatus('❌ Save failed')
			setTimeout(() => setStatus(''), 3000)
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
			
			// Generate initial content with the title
			const content = `# ${title}\n\nStart writing your content here...`
			
			// Create frontmatter
			const frontmatter = {
				title,
				slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
				date: new Date().toISOString().split('T')[0],
				...(author && { author })
			}

			const result = await createContentFile(content, { frontmatter })

			if (result.success) {
				setShowNewDocumentModal(false)
				setStatus(`✅ Created ${frontmatter.slug}.md`)
				
				// Tell the editor to load the new file
				const loadEvent = new CustomEvent('llmcms:load-file', {
					detail: { slug: frontmatter.slug }
				})
				window.dispatchEvent(loadEvent)
				
				setTimeout(() => setStatus(''), 3000)
			} else {
				setStatus('❌ Failed to create document')
				setTimeout(() => setStatus(''), 3000)
			}
		} catch (error) {
			console.error('Create document error:', error)
			setStatus('❌ Failed to create document')
			setTimeout(() => setStatus(''), 3000)
		} finally {
			setIsCreating(false)
		}
	}

	const handleFileSelect = (slug) => {
		// Tell the editor to load the file
		const loadEvent = new CustomEvent('llmcms:load-file', {
			detail: { slug }
		})
		window.dispatchEvent(loadEvent)
	}

	return (
		<div className="sidebar">
			{status && (
				<div className="sidebar-status">
					{status}
				</div>
			)}

			<h3>Content Files</h3>
			<ul className="file-list">
				<li>
					<button 
						className="file-link"
						onClick={() => handleFileSelect('welcome-to-llmcms')}
					>
						📄 Welcome to LLMCMS
					</button>
				</li>
			</ul>
			
			<h3>Quick Actions</h3>
			<ul className="action-list">
				<li>
					<button 
						className="action-button new-document"
						onClick={handleNewDocument}
						disabled={isCreating}
					>
						📝 New Document
					</button>
				</li>
				<li>
					<button 
						className="action-button save-current"
						onClick={handleSaveCurrent}
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
			// Auto-generate slug from title if slug is empty
			slug: prev.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
		}))
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
							onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
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