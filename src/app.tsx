import Router, { route } from 'preact-router'
import { useEffect, useState } from 'preact/hooks'
import { Action } from './components/Action'
import { Actionbar } from './components/Actionbar'
import { Icons } from './components/Icons'
import { LoginPopup } from './components/LoginPopup'
import { useAuth } from './hooks/useAuth'
import { useLibrary } from './hooks/useLibrary'
import { AdminPage } from './pages/AdminPage'
import { AlbumPage } from './pages/AlbumPage'
import { HomePage } from './pages/HomePage'
import { LibraryPage } from './pages/LibraryPage'

export function App() {
	const { api, user } = useAuth()
	const { libraryId } = useLibrary()

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
				<Action icon="repo" link={`/${libraryId}`} bold>{libraryId}</Action>
				{libraries.length > 1 && <div class="relative w-6 h-6">
					<select class="absolute w-full h-full outline-none cursor-pointer" value={libraryId} onChange={e => route(`/${(e.target as HTMLSelectElement).value}`)}>
						{libraries.map(id => <option key={id}>{id}</option>)}	
					</select>
					<div class="absolute w-full h-full flex justify-center items-center pointer-events-none bg-white">{Icons.chevron_down}</div>
				</div>}
			</div>
			<div class="mx-auto"></div>
			{user?.admin_access && <button onClick={() => route('/admin')}>{Icons.gear}</button>}
			<LoginPopup />
		</Actionbar>
		<div class="mb-4" />
		<Router>
			<HomePage path="/" />
			<AdminPage path="/admin" />
			<LibraryPage path="/:libraryId" />
			<AlbumPage path="/:libraryId/:albumId/:photoId?" />
		</Router>
	</main>
}
