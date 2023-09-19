import { useCallback, useState } from 'preact/hooks'
import { useAuth } from '../hooks/useAuth'
import { Action } from './Action'
import { Icons } from './Icons'

type Props = {
	onClickProfile?: () => void,
}
export function LoginPopup({ onClickProfile }: Props) {
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

	return <>
		{user === undefined ? <div class="relative">
			<Action icon="person" onClick={() => setVisible(!visible)}>Inloggen</Action>
			{visible && <div class="absolute z-10 top-full right-0 mt-2 p-4 rounded-md bg-gray-200 shadow-md flex flex-col gap-2 items-center">
				<input class="py-1 px-2 rounded-md" type="text" name="username" placeholder="Gebruikersnaam" value={username} onInput={e => setUsername((e.target as HTMLInputElement).value)} />
				<input class="py-1 px-2 rounded-md" type="password" name="password" placeholder="Wachtwoord" value={password} onInput={e => setPassword((e.target as HTMLInputElement).value)} />
				<button class="flex items-center hover:underline" onClick={onLogin}>
					<span class="mr-1">Inloggen</span>
					{Icons.arrow_right}
				</button>
			</div>}
		</div> : <>
			<Action icon="person" onClick={onClickProfile} bold>{user.username}</Action>
			<Action icon="sign_out" onClick={logout}>Uitloggen</Action>
		</>}
	</>
}
