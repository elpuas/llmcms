import { useState, useEffect } from 'react'
import { isFileSystemAccessSupported, isDirectoryAccessConfigured } from '../utils/fileSystemManager.js'
import Onboarding from './Onboarding.jsx'
import './Onboarding.css'

export default function LLMCMSApp({ children }) {
	const [isSupported, setIsSupported] = useState(null)
	const [isConfigured, setIsConfigured] = useState(false)
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState(null)

	useEffect(() => {
		checkSystemStatus()
	}, [])

	const checkSystemStatus = async () => {
		try {
			setIsLoading(true)
			
			// Check browser support
			const supported = isFileSystemAccessSupported()
			setIsSupported(supported)
			
			if (supported) {
				// Check if directory access is already configured
				const configured = await isDirectoryAccessConfigured()
				setIsConfigured(configured)
			}
		} catch (error) {
			console.error('Error checking system status:', error)
			setError(error.message)
		} finally {
			setIsLoading(false)
		}
	}

	const handleDirectorySelected = async (directoryHandle) => {
		try {
			console.log('✅ Directory selected in app:', directoryHandle.name)
			setIsConfigured(true)
			
			// Trigger file list refresh for Sidebar
			window.dispatchEvent(new CustomEvent('llmcms:directory-configured'))
		} catch (error) {
			console.error('Error handling directory selection:', error)
			setError(error.message)
		}
	}

	const handleOnboardingError = (error) => {
		console.error('Onboarding error:', error)
		setError(error.message)
	}

	// Show loading state
	if (isLoading) {
		return (
			<div style={{ 
				display: 'flex', 
				alignItems: 'center', 
				justifyContent: 'center', 
				height: '100vh',
				fontSize: '1.2rem',
				color: '#64748b'
			}}>
				Loading LLMCMS...
			</div>
		)
	}

	// Show error state
	if (error) {
		return (
			<div style={{ 
				display: 'flex', 
				alignItems: 'center', 
				justifyContent: 'center', 
				height: '100vh',
				flexDirection: 'column',
				gap: '1rem',
				color: '#dc2626'
			}}>
				<h2>Error</h2>
				<p>{error}</p>
				<button 
					onClick={() => {
						setError(null)
						checkSystemStatus()
					}}
					style={{
						padding: '0.5rem 1rem',
						background: '#3b82f6',
						color: 'white',
						border: 'none',
						borderRadius: '4px',
						cursor: 'pointer'
					}}
				>
					Retry
				</button>
			</div>
		)
	}

	// Show onboarding if not supported or not configured
	if (!isSupported || !isConfigured) {
		return (
			<Onboarding 
				onDirectorySelected={handleDirectorySelected}
				onError={handleOnboardingError}
			/>
		)
	}

	// Show main app interface
	return children
} 