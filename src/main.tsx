import { render } from 'preact'
import { App } from './app.tsx'
import { AuthProvider } from './hooks/useAuth.tsx'
import { LibraryProvider } from './hooks/useLibrary.tsx'
import './index.css'

render((
	<AuthProvider>
		<LibraryProvider>
			<App />
		</LibraryProvider>
	</AuthProvider>
), document.getElementById('app')!)
