import { http, HttpResponse } from 'msw';

const mockUser = {
  id: 'user-1',
  email: 'demo@timex.com',
  nickname: '时光记录者',
  avatarUrl: null,
  isTrialActive: true,
  trialExpiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  createdAt: new Date().toISOString(),
};

const mockLicense = {
  id: 'license-1',
  planType: 'trial',
  deviceLimit: 1,
  expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  status: 'active',
};

export const authHandlers = [
  http.post('/api/auth/register', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      user: { ...mockUser, email: body.email, nickname: body.nickname },
      tokens: {
        accessToken: 'mock-access-token-' + Date.now(),
        refreshToken: 'mock-refresh-token-' + Date.now(),
      },
    });
  }),

  http.post('/api/auth/login', async ({ request }) => {
    const body = await request.json();
    if (body.email && body.password) {
      return HttpResponse.json({
        user: { ...mockUser, email: body.email },
        tokens: {
          accessToken: 'mock-access-token-' + Date.now(),
          refreshToken: 'mock-refresh-token-' + Date.now(),
        },
      });
    }
    return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }),

  http.post('/api/auth/refresh', async ({ request }) => {
    return HttpResponse.json({
      accessToken: 'mock-access-token-' + Date.now(),
      refreshToken: 'mock-refresh-token-' + Date.now(),
    });
  }),

  http.get('/api/auth/me', () => {
    return HttpResponse.json(mockUser);
  }),
];

export const licenseHandlers = [
  http.post('/api/license/activate', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      licenseToken: 'mock-license-token-' + Date.now(),
      license: { ...mockLicense, licenseKey: body.licenseKey },
      device: {
        id: 'device-1',
        deviceName: body.deviceName || 'Unknown Device',
        lastActiveAt: new Date().toISOString(),
      },
    });
  }),

  http.get('/api/license/status', () => {
    return HttpResponse.json({
      activeLicense: mockLicense,
      devices: [
        {
          id: 'device-1',
          deviceName: 'Chrome Browser',
          lastActiveAt: new Date().toISOString(),
        },
      ],
      isInTrial: true,
      trialExpiresAt: mockLicense.expiresAt,
    });
  }),

  http.get('/api/license/devices', () => {
    return HttpResponse.json([
      {
        id: 'device-1',
        deviceName: 'Chrome Browser',
        lastActiveAt: new Date().toISOString(),
        licenseId: 'license-1',
      },
    ]);
  }),

  http.delete('/api/license/devices/:id', () => {
    return HttpResponse.json({ success: true });
  }),

  http.post('/api/license/verify', () => {
    return HttpResponse.json({
      licenseId: mockLicense.id,
      planType: mockLicense.planType,
    });
  }),
];
