// IndexedDB utility for persisting DirectoryHandle objects
// Handles storage, retrieval, and cleanup of file system handles

const DB_NAME = 'llmcms-storage'
const DB_VERSION = 1
const STORE_NAME = 'handles'
const DIRECTORY_HANDLE_KEY = 'content-directory-handle'

// Initialize IndexedDB database
async function initializeDB() {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION)
		
		request.onerror = () => {
			console.error('Failed to open IndexedDB:', request.error)
			reject(request.error)
		}
		
		request.onsuccess = () => {
			resolve(request.result)
		}
		
		request.onupgradeneeded = (event) => {
			const db = event.target.result
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME)
			}
		}
	})
}

// Store DirectoryHandle in IndexedDB
export async function storeDirectoryHandle(directoryHandle) {
	try {
		if (!directoryHandle || directoryHandle.kind !== 'directory') {
			throw new Error('Invalid directory handle provided')
		}

		const db = await initializeDB()
		const transaction = db.transaction([STORE_NAME], 'readwrite')
		const store = transaction.objectStore(STORE_NAME)
		
		return new Promise((resolve, reject) => {
			const request = store.put(directoryHandle, DIRECTORY_HANDLE_KEY)
			
			request.onsuccess = () => {
				console.log('✅ Directory handle stored successfully')
				resolve()
			}
			
			request.onerror = () => {
				console.error('Failed to store directory handle:', request.error)
				reject(request.error)
			}
			
			transaction.oncomplete = () => {
				db.close()
			}
		})
	} catch (error) {
		console.error('Error storing directory handle:', error)
		throw new Error(`Failed to store directory handle: ${error.message}`)
	}
}

// Retrieve DirectoryHandle from IndexedDB
export async function getStoredDirectoryHandle() {
	try {
		const db = await initializeDB()
		
		// Check if store exists
		if (!db.objectStoreNames.contains(STORE_NAME)) {
			db.close()
			return null
		}
		
		const transaction = db.transaction([STORE_NAME], 'readonly')
		const store = transaction.objectStore(STORE_NAME)
		
		return new Promise((resolve, reject) => {
			const request = store.get(DIRECTORY_HANDLE_KEY)
			
			request.onsuccess = () => {
				const handle = request.result
				if (handle && handle.kind === 'directory') {
					console.log('✅ Directory handle retrieved successfully')
					resolve(handle)
				} else {
					console.log('No valid directory handle found in storage')
					resolve(null)
				}
			}
			
			request.onerror = () => {
				console.error('Failed to retrieve directory handle:', request.error)
				reject(request.error)
			}
			
			transaction.oncomplete = () => {
				db.close()
			}
		})
	} catch (error) {
		console.error('Error retrieving directory handle:', error)
		return null
	}
}

// Clear stored DirectoryHandle from IndexedDB
export async function clearStoredDirectoryHandle() {
	try {
		const db = await initializeDB()
		
		if (!db.objectStoreNames.contains(STORE_NAME)) {
			db.close()
			return
		}
		
		const transaction = db.transaction([STORE_NAME], 'readwrite')
		const store = transaction.objectStore(STORE_NAME)
		
		return new Promise((resolve, reject) => {
			const request = store.delete(DIRECTORY_HANDLE_KEY)
			
			request.onsuccess = () => {
				console.log('🧹 Directory handle cleared from storage')
				resolve()
			}
			
			request.onerror = () => {
				console.error('Failed to clear directory handle:', request.error)
				reject(request.error)
			}
			
			transaction.oncomplete = () => {
				db.close()
			}
		})
	} catch (error) {
		console.error('Error clearing directory handle:', error)
		throw new Error(`Failed to clear directory handle: ${error.message}`)
	}
}

// Check if DirectoryHandle exists in storage
export async function hasStoredDirectoryHandle() {
	try {
		const handle = await getStoredDirectoryHandle()
		return handle !== null
	} catch (error) {
		console.error('Error checking stored directory handle:', error)
		return false
	}
}

// Clear all LLMCMS data from IndexedDB (for reset functionality)
export async function clearAllData() {
	try {
		const db = await initializeDB()
		
		if (!db.objectStoreNames.contains(STORE_NAME)) {
			db.close()
			return
		}
		
		const transaction = db.transaction([STORE_NAME], 'readwrite')
		const store = transaction.objectStore(STORE_NAME)
		
		return new Promise((resolve, reject) => {
			const request = store.clear()
			
			request.onsuccess = () => {
				console.log('🧹 All LLMCMS data cleared from IndexedDB')
				resolve()
			}
			
			request.onerror = () => {
				console.error('Failed to clear all data:', request.error)
				reject(request.error)
			}
			
			transaction.oncomplete = () => {
				db.close()
			}
		})
	} catch (error) {
		console.error('Error clearing all data:', error)
		throw new Error(`Failed to clear all data: ${error.message}`)
	}
}

// Get storage information for debugging
export async function getStorageInfo() {
	try {
		const hasHandle = await hasStoredDirectoryHandle()
		const handle = hasHandle ? await getStoredDirectoryHandle() : null
		
		return {
			hasDirectoryHandle: hasHandle,
			directoryName: handle?.name || null,
			dbName: DB_NAME,
			storeName: STORE_NAME
		}
	} catch (error) {
		console.error('Error getting storage info:', error)
		return {
			hasDirectoryHandle: false,
			directoryName: null,
			error: error.message
		}
	}
} 