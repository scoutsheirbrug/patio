import { useCallback, useState } from 'preact/hooks'
import { useAuth } from '../hooks/useAuth'
import { Icons } from './Icons'

export function LoginPopup() {
	const { user, login, logout } = useAuth()

	const [visible, setVisible] = useState(false)

	const [username, setUsername] = useState('')
	const [password, setPassword] = useState('')

	const onLogin = useCallback(async () => {
		const success = await login(username, password)
		if (success) {
			setVisible(false)
			setUsername('')
			setPassword('')
		}
	}, [login, username, password])

	return <div class="relative flex gap-2">
		{user === undefined ? <>
			<button class="flex items-center hover:underline" onClick={() => setVisible(!visible)}>
				{Icons.person}
				<span class="ml-1">Inloggen</span>
			</button>
		</> : <>
			<span class="flex items-center mr-2">
				{Icons.person}
				<span class="ml-1 font-bold">{user.username}</span>
			</span>
			<button class="flex items-center hover:underline" onClick={logout}>
				{Icons.sign_out}
				<span class="ml-1">Uitloggen</span>
			</button>
		</>}
		{user === undefined && visible && <div class="absolute z-10 top-full right-0 mt-2 p-4 rounded-md bg-gray-200 shadow-md flex flex-col gap-2 items-center">
			<input class="py-1 px-2 rounded-md" type="text" name="username" placeholder="Gebruikersnaam" value={username} onInput={e => setUsername((e.target as HTMLInputElement).value)} />
			<input class="py-1 px-2 rounded-md" type="password" name="password" placeholder="Wachtwoord" value={password} onInput={e => setPassword((e.target as HTMLInputElement).value)} />
			<button class="flex items-center hover:underline" onClick={onLogin}>
				<span class="mr-1">Inloggen</span>
				{Icons.arrow_right}
			</button>
		</div>}
	</div>
}
