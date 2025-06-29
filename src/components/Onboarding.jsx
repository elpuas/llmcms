import { useState } from 'react'
import { isFileSystemAccessSupported, getContentDirectoryHandle } from '../utils/fileSystemManager.js'

export default function Onboarding({ onDirectorySelected, onError }) {
	const [isSelecting, setIsSelecting] = useState(false)
	const [error, setError] = useState(null)
	const [isSupported] = useState(isFileSystemAccessSupported())

	const handleSelectFolder = async () => {
		if (!isSupported) {
			setError('Your browser does not support the File System Access API. Please use Chrome or Edge.')
			return
		}

		setIsSelecting(true)
		setError(null)

		try {
			console.log('🎯 Starting folder selection flow...')
			const directoryHandle = await getContentDirectoryHandle()
			
			if (directoryHandle) {
				console.log(`✅ Directory selected: ${directoryHandle.name}`)
				onDirectorySelected?.(directoryHandle)
			} else {
				throw new Error('No directory was selected')
			}
		} catch (error) {
			console.error('❌ Folder selection failed:', error)
			
			let userMessage = 'Failed to select folder. Please try again.'
			
			if (error.name === 'AbortError') {
				userMessage = 'Folder selection was cancelled. Please try again to use LLMCMS.'
			} else if (error.name === 'NotAllowedError') {
				userMessage = 'Permission denied. Please allow access to your folder to continue.'
			} else if (error.message.includes('user gesture')) {
				userMessage = 'Please click the button to select your folder.'
			}
			
			setError(userMessage)
			onError?.(error)
		} finally {
			setIsSelecting(false)
		}
	}

	if (!isSupported) {
		return (
			<div className="onboarding unsupported">
				<div className="onboarding-content">
					<div className="icon">⚠️</div>
					<h2>Browser Not Supported</h2>
					<p>
						LLMCMS requires the File System Access API to work with your local files.
						This feature is currently only available in:
					</p>
					<ul>
						<li>✅ Google Chrome 86+</li>
						<li>✅ Microsoft Edge 86+</li>
						<li>✅ Other Chromium-based browsers</li>
					</ul>
					<p>
						<strong>❌ Not supported:</strong> Firefox, Safari
					</p>
					<div className="browser-recommendation">
						<p>Please switch to Chrome or Edge to use LLMCMS.</p>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className="onboarding">
			<div className="onboarding-content">
				<div className="icon">📁</div>
				<h2>Welcome to LLMCMS</h2>
				<p>
					To get started, please select your <strong>/content/</strong> folder. 
					This is where LLMCMS will create and save your Markdown files.
				</p>
				
				<div className="features">
					<div className="feature">
						<span className="feature-icon">💾</span>
						<span>Files saved directly to your local folder</span>
					</div>
					<div className="feature">
						<span className="feature-icon">🔒</span>
						<span>No uploads - everything stays on your device</span>
					</div>
					<div className="feature">
						<span className="feature-icon">⚡</span>
						<span>Real-time editing with instant preview</span>
					</div>
				</div>

				{error && (
					<div className="error-message">
						<span className="error-icon">❌</span>
						<span>{error}</span>
					</div>
				)}

				<button 
					className="select-folder-button"
					onClick={handleSelectFolder}
					disabled={isSelecting}
				>
					{isSelecting ? (
						<>
							<span className="loading-spinner">⏳</span>
							Selecting Folder...
						</>
					) : (
						<>
							<span className="folder-icon">📂</span>
							Select Content Folder
						</>
					)}
				</button>

				<div className="help-text">
					<p>
						<strong>Tip:</strong> You can create a new folder called "content" on your Desktop 
						or Documents folder, or use an existing folder where you want to store your Markdown files.
					</p>
				</div>
			</div>
		</div>
	)
} 