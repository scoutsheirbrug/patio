import Router from 'preact-router'
import { Header } from './components/Header'
import { AdminPage } from './pages/AdminPage'
import { AlbumPage } from './pages/AlbumPage'
import { HomePage } from './pages/HomePage'
import { LibraryPage } from './pages/LibraryPage'

export function App() {
	return <main class="p-6">
		<Header />
		<div class="mb-4" />
		<Router>
			<HomePage path="/" />
			<AdminPage path="/admin" />
			<LibraryPage path="/:libraryId" />
			<AlbumPage path="/:libraryId/:albumId" />
		</Router>
	</main>
}
