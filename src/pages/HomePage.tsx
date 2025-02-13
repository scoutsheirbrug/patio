import { useEffect } from 'preact/hooks'
import { Action } from '../components/Action'
import { useLibrary } from '../hooks/useLibrary'

type Props = {
	path: string
}
export function HomePage({}: Props) {
	const { libraries, changeLibraryId } = useLibrary()

	useEffect(() => {
		changeLibraryId(undefined)
	}, [changeLibraryId])

	return <div>
		{libraries.map(l => <Action icon="repo" link={`/${l}`}>{l}</Action>)}
	</div>
}
