import { useCallback, useEffect, useState } from 'preact/hooks'
import { ApiUser } from '../api'
import { useAuth } from '../hooks/useAuth'
import { useLibrary } from '../hooks/useLibrary'
import { generatePassword } from '../utils'
import { EditableText } from './EditableText'
import { Icons } from './Icons'

export function AdminPanel() {
	const { api, user: admin } = useAuth()
	const { libraryId, changeLibraryId } = useLibrary()

	if (!admin?.admin_access) return <></>

	const [username, setUsername] = useState<string>()

	const selectLibrary = useCallback((id: string) => {
		changeLibraryId(id)
		setUsername(undefined)
		setNewLibrary(undefined)
		setNewUser(undefined)
	}, [setUsername, changeLibraryId])

	const selectUser = useCallback((username: string) => {
		setUsername(username)
		setNewLibrary(undefined)
		setNewUser(undefined)
	}, [setUsername])

	const [user, setUser] = useState<ApiUser>()
	useEffect(() => {
		if (username === undefined) return setUser(undefined)
		if (username === user?.username) return
		api.getUser(username)
			.then(u => setUser(u))
			.catch(() => setUser(undefined))
	}, [api, username, user])

	const onDeleteLibrary = useCallback(() => {
		if (!libraryId) return
		api.deleteLibrary(libraryId)
			.then(() => {
				setLibraries(libraries => libraries.filter(l => l !== libraryId))
			})
	}, [api, libraryId])

	const onChangeAdmin = useCallback((adminAccess: boolean) => {
		if (!username) return
		api.patchUser(username, { admin_access: adminAccess })
			.then(setUser)
	}, [api, username])

	const onDeleteUser = useCallback(() => {
		if (!username) return
		api.deleteUser(username)
			.then(() => {
				setUsername(admin.username)
				setUsers(users => users.filter(u => u !== username))
			})
	}, [api, admin, username, setUsername])

	const [libraries, setLibraries] = useState<string[]>([])
	const [users, setUsers] = useState<string[]>([])

	useEffect(() => {
		api.getLibraries()
			.then(setLibraries)
			.catch(() => setLibraries([]))
		api.getUsers()
			.then(setUsers)
			.catch(() => setUsers([]))
	}, [api])

	const [newLibrary, setNewLibrary] = useState<string>()
	const [newUser, setNewUser] = useState<string>()
	const [newPassword, setNewPassword] = useState<string>(generatePassword())
	const [newAdmin, setNewAdmin] = useState<boolean>(false)
	const [newUserLibraries, setNewUserLibraries] = useState<string[]>([])

	const selectNewLibrary = useCallback(() => {
		setNewLibrary('')
		setNewUser(undefined)
	}, [])

	const selectNewUser = useCallback(() => {
		setNewUser('')
		setNewLibrary(undefined)
		setNewPassword(generatePassword())
	}, [])

	const onAddLibrary = useCallback(() => {
		if (!newLibrary) return
		api.postLibrary(newLibrary)
			.then(l => {
				setNewLibrary(undefined)
				setLibraries(libraries => [...libraries, l.id])
			})
	}, [api, newLibrary])

	const toggleNewUserlibrary = useCallback((id: string) => {
		if (newUserLibraries.includes(id)) {
			setNewUserLibraries(newUserLibraries.filter(l => l !== id))
		} else {
			setNewUserLibraries([...newUserLibraries, id])
		}
	}, [newUserLibraries])

	const onAddUser = useCallback(() => {
		if (!newUser) return
		api.postUser(newUser, newPassword, newAdmin, newUserLibraries)
			.then(u => {
				setUsername(u.username)
				setNewUser(undefined)
				setUsers(users => [...users, u.username])
			})
	}, [api, newUser, newPassword, newAdmin, newUserLibraries, setUsername])

	return <div class="flex gap-3 justify-center">
		<div class="w-full max-w-lg">
			{newLibrary !== undefined ? <>
				<div class="text-gray-800 text-sm">Collectie ID</div>
				<EditableText key="new-library" class="font-bold text-2xl" value={newLibrary} onChange={setNewLibrary} editable autofocus />
				<button class="flex items-center whitespace-nowrap hover:underline gap-1 mt-3" onClick={onAddLibrary}>{Icons.plus}Aanmaken</button>
			</> : newUser !== undefined ? <>
				<div class="text-gray-800 text-sm">Gebruikersnaam</div>
				<EditableText key="new-user" class="font-bold text-2xl" value={newUser} onChange={setNewUser} editable autofocus />
				<div class="text-gray-800 text-sm mt-3">Wachtwoord</div>
				<EditableText key="new-password" class="text-lg" value={newPassword ?? generatePassword()} onChange={setNewPassword} editable />
				<div class="flex items-center gap-2 cursor-pointer mt-3" onClick={() => setNewAdmin(!newAdmin)}>
					<div class="text-gray-800 text-sm">Admin</div>
					<input class="cursor-pointer" type="checkbox" checked={newAdmin} />
				</div>
				{!newAdmin && <>
					<div class="text-gray-800 text-sm mt-3">Collecties</div>
					<ul class="pl-3">
						{libraries.map(id =>
							<li class="flex items-center gap-2 cursor-pointer" key={id} onClick={() => toggleNewUserlibrary(id)}>
								<input class="cursor-pointer" type="checkbox" checked={newUserLibraries.includes(id)} />
								<span>{id}</span>
							</li>
						)}
					</ul>
				</>}
				<button class="flex items-center whitespace-nowrap hover:underline gap-1 mt-3" onClick={onAddUser}>{Icons.plus}Aanmaken</button>
			</> : username !== undefined ? <>
				<h2 class="font-bold text-2xl">
				{username}
				</h2>
				{user && <>
					<div class="flex gap-4 mt-1">
						{admin.username === username ? <>
							<div class="flex items-center gap-1 whitespace-nowrap">
								{Icons.shield_check}
								<span>Admin</span>
							</div>
						</> : <>
							<button class="flex items-center gap-1 whitespace-nowrap hover:underline" onClick={() => onChangeAdmin(!user.admin_access)}>
								{user.admin_access ? Icons.shield_slash : Icons.shield_check}
								<span>{user.admin_access ? 'Verwijder admin' : 'Maak admin'}</span>
							</button>
							<button class="flex items-center gap-1 whitespace-nowrap hover:underline text-red-800 fill-red-800" onClick={onDeleteUser}>
								{Icons.trash}
								<span>Verwijder gebruiker</span>
							</button>
						</>}
					</div>
					<h3 class="flex items-center gap-1 font-bold text-lg mt-3">{Icons.repo} Collecties</h3>
					<ul class="pl-3">
						{user.library_access.map(id => <button class="block hover:underline" onClick={() => selectLibrary(id)}>
							<span>{id}</span>
						</button>)}
					</ul>
				</>}
			</> : <>
				<h2 class="font-bold text-2xl">
					{libraryId}
				</h2>
				<div class="flex gap-4 mt-1">
					<button class="flex items-center gap-1 whitespace-nowrap hover:underline text-red-800 fill-red-800" onClick={onDeleteLibrary}>
						{Icons.trash}
						<span>Verwijder collectie</span>
					</button>
				</div>
			</>}
		</div>
		<div class="border-l-2 py-1 px-2 w-50 shrink-0 h-full flex flex-col scroll">
			<h3 class="flex items-center gap-1 font-bold text-lg">{Icons.repo}Collecties</h3>
			<ul class="pl-3">
				{libraries.map(id =>
					<li key={id} class="hover:underline cursor-pointer" onClick={() => selectLibrary(id)}>{id}</li>
				)}
				<li class="flex items-center gap-1 hover:underline cursor-pointer" onClick={selectNewLibrary}>{Icons.plus} Nieuwe collectie</li>
			</ul>
			<h3 class="flex items-center gap-1 font-bold text-lg mt-3">{Icons.person}Gebruikers</h3>
			<ul class="pl-3">
				{users.map(id =>
					<li key={id} class="hover:underline cursor-pointer" onClick={() => selectUser(id)}>{id}</li>
				)}
				<li class="flex items-center gap-1 hover:underline cursor-pointer" onClick={selectNewUser}>{Icons.plus} Nieuwe gebruiker</li>
			</ul>
		</div>
	</div>
}
