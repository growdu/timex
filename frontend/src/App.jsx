import { useCallback, useEffect, useMemo, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout.jsx";
import EventPage from "./pages/EventPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import MemoirPage from "./pages/MemoirPage.jsx";
import PeoplePage from "./pages/PeoplePage.jsx";
import PersonPage from "./pages/PersonPage.jsx";
import PlacePage from "./pages/PlacePage.jsx";
import SpacePage from "./pages/SpacePage.jsx";
import TimelinePage from "./pages/TimelinePage.jsx";
import { createApi, defaultUiState, filterEvents, timexData } from "./mock/timexData";

const SESSION_STORAGE_KEY = "timexFrontendSession";
const UI_STATE_STORAGE_KEY = "timexFrontendUiState";
const api = createApi(timexData);

function readStorage(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function ProtectedRoute({ session, children }) {
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function createSharedProps({ session, uiState, filteredEvents, setUiState, logout }) {
  const selectedEvent =
    filteredEvents.find((item) => item.id === uiState.selectedEventId) ||
    api.getEvent(uiState.selectedEventId) ||
    filteredEvents[0] ||
    timexData.events[0];
  const selectedPlace = api.getPlace(uiState.selectedPlaceId) || api.getPlace(selectedEvent.placeId);
  const selectedPerson =
    api.getPerson(uiState.selectedPersonId) || api.getPerson(selectedEvent.people[0]);

  return {
    session,
    uiState,
    filteredEvents,
    setUiState,
    logout,
    api,
    data: timexData,
    selectedEvent,
    selectedPlace,
    selectedPerson,
    Layout: AppLayout,
  };
}

export default function App() {
  const [session, setSession] = useState(() => readStorage(SESSION_STORAGE_KEY, null));
  const [uiState, setUiStateState] = useState(() => ({
    ...defaultUiState,
    ...readStorage(UI_STATE_STORAGE_KEY, {}),
  }));

  useEffect(() => {
    if (session) {
      writeStorage(SESSION_STORAGE_KEY, session);
    } else {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, [session]);

  useEffect(() => {
    writeStorage(UI_STATE_STORAGE_KEY, uiState);
  }, [uiState]);

  const filteredEvents = useMemo(() => filterEvents(timexData.events, api, uiState), [uiState]);

  const setUiState = useCallback((patch) => {
    setUiStateState((current) => ({ ...current, ...patch }));
  }, []);

  const login = useCallback((account) => {
    setSession({
      id: account.id,
      name: account.name,
      role: account.role,
      email: account.email,
      tone: account.tone,
      loginAt: new Date().toISOString(),
    });
    setUiStateState(defaultUiState);
  }, []);

  const logout = useCallback(() => {
    setSession(null);
  }, []);

  const sharedProps = createSharedProps({
    session,
    uiState,
    filteredEvents,
    setUiState,
    logout,
  });

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to={session ? "/timeline" : "/login"} replace />} />
        <Route
          path="/login"
          element={
            session ? (
              <Navigate to="/timeline" replace />
            ) : (
              <LoginPage accounts={timexData.accounts} onLogin={login} />
            )
          }
        />
        <Route
          path="/timeline"
          element={
            <ProtectedRoute session={session}>
              <TimelinePage {...sharedProps} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/space"
          element={
            <ProtectedRoute session={session}>
              <SpacePage {...sharedProps} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/people"
          element={
            <ProtectedRoute session={session}>
              <PeoplePage {...sharedProps} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/memoir"
          element={
            <ProtectedRoute session={session}>
              <MemoirPage {...sharedProps} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/events/:eventId"
          element={
            <ProtectedRoute session={session}>
              <EventPage {...sharedProps} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/places/:placeId"
          element={
            <ProtectedRoute session={session}>
              <PlacePage {...sharedProps} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/people/:personId/detail"
          element={
            <ProtectedRoute session={session}>
              <PersonPage {...sharedProps} />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
