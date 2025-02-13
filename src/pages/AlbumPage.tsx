import { route } from 'preact-router'
import { useEffect, useMemo } from 'preact/hooks'
import { ApiLibrary } from '../api'
import { Album } from '../components/Album'
import { useLibrary } from '../hooks/useLibrary'

type Props = {
	path: string,
}
export function AlbumPage(props: Props) {
	const { libraryId: targetLibraryId, albumId } = props as unknown as { libraryId: string, albumId: string }
	const { libraryId: currentLibraryId, library, changeLibraryId } = useLibrary()

	if (library?.type !== 'albums') {
		return <></>
	}

	useEffect(() => {
		if (targetLibraryId !== currentLibraryId) changeLibraryId(targetLibraryId)
	}, [targetLibraryId, currentLibraryId, changeLibraryId])
	if (library.id !== targetLibraryId || library.albums === undefined) return <>Loading library...</>

	const album = useMemo(() => {
		return library.albums?.find(a => a.id === albumId || a.slug === albumId)
	}, [library, albumId])
	useEffect(() => {
		if (album === undefined) route(`/${library.id}`)
	}, [album])
	if (album === undefined) return <></>

	return <Album library={library as ApiLibrary & { type: 'albums' }} album={album} />
}
