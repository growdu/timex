import { AllExceptionsFilter } from './all-exceptions.filter';
import { HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { Request, Response } from 'express';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockResponse: Partial<Response>;
  let mockRequest: Partial<Request>;
  let host: any;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
      on: jest.fn(),
    };
    mockRequest = {
      method: 'GET',
      url: '/api/test',
    };
    host = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    };
  });

  it('formats HttpException with statusCode, message, error, path, timestamp', () => {
    const exception = new NotFoundException('event not found');
    filter.catch(exception, host);

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    const body = (mockResponse.json as jest.Mock).mock.calls[0][0];
    expect(body.statusCode).toBe(404);
    expect(body.message).toBe('event not found');
    expect(body.error).toBe('Not Found');
    expect(body.path).toBe('/api/test');
    expect(body.timestamp).toBeDefined();
  });

  it('handles BadRequestException with array messages', () => {
    const exception = new HttpException(
      {
        message: ['field1 is required', 'field2 must be a string'],
        error: 'Bad Request',
      },
      HttpStatus.BAD_REQUEST,
    );
    filter.catch(exception, host);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    const body = (mockResponse.json as jest.Mock).mock.calls[0][0];
    expect(body.statusCode).toBe(400);
    expect(body.message).toEqual([
      'field1 is required',
      'field2 must be a string',
    ]);
    expect(body.error).toBe('Bad Request');
  });

  it('returns 500 with generic message for uncaught exceptions (no leak)', () => {
    const exception = new Error('database connection failed: password=hunter2');
    filter.catch(exception, host);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    const body = (mockResponse.json as jest.Mock).mock.calls[0][0];
    expect(body.statusCode).toBe(500);
    expect(body.message).toBe('Internal server error');
    expect(body.message).not.toContain('hunter2');
    expect(body.error).toBe('Internal Server Error');
  });

  it('handles non-Error thrown values', () => {
    filter.catch('something weird', host);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    const body = (mockResponse.json as jest.Mock).mock.calls[0][0];
    expect(body.message).toBe('Internal server error');
  });
});
