import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cors from 'cors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Configuração do CORS
  app.use(cors({
    origin: '*',
    methods: 'GET, HEAD, PUT, PATCH, POST, DELETE',
    credentials: true,
  }))

  await app.listen(3000);
}
bootstrap();
