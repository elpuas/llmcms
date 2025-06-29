import { useRef, useEffect, useState } from 'react'
import '@toast-ui/editor/dist/toastui-editor.css'
import './MarkdownEditor.css'
import { loadContentFile, saveContentFile, parseMarkdown, generateMarkdown, getFileMetadata } from '../utils/contentManager.js'

export default function MarkdownEditor({ 
	initialContent = '',
	initialSlug = null,
	onContentChange,
	onFrontmatterChange 
}) {
	const editorRef = useRef(null)
	const containerRef = useRef(null)
	const [currentSlug, setCurrentSlug] = useState(initialSlug)
	const [frontmatter, setFrontmatter] = useState({})
	const [isLoading, setIsLoading] = useState(false)
	const [status, setStatus] = useState('')

	// Load file from content/ folder
	const loadFile = async (slug) => {
		setIsLoading(true)
		setStatus('📁 Loading file...')

		try {
			// Validate slug
			if (!slug || typeof slug !== 'string' || slug.trim() === '') {
				throw new Error('Invalid file slug')
			}

			const result = await loadContentFile(slug.trim())
			
			if (result.success) {
				// Ensure we have valid content
				const content = result.content || ''
				const frontmatterData = result.frontmatter || {}
				
				if (editorRef.current) {
					try {
						editorRef.current.setMarkdown(content)
					} catch (editorError) {
						console.error('Editor setMarkdown error:', editorError)
						// Try to set plain text if markdown parsing fails
						editorRef.current.setHTML(`<p>Error loading content: ${editorError.message}</p>`)
					}
				}
				
				setFrontmatter(frontmatterData)
				setCurrentSlug(slug)
				setStatus(`✅ Loaded ${slug}.md`)
				onContentChange?.(content)
				onFrontmatterChange?.(frontmatterData)
				setTimeout(() => setStatus(''), 3000)
			} else {
				const errorMsg = result.error || 'Unknown error'
				console.warn(`Failed to load ${slug}.md:`, errorMsg)
				setStatus(`❌ Failed to load ${slug}.md: ${errorMsg}`)
				setTimeout(() => setStatus(''), 5000)
			}
		} catch (error) {
			console.error('Load error:', error)
			setStatus(`❌ Load failed: ${error.message}`)
			setTimeout(() => setStatus(''), 5000)
		} finally {
			setIsLoading(false)
		}
	}

	// Save current file to content/ folder
	const saveCurrentFile = async () => {
		if (!editorRef.current || !currentSlug) {
			setStatus('❌ No file loaded to save')
			setTimeout(() => setStatus(''), 3000)
			return
		}

		setIsLoading(true)
		setStatus('💾 Saving...')

		try {
			// Validate editor and get content
			let content
			try {
				content = editorRef.current.getMarkdown() || ''
			} catch (editorError) {
				console.error('Error getting content from editor:', editorError)
				throw new Error('Failed to get content from editor')
			}

			// Validate content type
			if (typeof content !== 'string') {
				console.warn('Editor returned non-string content:', typeof content)
				content = String(content)
			}

			// Validate frontmatter
			const frontmatterToSave = frontmatter && typeof frontmatter === 'object' ? frontmatter : {}

			const result = await saveContentFile(currentSlug, content, frontmatterToSave)

			if (result.success) {
				setStatus(`✅ Document saved: ${result.fileName}`)
				setTimeout(() => setStatus(''), 5000)
			} else {
				const errorMsg = result.error || 'Unknown error'
				setStatus(`❌ Save failed: ${errorMsg}`)
				setTimeout(() => setStatus(''), 5000)
			}
		} catch (error) {
			console.error('Save error:', error)
			setStatus(`❌ Save failed: ${error.message}`)
			setTimeout(() => setStatus(''), 5000)
		} finally {
			setIsLoading(false)
		}
	}

	// Event handlers for custom events from Sidebar
	useEffect(() => {
		const handleLoadFile = (event) => {
			const fileToLoad = event.detail?.filename || event.detail?.slug
			if (fileToLoad) {
				loadFile(fileToLoad)
			}
		}

		const handleLoadContent = (event) => {
			// Handle direct content loading (for welcome file and other special cases)
			const { slug, content, isWelcomeFile } = event.detail || {}
			if (slug && content) {
				try {
					// Parse content if it has frontmatter
					let bodyContent = content
					let frontmatterData = {}
					
					if (content.includes('---')) {
						const parsed = parseMarkdown(content)
						bodyContent = parsed.content
						frontmatterData = parsed.frontmatter
					}
					
					// Set content in editor
					if (editorRef.current) {
						editorRef.current.setMarkdown(bodyContent)
					}
					
					// Update state
					setFrontmatter(frontmatterData)
					setCurrentSlug(slug)
					
					// Show status
					if (isWelcomeFile) {
						setStatus('✅ Welcome file loaded')
					} else {
						setStatus(`✅ Loaded ${slug}.md`)
					}
					
					onContentChange?.(bodyContent)
					onFrontmatterChange?.(frontmatterData)
					setTimeout(() => setStatus(''), 3000)
					
				} catch (error) {
					console.error('Error loading content:', error)
					setStatus(`❌ Failed to load content: ${error.message}`)
					setTimeout(() => setStatus(''), 5000)
				}
			}
		}

		const handleSaveCurrent = () => {
			saveCurrentFile()
		}

		const handleGetCurrentContent = () => {
			// This is a simplified approach - in a real app you'd use a proper event system
			if (editorRef.current && currentSlug) {
				const content = editorRef.current.getMarkdown()
				const markdownWithFrontmatter = generateMarkdown(content, frontmatter)
				
				// Dispatch response event with content, slug, and frontmatter
				const responseEvent = new CustomEvent('llmcms:current-content-response', {
					detail: { 
						content: markdownWithFrontmatter, 
						slug: currentSlug,
						frontmatter: frontmatter || {}
					}
				})
				window.dispatchEvent(responseEvent)
			} else {
				// Send error response if no content loaded
				const responseEvent = new CustomEvent('llmcms:current-content-response', {
					detail: { 
						error: 'No document loaded in editor' 
					}
				})
				window.dispatchEvent(responseEvent)
			}
		}

		// Add event listeners
		window.addEventListener('llmcms:load-file', handleLoadFile)
		window.addEventListener('llmcms:load-content', handleLoadContent)
		window.addEventListener('llmcms:save-current', handleSaveCurrent)
		window.addEventListener('llmcms:get-current-content', handleGetCurrentContent)

		// Cleanup
		return () => {
			window.removeEventListener('llmcms:load-file', handleLoadFile)
			window.removeEventListener('llmcms:load-content', handleLoadContent)
			window.removeEventListener('llmcms:save-current', handleSaveCurrent)
			window.removeEventListener('llmcms:get-current-content', handleGetCurrentContent)
		}
	}, [currentSlug, frontmatter])

	useEffect(() => {
		// Dynamic import to avoid SSR issues
		const initEditor = async () => {
			if (typeof window !== 'undefined' && containerRef.current) {
				const { Editor } = await import('@toast-ui/editor')
				
				// Parse initial content if it has frontmatter
				let content = initialContent
				let initialFrontmatter = {}
				
				if (initialContent && initialContent.includes('---')) {
					const parsed = parseMarkdown(initialContent)
					content = parsed.content
					initialFrontmatter = parsed.frontmatter
					setFrontmatter(initialFrontmatter)
				}
				
				const editor = new Editor({
					el: containerRef.current,
					height: '500px',
					initialEditType: 'wysiwyg',
					previewStyle: 'vertical',
					initialValue: content,
					hideModeSwitch: true,
					useCommandShortcut: true,
					toolbarItems: [
						['heading', 'bold', 'italic', 'strike'],
						['hr', 'quote'],
						['ul', 'ol', 'task', 'indent', 'outdent'],
						['table', 'image', 'link'],
						['code', 'codeblock']
					],
					events: {
						change: () => {
							const editorContent = editor.getMarkdown()
							onContentChange?.(editorContent)
						}
					},
					usageStatistics: false
				})

				editorRef.current = editor
			}
		}

		initEditor()

		return () => {
			if (editorRef.current) {
				editorRef.current.destroy()
			}
		}
	}, [initialContent, onContentChange])

	// Load initial file if slug is provided
	useEffect(() => {
		if (initialSlug && !initialContent) {
			loadFile(initialSlug)
		}
	}, [initialSlug])

	return (
		<div className="markdown-editor">
			<div className="editor-header">
				<div className="editor-title-section">
					<span className="editor-title">Markdown Editor</span>
					{currentSlug && (
						<span className="current-file">
							📄 {currentSlug}.md
						</span>
					)}
				</div>
				<div className="editor-status">
					<span className="status-indicator">●</span>
					<span>WYSIWYG Mode</span>
				</div>
			</div>
			
			{status && (
				<div className="status-notification">
					{status}
				</div>
			)}

			<div className="editor-content">
				<div className="toast-editor-container">
					<div ref={containerRef}></div>
				</div>
			</div>
		</div>
	)
}

 