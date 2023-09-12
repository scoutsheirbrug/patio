import { render } from 'preact'
import { App } from './app.tsx'
import { LibraryProvider } from './hooks/useLibrary.tsx'
import './index.css'

render((
	<LibraryProvider>
		<App />
	</LibraryProvider>
), document.getElementById('app')!)
