import { ComponentChildren, createContext } from 'preact'
import { useCallback, useContext, useEffect, useMemo, useState } from 'preact/hooks'
import { Api, ApiUser } from '../api'

type AuthContext = {
	user: (Partial<ApiUser > & { username: string }) | undefined,
	api: Api,
	login: (username: string, password: string) => Promise<boolean>,
	logout: () => void,
	isAuthorized: (libraryId: string) => boolean,
}

const AuthContext = createContext<AuthContext | undefined>(undefined)

export function useAuth() {
	const context = useContext(AuthContext)
	if (context === undefined) {
		throw new Error('Using auth context outside of provider!')
	}
	return context
}

function decodeToken(token: string | undefined): { username: string } | undefined {
	try {
		if (typeof token !== 'string') return undefined
		const base64 = token.split('.')[1]
		const payload = JSON.parse(atob(base64))
		if (typeof payload.exp !== 'number') return undefined
		const expires = new Date(payload.exp * 1000)
		if (new Date() > expires) return undefined
		if (typeof payload.username !== 'string') return undefined
		return { username: payload.username }
	} catch (e) {
		return undefined
	}
}

function verifyToken(token: string | undefined) {
	return decodeToken(token) ? token : undefined
}

type Props = {
	children: ComponentChildren,
}
export function AuthProvider({ children }: Props) {
	const [token, setToken] = useState<string | undefined>(verifyToken(localStorage.getItem('patio_token') ?? undefined))
	const [user, setUser] = useState<(Partial<ApiUser > & { username: string }) | undefined>(decodeToken(token))

	const api = useMemo(() => {
		return new Api(token)
	}, [token])

	useEffect(() => {
		if (api.hasToken && user && user.library_access === undefined) {
			api.getUser(user.username).then(user => {
				setUser(u => u?.username === user.username ? user : u)
			})
		}
	}, [user, api])

	const login = useCallback(async (username: string, password: string) => {
		try {
			const result = await api.login(username, password)
			localStorage.setItem('patio_token', result.token)
			setToken(result.token)
			setUser(result.user)
			return true
		} catch (e) {
			return false
		}
	}, [])

	const logout = useCallback(() => {
		localStorage.removeItem('patio_token')
		setToken(undefined)
		setUser(undefined)
	}, [])

	const authorized = useCallback((libraryId: string) => {
		if (user?.admin_access) return true
		if (user?.library_access?.includes(libraryId)) return true
		return false
	}, [user])

	const value: AuthContext = {
		user,
		api,
		login,
		logout,
		isAuthorized: authorized,
	}

	return <AuthContext.Provider value={value}>
		{children}
	</AuthContext.Provider>
}
