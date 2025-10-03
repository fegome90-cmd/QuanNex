import fs from 'fs';
import crypto from 'crypto';
import path from 'path';

function calculateChecksum(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return crypto.createHash('sha256').update(content).digest('hex');
}

function main() {
  const configDir = path.join(process.cwd(), 'config');
  const checksumFile = path.join(configDir, '.checksum');

  const configFiles = ['profiles.yaml', 'playbooks.yaml'];
  const currentChecksums = {};

  // Calculate current checksums
  for (const file of configFiles) {
    const filePath = path.join(configDir, file);
    if (fs.existsSync(filePath)) {
      currentChecksums[file] = calculateChecksum(filePath);
    }
  }

  // Read stored checksums
  let storedChecksums = {};
  if (fs.existsSync(checksumFile)) {
    try {
      storedChecksums = JSON.parse(fs.readFileSync(checksumFile, 'utf8'));
    } catch (e) {
      console.log('[CONFIG-CHECKSUM] No checksum file found, creating new one');
    }
  }

  // Check for changes
  const changes = [];
  for (const [file, currentChecksum] of Object.entries(currentChecksums)) {
    if (storedChecksums[file] && storedChecksums[file] !== currentChecksum) {
      changes.push(file);
    }
  }

  if (changes.length > 0) {
    console.log(`[CONFIG-CHECKSUM] Config files changed: ${changes.join(', ')}`);
    console.log('[CONFIG-CHECKSUM] Updating checksum file...');

    // Update checksum file
    fs.writeFileSync(checksumFile, JSON.stringify(currentChecksums, null, 2));
    console.log('[CONFIG-CHECKSUM] Checksum updated successfully');
  } else {
    console.log('[CONFIG-CHECKSUM] No config changes detected');
  }

  console.log('[CONFIG-CHECKSUM] OK');
}

main();
