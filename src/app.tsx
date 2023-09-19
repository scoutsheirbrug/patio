import { useEffect, useMemo, useState } from 'preact/hooks'
import { Action } from './components/Action'
import { Actionbar } from './components/Actionbar'
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
		<Actionbar>
			<div class="flex">
				<Action icon="repo" onClick={() => setAdmin(undefined)} bold>{libraryId}</Action>
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
		</Actionbar>
		<div class="mb-4" />
		{admin === 'true' && user?.admin_access
			? <AdminPanel />
			: library === undefined
				? <>Loading library...</>
				: album === undefined
					? <Library onSelect={setAlbumId} />
					: <>
						<Action icon="arrow_left" onClick={() => setAlbumId(undefined)}>Alle albums</Action>
						<Album album={album} />
					</>}
	</main>
}
