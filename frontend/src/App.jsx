import { useCallback, useEffect, useMemo, useState } from "react";
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
import { eventsApi } from "./api/events";
import { peopleApi } from "./api/people";
import { placesApi } from "./api/places";
import { memoirsApi } from "./api/memoirs";
import { useAuthStore, useUIStore } from "./store";
import { createApiAdapter } from "./data/apiAdapter.js";

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
    queryFn: () => eventsApi.getAll(options),
    enabled: authApi.isAuthenticated(),
  });
}

export function useTimeline(options = {}) {
  return useQuery({
    queryKey: ['events', 'timeline', options],
    queryFn: () => eventsApi.getTimeline(options),
    enabled: authApi.isAuthenticated(),
  });
}

export function usePeople(options = {}) {
  return useQuery({
    queryKey: ['people', options],
    queryFn: () => peopleApi.getAll(options),
    enabled: authApi.isAuthenticated(),
  });
}

export function usePlaces(options = {}) {
  return useQuery({
    queryKey: ['places', options],
    queryFn: () => placesApi.getAll(options),
    enabled: authApi.isAuthenticated(),
  });
}

export function useMemoirs(options = {}) {
  return useQuery({
    queryKey: ['memoirs', options],
    queryFn: () => memoirsApi.getAll(options),
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

  if (isLoading) {
    return <div className="loading-screen">加载中...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Inner app component that has access to data
function AppContent({ user }) {
  const logout = useLogout();
  const uiState = useUIStore();

  // Fetch all data
  const { data: eventsData } = useEvents();
  const { data: peopleData } = usePeople();
  const { data: placesData } = usePlaces();
  const { data: memoirsData } = useMemoirs();

  const events = eventsData?.events || [];
  const people = peopleData?.people || [];
  const places = placesData?.places || [];
  const memoirs = memoirsData?.memoirs || [];

  // Create API adapter with real data
  const api = useMemo(
    () => createApiAdapter({ events, people, places, memoirs }),
    [events, people, places, memoirs]
  );

  // Get years from events
  const years = useMemo(() => api.getYears(events), [events, api]);

  // Filter events based on uiState
  const filteredEvents = useMemo(
    () => api.filterEvents(events, uiState),
    [events, uiState, api]
  );

  // Get selected event
  const selectedEvent = useMemo(
    () => api.getSelectedEvent(uiState.selectedEventId, filteredEvents),
    [uiState.selectedEventId, filteredEvents, api]
  );

  // Get selected place and person
  const selectedPlace = useMemo(
    () => selectedEvent?.placeId ? api.getPlace(selectedEvent.placeId) : places[0],
    [selectedEvent, api, places]
  );

  const selectedPerson = useMemo(
    () => {
      const personId = uiState.selectedPersonId;
      if (personId) {
        return api.getPerson(personId) || people[0];
      }
      return people[0];
    },
    [uiState.selectedPersonId, api, people]
  );

  // Session info from user or default
  const session = useMemo(() => ({
    name: user?.nickname || user?.email?.split('@')[0] || '用户',
    role: '时光机器用户',
    tone: 'navy',
  }), [user]);

  // Detail links
  const detailLinks = useMemo(() => ({
    event: selectedEvent ? `/events/${selectedEvent.id}` : '/events/e1',
    place: selectedPlace ? `/places/${selectedPlace.id}` : '/places/p1',
    person: selectedPerson ? `/people/${selectedPerson?.id}/detail` : '/people/p1/detail',
  }), [selectedEvent, selectedPlace, selectedPerson]);

  // Page notice
  const pageNotice = "数据来自真实 API，使用筛选器探索记忆";

  const handleUiStateChange = useCallback((updates) => {
    uiState.setCurrentPage(uiState.currentPage);
    if (updates.year !== undefined || updates.stage !== undefined || updates.search !== undefined) {
      useUIStore.setState(updates);
    } else {
      useUIStore.setState(updates);
    }
  }, [uiState]);

  // Layout props builder
  const makeLayoutProps = useCallback((rightRail = null) => ({
    session,
    uiState,
    filteredEvents,
    years,
    api,
    onUiStateChange: handleUiStateChange,
    onLogout: logout,
    detailLinks,
    pageNotice,
    rightRail,
  }), [session, uiState, filteredEvents, years, api, handleUiStateChange, logout, detailLinks, pageNotice]);

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/timeline" replace />} />

      <Route
        path="/timeline"
        element={
          <ProtectedRoute>
            <TimelinePage
              Layout={AppLayout}
              {...makeLayoutProps()}
            />
          </ProtectedRoute>
        }
      />

      <Route
        path="/space"
        element={
          <ProtectedRoute>
            <SpacePage
              Layout={AppLayout}
              {...makeLayoutProps()}
            />
          </ProtectedRoute>
        }
      />

      <Route
        path="/people"
        element={
          <ProtectedRoute>
            <PeoplePage
              Layout={AppLayout}
              {...makeLayoutProps()}
            />
          </ProtectedRoute>
        }
      />

      <Route
        path="/memoir"
        element={
          <ProtectedRoute>
            <MemoirPage
              Layout={AppLayout}
              {...makeLayoutProps()}
            />
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
            <EventPage
              Layout={AppLayout}
              {...makeLayoutProps()}
            />
          </ProtectedRoute>
        }
      />

      <Route
        path="/places/:placeId"
        element={
          <ProtectedRoute>
            <PlacePage
              Layout={AppLayout}
              {...makeLayoutProps()}
            />
          </ProtectedRoute>
        }
      />

      <Route
        path="/people/:personId/detail"
        element={
          <ProtectedRoute>
            <PersonPage
              Layout={AppLayout}
              {...makeLayoutProps()}
            />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  const { user, isAuthenticated } = useAuth();
  const { mutate: login } = useLogin();

  const handleLogin = useCallback((email, password) => {
    login({ email, password });
  }, [login]);

  return (
    <BrowserRouter>
      <Routes>
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
          path="/*"
          element={
            isAuthenticated ? (
              <AppContent user={user} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
