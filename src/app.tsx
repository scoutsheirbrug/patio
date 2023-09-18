import { useEffect, useMemo, useState } from 'preact/hooks'
import { AdminPanel } from './components/AdminPanel'
import { Album } from './components/Album'
import { Icons } from './components/Icons'
import { Library } from './components/Library'
import { LoginPopup } from './components/LoginPopup'
import { useAuth } from './hooks/useAuth'
import { useLibrary } from './hooks/useLibrary'
import { useSearchParam } from './hooks/useSearchParam'

export function App() {
	const { api, user } = useAuth()
	const { libraryId, library, changeLibraryId } = useLibrary()

	const [admin, setAdmin] = useSearchParam('admin')

	const [albumId, setAlbumId] = useSearchParam('album')
	const album = useMemo(() => {
		return library.albums?.find(a => a.id === albumId)
	}, [library, albumId])

	const [libraries, setLibraries] = useState<string[]>([])
	useEffect(() => {
		if (user?.library_access?.includes(libraryId)) {
			setLibraries(user.library_access)
		} else {
			setLibraries([libraryId, ...user?.library_access ?? []])
		}
		if (user?.admin_access) {
			api.getLibraries().then(l => {
				setLibraries(l)
			})
		}
	}, [api, user, libraryId])

	return <main class="p-6">
		<div class="mb-4 flex flex-wrap gap-4">
			<div class="flex">
				<button class="flex items-center gap-1 hover:underline font-bold" onClick={() => setAdmin(undefined)}>
					{Icons.repo}
					<span>{libraryId}</span>
				</button>
				{libraries.length > 1 && <div class="relative w-6 h-6">
					<select class="absolute w-full h-full outline-none cursor-pointer" onChange={e => changeLibraryId((e.target as HTMLSelectElement).value)}>
						{libraries.map(id => <option key={id}>{id}</option>)}	
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
