/**
 * Script to backfill message text from attributedBody for existing messages
 *
 * Run with: npx ts-node src/scripts/backfillMessageText.ts
 */

import { PrismaClient } from '@prisma/client';
import Database from 'better-sqlite3';
import path from 'path';
import { extractTextFromAttributedBody } from '../utils/attributedBodyParser';

const prisma = new PrismaClient();

const databasePath = process.env.IMESSAGE_DB_PATH || path.join(process.cwd(), 'chat.db');
console.log('[backfill] Using iMessage database at:', databasePath);

async function backfillMessageText() {
  const db = new Database(databasePath, { readonly: true });

  try {
    // Find all messages with empty or null text
    const emptyMessages = await prisma.message.findMany({
      where: {
        OR: [
          { text: null },
          { text: '' }
        ]
      }
    });

    console.log(`[backfill] Found ${emptyMessages.length} messages with empty text`);

    let updated = 0;
    let skipped = 0;

    for (const msg of emptyMessages) {
      try {
        // Query iMessage database for this message using ROWID
        const row = db.prepare(`
          SELECT text, attributedBody
          FROM message
          WHERE ROWID = ?
        `).get(msg.imessageId) as { text: string | null, attributedBody: Buffer | null } | undefined;

        if (!row) {
          console.log(`[backfill] Message ${msg.imessageId} not found in iMessage DB`);
          skipped++;
          continue;
        }

        let newText: string | null = null;

        // First try the text field
        if (row.text && row.text.trim().length > 0) {
          newText = row.text.trim();
        }
        // If text is empty, try to extract from attributedBody
        else if (row.attributedBody) {
          newText = extractTextFromAttributedBody(row.attributedBody);
        }

        // Update if we found text
        if (newText && newText.trim().length > 0) {
          await prisma.message.update({
            where: { id: msg.id },
            data: { text: newText }
          });
          updated++;
          console.log(`[backfill] Updated message ${msg.id}: "${newText.substring(0, 50)}..."`);
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(`[backfill] Error processing message ${msg.id}:`, error);
        skipped++;
      }
    }

    console.log(`[backfill] Completed: ${updated} updated, ${skipped} skipped`);
  } catch (error) {
    console.error('[backfill] Error:', error);
  } finally {
    db.close();
    await prisma.$disconnect();
  }
}

backfillMessageText().catch(console.error);
