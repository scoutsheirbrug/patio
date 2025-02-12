import { useEffect } from 'preact/hooks'
import { ApiLibrary } from '../api'
import { Library } from '../components/Library'
import { useLibrary } from '../hooks/useLibrary'

type Props = {
	path: string,
}
export function LibraryPage(props: Props) {
	const { libraryId: targetLibraryId } = props as unknown as { libraryId: string }
	const { libraryId: currentLibraryId, library, changeLibraryId } = useLibrary()

	useEffect(() => {
		if (targetLibraryId !== currentLibraryId) changeLibraryId(targetLibraryId)
	}, [targetLibraryId, currentLibraryId, changeLibraryId])
	if (library.id !== targetLibraryId || library.type === undefined) return <>Loading library...</>

	return <Library library={library as ApiLibrary} />
}
