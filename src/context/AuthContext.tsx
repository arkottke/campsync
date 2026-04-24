import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User } from '../types'
import { PocketBaseService } from '../services/pocketbase'

interface AuthContextType {
  isAuthenticated: boolean
  user: User | null
  isLoading: boolean
  login: (usernameOrEmail: string, password: string) => Promise<void>
  register: (password: string, passwordConfirm: string, name: string, email?: string) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (data: Partial<User>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is already authenticated
    if (PocketBaseService.isAuthenticated()) {
      const currentUser = PocketBaseService.getCurrentUser()
      setUser(currentUser)
    }
    setIsLoading(false)
  }, [])

  const login = async (usernameOrEmail: string, password: string) => {
    await PocketBaseService.login(usernameOrEmail, password)
    const currentUser = PocketBaseService.getCurrentUser()
    setUser(currentUser)
  }

  const register = async (
    password: string,
    passwordConfirm: string,
    name: string,
    email?: string
  ) => {
    await PocketBaseService.register(password, passwordConfirm, name, email)
    const username = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    await PocketBaseService.login(username, password)
    const currentUser = PocketBaseService.getCurrentUser()
    setUser(currentUser)
  }

  const logout = async () => {
    await PocketBaseService.logout()
    setUser(null)
  }

  const updateProfile = async (data: Partial<User>) => {
    if (!user) return
    setIsLoading(true)
    try {
      await PocketBaseService.updateProfile(user.id, data)
      const updatedUser = PocketBaseService.getCurrentUser()
      setUser(updatedUser)
    } finally {
      setIsLoading(false)
    }
  }

  const value: AuthContextType = {
    isAuthenticated: !!user,
    user,
    isLoading,
    login,
    register,
    logout,
    updateProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
