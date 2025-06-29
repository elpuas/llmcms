import { useRef, useEffect } from 'react'
import '@toast-ui/editor/dist/toastui-editor.css'
import './MarkdownEditor.css'

export default function MarkdownEditor({ 
	initialContent = '# Welcome to LLMCMS\n\nStart writing your content here...', 
	onContentChange 
}) {
	const editorRef = useRef(null)
	const containerRef = useRef(null)

	useEffect(() => {
		// Dynamic import to avoid SSR issues
		const initEditor = async () => {
			if (typeof window !== 'undefined' && containerRef.current) {
				const { Editor } = await import('@toast-ui/editor')
				
				const editor = new Editor({
					el: containerRef.current,
					height: '500px',
					initialEditType: 'wysiwyg',
					previewStyle: 'vertical',
					initialValue: initialContent,
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
							const content = editor.getMarkdown()
							onContentChange?.(content)
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

	return (
		<div className="markdown-editor">
			<div className="editor-header">
				<span className="editor-title">Markdown Editor</span>
				<div className="editor-status">
					<span className="status-indicator">●</span>
					<span>WYSIWYG Mode</span>
				</div>
			</div>
			<div className="editor-content">
				<div className="toast-editor-container">
					<div ref={containerRef}></div>
				</div>
			</div>
		</div>
	)
}

 