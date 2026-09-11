import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { createApp } from './bootstrap';
import { AppConfigService } from './config/app-config.service';

async function main(): Promise<void> {
  const app = await createApp();
  const config = app.get(AppConfigService);

  await app.listen(config.port, '0.0.0.0');

  const logger = new Logger('Bootstrap');
  logger.log(`Jan Setu API listening on :${config.port} (${config.nodeEnv})`);
  logger.log(`Docs at ${config.publicApiUrl}/api/docs`);
}

main().catch((error) => {
  new Logger('Bootstrap').error(
    `Fatal: failed to start — ${error instanceof Error ? error.message : String(error)}`,
    error instanceof Error ? error.stack : undefined,
  );
  process.exit(1);
});
