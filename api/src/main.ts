import { NestFactory } from '@nestjs/core';
import {
  BadRequestException,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      // Emit a structured field->message map so the client can attach errors to
      // form fields directly, instead of parsing prose out of the message array.
      exceptionFactory: (errors: ValidationError[]) => {
        const fieldErrors: Record<string, string> = {};
        const messages: string[] = [];
        for (const err of errors) {
          const constraints = Object.values(err.constraints ?? {});
          if (constraints.length > 0) {
            fieldErrors[err.property] = constraints[0];
            messages.push(...constraints);
          }
        }
        return new BadRequestException({
          error: 'Bad Request',
          message: messages,
          fieldErrors,
        });
      },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  const port = Number(process.env.PORT) || 4000;
  await app.listen(port);
}

bootstrap();
