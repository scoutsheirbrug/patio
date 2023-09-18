import { useMemo } from 'preact/hooks'
import { AdminPanel } from './components/AdminPanel'
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

	const [admin, setAdmin] = useSearchParam('admin')

	const [albumId, setAlbumId] = useSearchParam('album')
	const album = useMemo(() => {
		return library.albums?.find(a => a.id === albumId)
	}, [library, albumId])

	return <main class="p-6">
		<div class="mb-4 flex gap-4 flex-wrap">
			<div class="flex">
				<button class="flex items-center gap-1 hover:underline font-bold" onClick={() => setAdmin(undefined)}>
					{Icons.repo}
					<span>{libraryId}</span>
				</button>
				{user?.library_access && <div class="relative w-6 h-6">
					<select class="absolute w-full h-full outline-none cursor-pointer" onChange={e => changeLibraryId((e.target as HTMLSelectElement).value)}>
						{user.library_access.map(id => <option key={id}>{id}</option>)}	
					</select>
					<div class="absolute w-full h-full flex justify-center items-center pointer-events-none bg-white">{Icons.chevron_down}</div>
				</div>}
			</div>
			<div class="mx-auto"></div>
			{user?.admin_access && <button onClick={() => setAdmin(admin === 'true' ? undefined : 'true')}>{Icons.gear}</button>}
			<LoginPopup />
		</div>
		{admin === 'true' && user?.admin_access
			? <AdminPanel />
			: library === undefined
				? <>Loading library...</>
				: album === undefined
					? <Library onSelect={setAlbumId} />
					: <>
						<button class="py-2 hover:underline flex items-center" onClick={() => setAlbumId(undefined)}>{Icons.arrow_left} Alle albums</button>
						<Album album={album} />
					</>}
	</main>
}
