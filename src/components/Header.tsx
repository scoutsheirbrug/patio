import { useCallback, useEffect, useState } from 'preact/hooks'
import { useAuth } from '../hooks/useAuth'
import { useLibrary } from '../hooks/useLibrary'
import { Action } from './Action'
import { Actionbar } from './Actionbar'
import { Icons } from './Icons'

export function Header() {
	const { api, user, login, logout } = useAuth()
	const { libraryId } = useLibrary()

	const [librariesShown, setLibrariesShown] = useState(false) 
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

	const [loginShown, setLoginShown] = useState(false)
	const [username, setUsername] = useState('')
	const [password, setPassword] = useState('')

	const onLogin = useCallback(async () => {
		const success = await login(username, password)
		if (success) {
			setLoginShown(false)
			setUsername('')
			setPassword('')
		}
	}, [login, username, password])

	useEffect(() => {
		const onClick = () => {
			setLibrariesShown(false)
			setLoginShown(false)
		}
		window.addEventListener('click', onClick)
		return () => window.removeEventListener('click', onClick)
	}, [])

	return <Actionbar>
			<div class="relative flex gap-1">
				<Action icon="repo" link={`/${libraryId}`} bold>{libraryId}</Action>
				{libraries.length > 1 && <>
					<Action icon="chevron_down" onClick={() => setLibrariesShown(!librariesShown)} />
					{librariesShown && <div class="absolute z-20 top-full left-0 mt-2 p-4 rounded-md bg-gray-200 shadow-md flex flex-col gap-2 items-start">
						{libraries.map(id => <Action key={id} link={`/${id}`} bold={id === libraryId}>{id}</Action>)}
					</div>}
				</>}
			</div>
			<div class="mx-auto"></div>
			{user === undefined ? <div class="relative">
				<Action icon="person" onClick={() => setLoginShown(!loginShown)}>Inloggen</Action>
				{loginShown && <div class="absolute z-20 top-full right-0 mt-2 p-4 rounded-md bg-gray-200 shadow-md flex flex-col gap-2 items-center" onClick={e => e.stopPropagation()}>
					<input class="py-1 px-2 rounded-md" type="text" name="username" placeholder="Gebruikersnaam" value={username} onInput={e => setUsername((e.target as HTMLInputElement).value)} />
					<input class="py-1 px-2 rounded-md" type="password" name="password" placeholder="Wachtwoord" value={password} onInput={e => setPassword((e.target as HTMLInputElement).value)} />
					<button class="flex items-center hover:underline" onClick={onLogin}>
						<span class="mr-1">Inloggen</span>
						{Icons.arrow_right}
					</button>
				</div>}
			</div> : <>
				{user.admin_access && <Action icon="gear" link="/admin" />}
				<Action icon="person" bold>{user.username}</Action>
				<Action icon="sign_out" onClick={logout}>Uitloggen</Action>
			</>}
		</Actionbar>
}
