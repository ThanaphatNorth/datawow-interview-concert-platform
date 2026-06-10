import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

/**
 * The filter normalises every thrown error into a uniform JSON envelope:
 * { statusCode, error, message, path, timestamp, [fieldErrors] }.
 */
describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let json: jest.Mock;
  let status: jest.Mock;

  function hostFor(url = '/some/path') {
    json = jest.fn();
    status = jest.fn().mockReturnValue({ json });
    return {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ url }),
      }),
    } as any;
  }

  beforeEach(() => {
    filter = new HttpExceptionFilter();
  });

  it('maps a string-bodied HttpException to its status and message', () => {
    filter.catch(new ForbiddenException('nope'), hostFor('/admin'));

    expect(status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    const body = json.mock.calls[0][0];
    expect(body).toMatchObject({
      statusCode: HttpStatus.FORBIDDEN,
      error: 'Forbidden',
      message: 'nope',
      path: '/admin',
    });
    expect(typeof body.timestamp).toBe('string');
    expect(body.fieldErrors).toBeUndefined();
  });

  it('passes through an object body with a string[] message (validation list)', () => {
    const exception = new BadRequestException({
      statusCode: 400,
      error: 'Bad Request',
      message: ['name should not be empty', 'totalSeats must be positive'],
    });

    filter.catch(exception, hostFor());

    const body = json.mock.calls[0][0];
    expect(body.statusCode).toBe(400);
    expect(body.error).toBe('Bad Request');
    expect(body.message).toEqual([
      'name should not be empty',
      'totalSeats must be positive',
    ]);
  });

  it('surfaces structured fieldErrors when present on the body', () => {
    const exception = new BadRequestException({
      message: 'Validation failed',
      fieldErrors: { name: 'Name is required' },
    });

    filter.catch(exception, hostFor());

    const body = json.mock.calls[0][0];
    expect(body.fieldErrors).toEqual({ name: 'Name is required' });
  });

  it('derives the error label from the exception name when not supplied', () => {
    // A bare HttpException whose object body omits `error`.
    const exception = new HttpException({ message: 'teapot' }, HttpStatus.I_AM_A_TEAPOT);

    filter.catch(exception, hostFor());

    const body = json.mock.calls[0][0];
    expect(body.statusCode).toBe(HttpStatus.I_AM_A_TEAPOT);
    // HttpException -> 'Http' after stripping the trailing "Exception".
    expect(body.error).toBe('Http');
    expect(body.message).toBe('teapot');
  });

  it('maps an unknown (non-HttpException) error to 500 and logs it', () => {
    const logSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    filter.catch(new Error('boom'), hostFor('/oops'));

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    const body = json.mock.calls[0][0];
    expect(body).toMatchObject({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'Internal server error',
      path: '/oops',
    });
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });
});
