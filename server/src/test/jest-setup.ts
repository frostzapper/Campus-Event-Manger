import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Enable raw bearer IDs for integration tests so existing test helpers
// (e.g. 'Bearer student-test') continue to work without real JWTs.
// This flag is only honoured when NODE_ENV === 'test'; the server
// refuses to start if it is set in any other environment.
process.env.AUTH_RAW_BEARER_IDS = 'true';
