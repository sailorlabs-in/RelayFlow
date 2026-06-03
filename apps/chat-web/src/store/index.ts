import { configureStore } from '@reduxjs/toolkit';
import type { TypedUseSelectorHook } from 'react-redux';
import { useDispatch, useSelector } from 'react-redux';

import authReducer from './slices/authSlice';
import chatReducer from './slices/chatSlice';
import groupsReducer from './slices/groupsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    chat: chatReducer,
    groups: groupsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // Turn off serializable check for typeorm date structures
    }),
});

// TypeScript typing configurations
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Custom typed hooks
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
