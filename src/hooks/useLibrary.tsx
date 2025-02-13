import { ComponentChildren, createContext } from 'preact'
import { useCallback, useContext, useEffect, useState } from 'preact/hooks'
import { ApiAlbum, ApiLibrary } from '../api'
import { useAuth } from './useAuth'

export type LibraryContext = {
	libraries: string[]
	libraryId?: string,
	library?: Partial<ApiLibrary> & { id: string },
	authorized: boolean,
	changeLibraryId: (id: string | undefined) => void,
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
	const [libraryId, setLibraryId] = useState<string>()
	const [library, setLibrary] = useState<ApiLibrary>()

	const [libraries, setLibraries] = useState<string[]>([])
	useEffect(() => {
		api.getLibraries().then(l => {
			setLibraries(l)
		})
	}, [api])

	useEffect(() => {
		if (!libraryId) {
			setLibrary(undefined)
			return
		}
		api.getLibrary(libraryId)
			.then(library => setLibrary(library))
			.catch(() => setLibrary(undefined))
	}, [api, libraryId])

	const changeLibrary = useCallback((changes: Partial<ApiLibrary>) => {
		if (library === undefined) return
		setLibrary({ ...library, ...changes } as ApiLibrary)
	}, [library])

	const changeAlbum = useCallback((id: string, changes: Partial<ApiAlbum>) => {
		if (library === undefined) return
		if (library.type !== 'albums') {
			throw new TypeError('Library is not of type "albums"')
		}
		changeLibrary({ albums: library.albums?.map(a => a.id === id ? { ...a, ...changes } : a) })
	}, [library])

	const authorized = library?.authorized ?? false

	const value: LibraryContext = {
		libraries,
		libraryId,
		library,
		authorized,
		changeLibraryId: setLibraryId,
		changeLibrary,
		changeAlbum,
	}

	return <LibraryContext.Provider value={value}>
		{children}
	</LibraryContext.Provider>
}
