const axios = require('axios');
const logger = require('../utils/logger');

const HMS_BASE = 'https://api.100ms.live/v2';

/**
 * Get a short-lived management token for 100ms API calls
 * Uses app_access_key + app_secret from env
 */
function getManagementToken() {
  const { SignJWT } = require('jose');
  const accessKey = process.env.HMS_ACCESS_KEY;
  const secret = process.env.HMS_APP_SECRET;

  if (!accessKey || !secret) {
    throw new Error('HMS_ACCESS_KEY and HMS_APP_SECRET must be set in .env');
  }

  const secretKey = new TextEncoder().encode(secret);

  return new SignJWT({
    access_key: accessKey,
    type: 'management',
    version: 2,
    iat: Math.floor(Date.now() / 1000),
    nbf: Math.floor(Date.now() / 1000)
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .sign(secretKey);
}

/**
 * Create a new 100ms room for an AI interview
 */
async function createRoom(interviewId, templateId) {
  try {
    const token = await getManagementToken();
    const tid = templateId || process.env.HMS_TEMPLATE_ID;

    const { data } = await axios.post(
      `${HMS_BASE}/rooms`,
      {
        name: `ai-interview-${interviewId}`,
        description: `AI Video Interview Room – ${interviewId}`,
        template_id: tid
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return { roomId: data.id, roomName: data.name };
  } catch (err) {
    logger.error(`[roomService] createRoom error: ${err.message}`);
    throw new Error('Failed to create video room');
  }
}

/**
 * Generate a room code (join link code) for a given role
 * role: 'guest' = candidate | 'host' = recruiter
 */
async function createRoomCode(roomId, role = 'guest') {
  try {
    const token = await getManagementToken();

    const { data } = await axios.post(
      `${HMS_BASE}/room-codes/room/${roomId}/role/${role}`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return data.code;
  } catch (err) {
    logger.error(`[roomService] createRoomCode error: ${err.message}`);
    throw new Error('Failed to generate room code');
  }
}

/**
 * Enable / disable a room
 */
async function setRoomEnabled(roomId, enabled) {
  try {
    const token = await getManagementToken();

    await axios.post(
      `${HMS_BASE}/rooms/${roomId}`,
      { enabled },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (err) {
    logger.warn(`[roomService] setRoomEnabled error: ${err.message}`);
  }
}

/**
 * Convenience: provision a full room + both role codes
 */
async function provisionRoom(interviewId) {
  const { roomId } = await createRoom(interviewId);
  const [candidateCode, hostCode] = await Promise.all([
    createRoomCode(roomId, 'guest'),
    createRoomCode(roomId, 'host')
  ]);
  return { roomId, candidateCode, hostCode };
}

module.exports = { createRoom, createRoomCode, setRoomEnabled, provisionRoom };
