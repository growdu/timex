import { useCallback, useMemo } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "./components/AppLayout.jsx";
import EventPage from "./pages/EventPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import LicensePage from "./pages/LicensePage.jsx";
import MemoirPage from "./pages/MemoirPage.jsx";
import PeoplePage from "./pages/PeoplePage.jsx";
import PersonPage from "./pages/PersonPage.jsx";
import PlacePage from "./pages/PlacePage.jsx";
import SpacePage from "./pages/SpacePage.jsx";
import TimelinePage from "./pages/TimelinePage.jsx";
import LinesPage from "./pages/LinesPage.jsx";
import { authApi } from "./api/auth";
import { eventsApi } from "./api/events";
import { peopleApi } from "./api/people";
import { placesApi } from "./api/places";
import { memoirsApi } from "./api/memoirs";
import { useUIStore } from "./store";
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
function AppContent({ user, onLogin }) {
  const logout = useLogout();
  const uiState = useUIStore();

  // Fetch all data
  const { data: eventsData } = useEvents();
  const { data: peopleData } = usePeople();
  const { data: placesData } = usePlaces();
  const { data: memoirsData } = useMemoirs();

  const events = useMemo(() => eventsData?.events || [], [eventsData]);
  const people = useMemo(() => peopleData?.people || [], [peopleData]);
  const places = useMemo(() => placesData?.places || [], [placesData]);
  const memoirs = useMemo(() => memoirsData?.memoirs || [], [memoirsData]);

  // Create API adapter with real data
  const api = useMemo(
    () => createApiAdapter({ events, people, places, memoirs }),
    [events, people, places, memoirs]
  );

  // Get years from events
  const years = useMemo(() => api.getYears(events), [events, api]);

  // Filter events based on uiState
  const baseFilteredEvents = useMemo(
    () => api.filterEvents(events, uiState),
    [events, uiState, api]
  );

  // 6 条线维度再过滤：line != all 时只保留该线下事件
  const filteredEvents = useMemo(() => {
    if (!uiState?.line || uiState.line === "all") return baseFilteredEvents;
    return api.getEventsByLine(uiState.line, baseFilteredEvents);
  }, [baseFilteredEvents, uiState?.line, api]);

  // Get selected event
  const selectedEvent = useMemo(
    () => api.getSelectedEvent(uiState.selectedEventId, filteredEvents.length ? filteredEvents : events),
    [uiState.selectedEventId, filteredEvents, events, api]
  );

  // Get selected place
  const selectedPlace = useMemo(() => {
    if (uiState.selectedPlaceId) {
      return api.getPlace(uiState.selectedPlaceId);
    }
    if (selectedEvent?.placeId) {
      return api.getPlace(selectedEvent.placeId);
    }
    return places[0];
  }, [uiState.selectedPlaceId, selectedEvent, api, places]);

  // Get selected person
  const selectedPerson = useMemo(() => {
    if (uiState.selectedPersonId) {
      return api.getPerson(uiState.selectedPersonId);
    }
    if (selectedEvent) {
      const personIds = api.getEventPeopleIds(selectedEvent);
      if (personIds.length > 0) {
        return api.getPerson(personIds[0]);
      }
    }
    return people[0];
  }, [uiState.selectedPersonId, selectedEvent, api, people]);

  // Session info from user or default
  const session = useMemo(() => ({
    name: user?.nickname || user?.email?.split('@')[0] || '用户',
    role: '时光机器用户',
    tone: 'navy',
  }), [user]);

  // Detail links
  const detailLinks = useMemo(() => ({
    event: selectedEvent ? `/events/${selectedEvent.id}` : '/timeline',
    place: selectedPlace ? `/places/${selectedPlace.id}` : '/space',
    person: selectedPerson ? `/people/${selectedPerson.id}/detail` : '/people',
  }), [selectedEvent, selectedPlace, selectedPerson]);

  // Page notice
  const pageNotice = "数据来自真实 API，使用筛选器探索记忆";

  const handleUiStateChange = useCallback((updates) => {
    useUIStore.setState(updates);
  }, []);

  // Layout props builder
  const makeLayoutProps = useCallback((rightRail = null) => ({
    session,
    uiState,
    filteredEvents,
    years,
    api,
    data: { events, people, places, memoirs },
    selectedEvent,
    selectedPlace,
    selectedPerson,
    onUiStateChange: handleUiStateChange,
    setUiState: handleUiStateChange,
    setSelectedEvent: (id) => handleUiStateChange({ selectedEventId: id }),
    setSelectedPlace: (id) => handleUiStateChange({ selectedPlaceId: id }),
    setSelectedPerson: (id) => handleUiStateChange({ selectedPersonId: id }),
    onLogout: logout,
    logout: logout,
    detailLinks,
    pageNotice,
    rightRail,
  }), [session, uiState, filteredEvents, years, api, events, people, places, memoirs, selectedEvent, selectedPlace, selectedPerson, handleUiStateChange, logout, detailLinks, pageNotice]);

  return (
    <AppShell user={user} onLogin={onLogin}>
      <Routes>
        <Route path="/" element={<Navigate to="/timeline" replace />} />

        <Route
          path="/login"
          element={<Navigate to="/timeline" replace />}
        />

        <Route
          path="/register"
          element={<Navigate to="/timeline" replace />}
        />

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
          path="/lines"
          element={
            <ProtectedRoute>
              <LinesPage
                Layout={AppLayout}
                {...makeLayoutProps()}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/lines/:lineId"
          element={
            <ProtectedRoute>
              <LinesPage
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
    </AppShell>
  );
}

function AppShell({ user, onLogin, children }) {
  const location = useLocation();
  if (!user) {
    if (location.pathname === '/register') {
      return <RegisterPage onLogin={onLogin} />;
    }
    if (location.pathname !== '/login') {
      return <Navigate to="/login" replace />;
    }
    return <LoginPage onLogin={onLogin} />;
  }
  return children;
}

export default function App() {
  const { user, isLoading } = useAuth();
  const { mutate: login } = useLogin();

  const handleLogin = useCallback((email, password) => {
    login({ email, password });
  }, [login]);

  if (isLoading) {
    return <div className="loading-screen">加载中...</div>;
  }

  return (
    <BrowserRouter>
      <AppContent user={user} onLogin={handleLogin} />
    </BrowserRouter>
  );
}
