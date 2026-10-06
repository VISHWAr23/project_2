let cachedServer: any = null;

export default async function handler(req: any, res: any) {
  if (!cachedServer) {
    try {
      const dns = await import('node:dns');
      dns.setServers(['8.8.8.8', '1.1.1.1']);
    } catch {
      // Ignore DNS error
    }

    const { NestFactory } = await import('@nestjs/core');
    const { ValidationPipe } = await import('@nestjs/common');
    const { ExpressAdapter } = await import('@nestjs/platform-express');
    const expressModule: any = await import('express');
    const express = expressModule.default || expressModule;

    let AppModule: any;
    let AllExceptionsFilter: any;
    let TransformInterceptor: any;

    try {
      ({ AppModule } = await import('../dist/app.module.js'));
      ({ AllExceptionsFilter } = await import('../dist/common/filters/all-exceptions.filter.js'));
      ({ TransformInterceptor } = await import('../dist/common/interceptors/transform.interceptor.js'));
    } catch {
      ({ AppModule } = await import('../src/app.module.js'));
      ({ AllExceptionsFilter } = await import('../src/common/filters/all-exceptions.filter.js'));
      ({ TransformInterceptor } = await import('../src/common/interceptors/transform.interceptor.js'));
    }

    const expressApp = typeof express === 'function' ? express() : express();

    const app = await NestFactory.create(
      AppModule,
      new ExpressAdapter(expressApp),
    );

    const corsOrigin = process.env.CORS_ORIGIN || '*';
    const allowedOrigins = corsOrigin.split(',').map((o: string) => o.trim());

    app.enableCors({
      origin: (
        origin: string | undefined,
        callback: (err: Error | null, allow?: boolean) => void,
      ) => {
        if (!origin || corsOrigin === '*' || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(null, true);
        }
      },
      credentials: true,
    });

    app.setGlobalPrefix('api');

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    if (AllExceptionsFilter) {
      app.useGlobalFilters(new AllExceptionsFilter());
    }
    if (TransformInterceptor) {
      app.useGlobalInterceptors(new TransformInterceptor());
    }

    await app.init();
    cachedServer = expressApp;
  }

  return cachedServer(req, res);
}
