import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UserSession } from '../services/auth.service';
import { activityHeartbeat } from '../services/activityHeartbeat';

interface AuthState {
  user: UserSession | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const getInitialState = (): AuthState => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  let user: UserSession | null = null;
  
  if (userStr) {
    try {
      user = JSON.parse(userStr);
    } catch {
      // ignore
    }
  }

  return {
    user,
    token,
    isAuthenticated: !!token,
    loading: false,
    error: null,
  };
};

const authSlice = createSlice({
  name: 'auth',
  initialState: getInitialState(),
  reducers: {
    loginStart(state) {
      state.loading = true;
      state.error = null;
    },
    loginSuccess(state, action: PayloadAction<{ user: UserSession; token: string }>) {
      state.loading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.error = null;
      try {
        activityHeartbeat.start();
      } catch {
        // ignore
      }
    },
    loginFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.error = action.payload;
      try {
        activityHeartbeat.stop();
      } catch {
        // ignore
      }
    },
    logout(state) {
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.error = null;
      try {
        activityHeartbeat.stop();
      } catch {
        // ignore
      }
    },
    updateUser(state, action: PayloadAction<Partial<UserSession>>) {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        localStorage.setItem('user', JSON.stringify(state.user));
      }
    },
  },
});

export const { loginStart, loginSuccess, loginFailure, logout, updateUser } = authSlice.actions;
export default authSlice.reducer;
