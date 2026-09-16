import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const storedToken = await AsyncStorage.getItem('token');
        if (storedToken) {
          setToken(storedToken);
          const { data } = await api.get('/auth/me');
          setUser(data.user);
        }
      } catch (err) {
        await AsyncStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Stores the JWT and flips the app over to the signed-in navigator.
  const applySession = useCallback(async (data) => {
    await AsyncStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  // Rejects with `err.requiresVerification = true` when the password was
  // correct but the email is still unverified — the Login screen uses that to
  // route to the OTP screen instead of showing a plain error.
  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    return applySession(data);
  }, [applySession]);

  // Does NOT sign in — the account is created unverified and a code is
  // emailed. Resolves with the email to verify.
  const register = useCallback(async (name, email, password) => {
    const { data } = await api.post('/auth/register', { name, email, password });
    return data.email || email;
  }, []);

  const verifyEmail = useCallback(async (email, code) => {
    const { data } = await api.post('/auth/verify-email', { email, code });
    return applySession(data);
  }, [applySession]);

  const resendCode = useCallback(async (email, purpose = 'verify') => {
    const { data } = await api.post('/auth/resend-code', { email, purpose });
    return data;
  }, []);

  const forgotPassword = useCallback(async (email) => {
    const { data } = await api.post('/auth/forgot-password', { email });
    return data;
  }, []);

  const resetPassword = useCallback(async (email, code, password) => {
    const { data } = await api.post('/auth/reset-password', { email, code, password });
    return applySession(data);
  }, [applySession]);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (updates) => {
    const isFormData = typeof FormData !== 'undefined' && updates instanceof FormData;
    const { data } = await api.put('/auth/me', updates, isFormData
      ? { headers: { 'Content-Type': 'multipart/form-data' } }
      : undefined);
    setUser(data.user);
    return data.user;
  }, []);

  const deleteAccount = useCallback(async (password) => {
    await api.delete('/auth/me', { data: { password } });
    await AsyncStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user, token, loading,
      login, register, logout, updateProfile, deleteAccount,
      verifyEmail, resendCode, forgotPassword, resetPassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);