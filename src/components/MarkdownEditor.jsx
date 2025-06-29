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
		setStatus('')

		try {
			const result = await loadContentFile(slug)
			
			if (result.success && editorRef.current) {
				editorRef.current.setMarkdown(result.content)
				setFrontmatter(result.frontmatter)
				setCurrentSlug(slug)
				setStatus(`✅ Loaded ${slug}.md`)
				onContentChange?.(result.content)
				onFrontmatterChange?.(result.frontmatter)
				setTimeout(() => setStatus(''), 3000)
			} else {
				setStatus(`❌ Failed to load ${slug}.md`)
				setTimeout(() => setStatus(''), 3000)
			}
		} catch (error) {
			console.error('Load error:', error)
			setStatus('❌ Load failed')
			setTimeout(() => setStatus(''), 3000)
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
		setStatus('')

		try {
			const content = editorRef.current.getMarkdown()
			const result = await saveContentFile(currentSlug, content, frontmatter)

			if (result.success) {
				setStatus(`✅ Saved ${currentSlug}.md`)
				setTimeout(() => setStatus(''), 3000)
			} else {
				setStatus('❌ Save failed')
				setTimeout(() => setStatus(''), 3000)
			}
		} catch (error) {
			console.error('Save error:', error)
			setStatus('❌ Save failed')
			setTimeout(() => setStatus(''), 3000)
		} finally {
			setIsLoading(false)
		}
	}

	// Event handlers for custom events from Sidebar
	useEffect(() => {
		const handleLoadFile = (event) => {
			if (event.detail?.slug) {
				loadFile(event.detail.slug)
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
				
				// Dispatch response event (you'd handle this in the Sidebar)
				const responseEvent = new CustomEvent('llmcms:current-content-response', {
					detail: { 
						content: markdownWithFrontmatter, 
						slug: currentSlug 
					}
				})
				window.dispatchEvent(responseEvent)
			}
		}

		// Add event listeners
		window.addEventListener('llmcms:load-file', handleLoadFile)
		window.addEventListener('llmcms:save-current', handleSaveCurrent)
		window.addEventListener('llmcms:get-current-content', handleGetCurrentContent)

		// Cleanup
		return () => {
			window.removeEventListener('llmcms:load-file', handleLoadFile)
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

 