import { useMemo, useState } from 'preact/hooks'
import { Album } from './components/Album'
import { Icons } from './components/Icons'
import { Library } from './components/Library'
import { useLibrary } from './hooks/useLibrary'

export function App() {
	const { libraryId, library, secret, authorized, changeLibraryId, changeSecret } = useLibrary()
	const [albumId, setAlbumId] = useState<string>()
	const album = useMemo(() => {
		return library.albums?.find(a => a.id === albumId)
	}, [library, albumId])

	return <main class="p-6">
		<div class="mb-4 flex gap-2">
			<input class={`py-1 px-2 bg-gray-200 rounded-md ${library.albums === undefined ? 'outline focus:outline-2 outline-red-800' : ''}`} type="text" value={libraryId} onInput={e => changeLibraryId((e.target as HTMLInputElement).value)} />
			<input class={`py-1 px-2 bg-gray-200 rounded-md ${secret.length > 0 && !authorized ? 'outline focus:outline-2 outline-red-800' : ''}`} type="password" placeholder="Wachtwoord" value={secret} onInput={e => changeSecret((e.target as HTMLInputElement).value)} />
		</div>
		{library === undefined
			? <>Loading library...</>
			: album === undefined
				? <Library onSelect={setAlbumId} />
				: <>
					<button class="py-2 hover:underline flex items-center" onClick={() => setAlbumId(undefined)}>{Icons.arrow_left} Alle albums</button>
					<Album album={album} />
				</>}
	</main>
}
