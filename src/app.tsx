import { useMemo } from 'preact/hooks'
import { Album } from './components/Album'
import { Icons } from './components/Icons'
import { Library } from './components/Library'
import { LoginPopup } from './components/LoginPopup'
import { useAuth } from './hooks/useAuth'
import { useLibrary } from './hooks/useLibrary'
import { useSearchParam } from './hooks/useSearchParam'

export function App() {
	const { user } = useAuth()
	const { libraryId, library, changeLibraryId } = useLibrary()

	const [albumId, setAlbumId] = useSearchParam('album')
	const album = useMemo(() => {
		return library.albums?.find(a => a.id === albumId)
	}, [library, albumId])

	return <main class="p-6">
		<div class="mb-4 flex gap-2">
			<input class={`py-1 px-2 bg-gray-200 rounded-md ${library.albums === undefined ? 'outline focus:outline-2 outline-red-800' : ''}`} type="text" value={libraryId} onInput={e => changeLibraryId((e.target as HTMLInputElement).value)} list={user?.library_access !== undefined ? 'library_access_list' : undefined}/>
			{user?.library_access !== undefined && <datalist id="library_access_list">
				{user.library_access.map(id => <option>{id}</option>)}	
			</datalist>}
			<div class="mx-auto"></div>
			<LoginPopup />
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
