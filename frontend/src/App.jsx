import { useCallback, useEffect, useMemo } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "./components/AppLayout.jsx";
import EventPage from "./pages/EventPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import LicensePage from "./pages/LicensePage.jsx";
import MemoirPage from "./pages/MemoirPage.jsx";
import PeoplePage from "./pages/PeoplePage.jsx";
import PersonPage from "./pages/PersonPage.jsx";
import PlacePage from "./pages/PlacePage.jsx";
import SpacePage from "./pages/SpacePage.jsx";
import TimelinePage from "./pages/TimelinePage.jsx";
import { authApi } from "./api/auth";
import { useAuthStore, useUIStore } from "./store";

// TanStack Query hooks
export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.getProfile,
    enabled: authApi.isAuthenticated(),
    retry: false,
  });

  return { user, isLoading, error, isAuthenticated: !!user };
}

export function useEvents(options = {}) {
  return useQuery({
    queryKey: ['events', options],
    queryFn: () => {
      const params = new URLSearchParams();
      if (options.year) params.append('year', options.year);
      if (options.stage) params.append('stage', options.stage);
      if (options.keyword) params.append('keyword', options.keyword);
      if (options.page) params.append('page', options.page);
      if (options.limit) params.append('limit', options.limit);
      return fetch(`/api/events?${params}`).then(r => r.json());
    },
    enabled: authApi.isAuthenticated(),
  });
}

export function useTimeline(options = {}) {
  return useQuery({
    queryKey: ['events', 'timeline', options],
    queryFn: () => {
      const params = new URLSearchParams();
      if (options.startYear) params.append('startYear', options.startYear);
      if (options.endYear) params.append('endYear', options.endYear);
      return fetch(`/api/events/timeline?${params}`).then(r => r.json());
    },
    enabled: authApi.isAuthenticated(),
  });
}

export function usePeople() {
  return useQuery({
    queryKey: ['people'],
    queryFn: () => fetch('/api/people').then(r => r.json()),
    enabled: authApi.isAuthenticated(),
  });
}

export function usePlaces() {
  return useQuery({
    queryKey: ['places'],
    queryFn: () => fetch('/api/places').then(r => r.json()),
    enabled: authApi.isAuthenticated(),
  });
}

export function useMemoirs() {
  return useQuery({
    queryKey: ['memoirs'],
    queryFn: () => fetch('/api/memoirs').then(r => r.json()),
    enabled: authApi.isAuthenticated(),
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      if (data.tokens) {
        localStorage.setItem('timex_access_token', data.tokens.accessToken);
        localStorage.setItem('timex_refresh_token', data.tokens.refreshToken);
      }
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useCallback(() => {
    authApi.logout();
    queryClient.clear();
  }, [queryClient]);
}

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const uiState = useUIStore();

  if (isLoading) {
    return <div className="loading-screen">加载中...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function App() {
  const { user, isAuthenticated } = useAuth();
  const { mutate: login } = useLogin();
  const logout = useLogout();
  const uiState = useUIStore();

  const handleLogin = useCallback((email, password) => {
    login({ email, password });
  }, [login]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to={isAuthenticated ? "/timeline" : "/login"} replace />} />

        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to="/timeline" replace />
            ) : (
              <LoginPage onLogin={handleLogin} />
            )
          }
        />

        <Route
          path="/timeline"
          element={
            <ProtectedRoute>
              <TimelinePage user={user} uiState={uiState} logout={logout} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/space"
          element={
            <ProtectedRoute>
              <SpacePage user={user} uiState={uiState} logout={logout} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/people"
          element={
            <ProtectedRoute>
              <PeoplePage user={user} uiState={uiState} logout={logout} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/memoir"
          element={
            <ProtectedRoute>
              <MemoirPage user={user} uiState={uiState} logout={logout} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/license"
          element={
            <ProtectedRoute>
              <LicensePage user={user} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/events/:eventId"
          element={
            <ProtectedRoute>
              <EventPage user={user} uiState={uiState} logout={logout} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/places/:placeId"
          element={
            <ProtectedRoute>
              <PlacePage user={user} uiState={uiState} logout={logout} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/people/:personId/detail"
          element={
            <ProtectedRoute>
              <PersonPage user={user} uiState={uiState} logout={logout} />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
