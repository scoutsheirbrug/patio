import { useEffect, useMemo } from 'preact/hooks'
import { ApiLibrary } from '../api'
import { Album } from '../components/Album'
import { useLibrary } from '../hooks/useLibrary'

type Props = {
	path: string,
}
export function AlbumPage(props: Props) {
	const { libraryId: targetLibraryId, albumId, photoId } = props as unknown as { libraryId: string, albumId: string, photoId?: string }
	const { libraryId: currentLibraryId, library, changeLibraryId } = useLibrary()

	useEffect(() => {
		if (targetLibraryId !== currentLibraryId) changeLibraryId(targetLibraryId)
	}, [targetLibraryId, currentLibraryId, changeLibraryId])
	if (library.id !== targetLibraryId || library.albums === undefined) return <></>

	const album = useMemo(() => {
		return library.albums?.find(a => a.id === albumId)
	}, [library, albumId])
	if (album === undefined) return <></>

	const photo = useMemo(() => {
		if (photoId === undefined) return undefined
		return album.photos.find(p => p.id === photoId)
	}, [album, photoId])

	return <Album library={library as ApiLibrary} album={album} photo={photo} />
}
