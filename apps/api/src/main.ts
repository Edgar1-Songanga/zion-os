import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api");

  const configuredOrigins = (process.env.ZION_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (process.env.NODE_ENV === "production" && configuredOrigins.length === 0) {
    throw new Error("ZION_ALLOWED_ORIGINS must be configured in production");
  }

  app.enableCors({
    origin: configuredOrigins.length ? configuredOrigins : true,
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
