import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequencesService } from '../sequences/sequences.service';
import { Sequence } from '../sequences/entities/sequence.entity';
import { DataSource } from 'typeorm';

async function verifyConcurrency() {
    const moduleRef = await Test.createTestingModule({
        imports: [
            ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: '.env',
            }),
            TypeOrmModule.forRootAsync({
                imports: [ConfigModule],
                useFactory: (configService: ConfigService) => ({
                    type: 'postgres',
                    host: configService.get<string>('DATABASE_HOST'),
                    port: configService.get<number>('DATABASE_PORT'),
                    username: configService.get<string>('DATABASE_USER'),
                    password: configService.get<string>('DATABASE_PASSWORD'),
                    database: configService.get<string>('DATABASE_NAME'),
                    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
                    synchronize: false,
                }),
                inject: [ConfigService],
            }),
            TypeOrmModule.forFeature([Sequence])
        ],
        providers: [SequencesService]
    }).compile();

    const app = moduleRef.createNestApplication();
    await app.init();

    const sequencesService = app.get(SequencesService);
    const dataSource = app.get(DataSource);

    try {
        console.log('🧪 Starting Verification: Sequence Concurrency');

        const TEST_KEY = 'TEST-SEQ-CONCURRENCY-' + Date.now();
        const NUM_REQUESTS = 50; // Simulate 50 concurrent requests

        console.log(`🚀 Launching ${NUM_REQUESTS} concurrent requests for key: ${TEST_KEY}`);

        // Launch parallel promises
        const promises: Promise<number>[] = [];
        for (let i = 0; i < NUM_REQUESTS; i++) {
            promises.push(sequencesService.getNextValue(TEST_KEY));
        }

        const results = await Promise.all(promises);

        // Sort results
        results.sort((a, b) => a - b);

        // Validation
        console.log(`✅ Received ${results.length} results.`);
        console.log(`📊 Min: ${results[0]}, Max: ${results[results.length - 1]}`);

        // Check for duplicates
        const unique = new Set(results);
        if (unique.size !== results.length) {
            throw new Error(`❌ Duplicate values detected! Expected ${results.length}, got ${unique.size}`);
        }

        // Check for gaps (assuming start from 1)
        // If initial run, first value is 1. If repeated, it increments.
        // We expect a contagious range if all succeeded.
        // Since we created a unique key, it should start at 1.

        if (results[0] !== 1) {
            throw new Error(`❌ Sequence did not start at 1 (got ${results[0]})`);
        }

        if (results[results.length - 1] !== NUM_REQUESTS) {
            throw new Error(`❌ Sequence end mismatch. Expected ${NUM_REQUESTS}, got ${results[results.length - 1]}`);
        }

        // Check gaps
        for (let i = 0; i < results.length; i++) {
            if (results[i] !== i + 1) {
                throw new Error(`❌ Gap detected! Expected ${i + 1}, got ${results[i]}`);
            }
        }

        console.log('✅ Concurrency Test Passed: No duplicates, no gaps.');

        // Cleanup
        await dataSource.query(`DELETE FROM sequences WHERE key = '${TEST_KEY}'`);

    } catch (error) {
        console.error('❌ Verification Failed:', error);
    } finally {
        await app.close();
    }
}

verifyConcurrency();
