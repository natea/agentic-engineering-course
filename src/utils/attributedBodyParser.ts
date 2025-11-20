/**
 * Utility to extract plain text from iMessage attributedBody BLOB field
 *
 * The attributedBody field contains a binary plist (NSKeyedArchiver/NSAttributedString) that stores
 * the actual message text in modern iMessage databases.
 */

export function extractTextFromAttributedBody(blob: Buffer | null): string | null {
  if (!blob || blob.length === 0) {
    return null;
  }

  try {
    // The attributedBody is an NSKeyedArchiver format containing an NSAttributedString
    // Pattern: ...NSString\x01\x94\x84\x01+{LENGTH}{TEXT}...
    // where LENGTH is a single byte and TEXT is the actual message

    // Look for NSString marker followed by the text content
    const nsStringIndex = blob.indexOf('NSString');
    if (nsStringIndex === -1) {
      return null;
    }

    // After NSString, we typically have: \x01\x94\x84\x01+{LENGTH_BYTE}{TEXT}
    // Skip forward to find the pattern \x01+
    let searchStart = nsStringIndex + 8; // Skip "NSString"
    const pattern = Buffer.from([0x01, 0x2B]); // \x01+

    for (let i = searchStart; i < Math.min(searchStart + 20, blob.length - 1); i++) {
      if (blob[i] === 0x01 && blob[i + 1] === 0x2B) {
        // Found the pattern! Next byte is the length
        const lengthByte = blob[i + 2];
        if (lengthByte > 0 && lengthByte < 200 && i + 3 + lengthByte <= blob.length) {
          const textBytes = blob.slice(i + 3, i + 3 + lengthByte);
          const text = textBytes.toString('utf8');

          // Verify it's mostly printable characters
          const printableRatio = text.split('').filter(c => {
            const code = c.charCodeAt(0);
            return (code >= 32 && code <= 126) || code >= 128;
          }).length / text.length;

          if (printableRatio > 0.8) {
            return text.trim();
          }
        }
      }
    }

    // Fallback: Look for continuous readable text after NSString
    const afterNSString = blob.slice(nsStringIndex + 8);
    const text = afterNSString.toString('utf8');

    // Find the first substantial chunk of printable text
    const chunks = text.split(/[\x00-\x1F]+/).filter(chunk => {
      if (chunk.length < 3) return false;

      const printable = chunk.split('').filter(c => {
        const code = c.charCodeAt(0);
        return (code >= 32 && code <= 126) || code >= 128;
      }).length;

      return printable / chunk.length > 0.8;
    });

    if (chunks.length > 0) {
      // Return the first chunk that doesn't look like a class name or metadata
      for (const chunk of chunks) {
        // Skip chunks that are clearly metadata
        if (chunk.match(/^(NS|IM|__k|streamtyped|iI)/)) {
          continue;
        }

        // Skip chunks with too many special characters (likely binary data)
        const specialCharRatio = chunk.split('').filter(c => {
          const code = c.charCodeAt(0);
          return code < 32 || (code > 126 && code < 160);
        }).length / chunk.length;

        if (specialCharRatio > 0.1) {
          continue;
        }

        // This looks like actual text content
        return chunk.trim();
      }
    }

    return null;
  } catch (error) {
    console.error('[attributedBodyParser] Error parsing attributed body:', error);
    return null;
  }
}
