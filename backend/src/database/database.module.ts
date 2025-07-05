import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        // Use SQLite for development if PostgreSQL is not available
        const useSQLite =
          process.env.NODE_ENV === 'development' && !process.env.DATABASE_HOST;

        if (useSQLite) {
          return {
            type: 'sqlite',
            database: 'database.sqlite',
            entities: [__dirname + '/../**/*.entity{.ts,.js}'],
            synchronize: true,
            logging: true,
            autoLoadEntities: true,
          };
        }

        return {
          type: 'postgres',
          host: configService.get('database.host'),
          port: configService.get('database.port'),
          username: configService.get('database.username'),
          password: configService.get('database.password'),
          database: configService.get('database.database'),
          entities: [__dirname + '/../**/*.entity{.ts,.js}'],
          synchronize: process.env.NODE_ENV !== 'production',
          logging: process.env.NODE_ENV !== 'production',
          autoLoadEntities: true,
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
