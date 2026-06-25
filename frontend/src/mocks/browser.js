import { setupWorker } from 'msw/browser';
import { authHandlers, licenseHandlers } from './handlers/auth';
import { eventsHandlers, peopleHandlers, placesHandlers, momentsHandlers, memoirsHandlers } from './handlers/content';

const handlers = [
  ...authHandlers,
  ...licenseHandlers,
  ...eventsHandlers,
  ...peopleHandlers,
  ...placesHandlers,
  ...momentsHandlers,
  ...memoirsHandlers,
];

export const worker = setupWorker(...handlers);
