import { createZionApplication } from './app.factory';

async function bootstrap() {
  const app = await createZionApplication();
  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
