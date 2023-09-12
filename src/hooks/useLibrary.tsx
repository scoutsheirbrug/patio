import { ComponentChildren, createContext } from 'preact'
import { useCallback, useContext, useEffect, useState } from 'preact/hooks'
import { ApiAlbum, ApiLibrary, getLibrary } from '../api'

const DEFAULT_LIBRARY_ID = 'scoutsheirbrug'

export type Secret = string

export type LibraryContext = {
	libraryId: string,
	library: Partial<ApiLibrary> & { id: string },
	secret: Secret,
	authorized: boolean,
	changeLibraryId: (id: string) => void,
	changeSecret: (secret: Partial<Secret>) => void,
	changeLibrary: (changes: Partial<ApiLibrary>) => void,
	changeAlbum: (id: string, changes: Partial<ApiAlbum>) => void,
	refresh: () => void,
}

export const LibraryContext = createContext<LibraryContext | undefined>(undefined)

export function useLibrary() {
	const context = useContext(LibraryContext)
	if (context === undefined) {
		throw new Error('Using library context outside of provider!')
	}
	return context
}

type Props = {
	children: ComponentChildren,
}
export function LibraryProvider({ children }: Props) {
	const [libraryId, setLibraryId] = useState<string>(localStorage.getItem('library_id') ?? DEFAULT_LIBRARY_ID)
	const [secret, setSecret] = useState<string>(localStorage.getItem('secret') ?? '')
	const [library, setLibrary] = useState<Partial<ApiLibrary> & { id: string }>({ id: libraryId })

	const changeLibraryId = useCallback((libraryId: string) => {
		localStorage.setItem('library_id', libraryId)
		setLibraryId(libraryId)
	}, [])

	const changeSecret = useCallback((secret: string) => {
		localStorage.setItem('secret', secret)
		setSecret(secret)
	}, [])

	useEffect(() => {
		getLibrary(libraryId, secret)
			.then(library => setLibrary(library))
			.catch(() => setLibrary({ id: libraryId }))
	}, [libraryId, secret])

	const changeLibrary = useCallback((changes: Partial<ApiLibrary>) => {
		if (library === undefined) return
		setLibrary({ ...library, ...changes })
	}, [library])

	const changeAlbum = useCallback((id: string, changes: Partial<ApiAlbum>) => {
		if (library === undefined) return
		changeLibrary({ albums: library.albums?.map(a => a.id === id ? { ...a, ...changes } : a) })
	}, [library])

	const refresh = useCallback(() => {
		getLibrary(libraryId, secret)
			.then(library => setLibrary(library))
			.catch(() => setLibrary({ id: libraryId }))
	}, [libraryId, secret])

	const authorized = library.authorized ?? false

	const value: LibraryContext = {
		libraryId,
		secret,
		library,
		authorized,
		changeLibraryId,
		changeSecret,
		changeLibrary,
		changeAlbum,
		refresh,
	}

	return <LibraryContext.Provider value={value}>
		{children}
	</LibraryContext.Provider>
}
