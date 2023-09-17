import { ComponentChildren, createContext } from 'preact'
import { useCallback, useContext, useEffect, useMemo, useState } from 'preact/hooks'
import { ApiAlbum, ApiLibrary } from '../api'
import { useAuth } from './useAuth'
import { useSearchParam } from './useSearchParam'

const DEFAULT_LIBRARY_ID = 'scoutsheirbrug'

export type LibraryContext = {
	libraryId: string,
	library: Partial<ApiLibrary> & { id: string },
	authorized: boolean,
	changeLibraryId: (id: string) => void,
	changeLibrary: (changes: Partial<ApiLibrary>) => void,
	changeAlbum: (id: string, changes: Partial<ApiAlbum>) => void,
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
	const { api } = useAuth()
	const [urlLibraryId, setLibraryId] = useSearchParam('library')
	const libraryId = useMemo(() => {
		return urlLibraryId ?? localStorage.getItem('library_id') ?? DEFAULT_LIBRARY_ID
	}, [urlLibraryId])
	useEffect(() => {
		if (urlLibraryId !== libraryId) setLibraryId(libraryId)
	}, [urlLibraryId, libraryId])

	const [library, setLibrary] = useState<Partial<ApiLibrary> & { id: string }>({ id: libraryId })

	const changeLibraryId = useCallback((libraryId: string) => {
		localStorage.setItem('library_id', libraryId)
		setLibraryId(libraryId)
	}, [])

	useEffect(() => {
		api.getLibrary(libraryId)
			.then(library => setLibrary(library))
			.catch(() => setLibrary({ id: libraryId }))
	}, [api, libraryId])

	const changeLibrary = useCallback((changes: Partial<ApiLibrary>) => {
		if (library === undefined) return
		setLibrary({ ...library, ...changes })
	}, [library])

	const changeAlbum = useCallback((id: string, changes: Partial<ApiAlbum>) => {
		if (library === undefined) return
		changeLibrary({ albums: library.albums?.map(a => a.id === id ? { ...a, ...changes } : a) })
	}, [library])

	const authorized = library.authorized ?? false

	const value: LibraryContext = {
		libraryId,
		library,
		authorized,
		changeLibraryId,
		changeLibrary,
		changeAlbum,
	}

	return <LibraryContext.Provider value={value}>
		{children}
	</LibraryContext.Provider>
}
